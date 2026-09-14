// T5+T4 E2E: spawns the real ai service (T4 route) + boots the api app in-process,
// creates + approves a startup, then asserts GET /org/suggest returns 200 with 6 roles.
// Env: DATABASE_URL must point at Postgres (e.g. localhost:5434).
// Run: npx tsx services/api/scripts/verify-t5-suggest200-e2e.ts
import { spawn, execSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { prisma } from "../src/lib/prisma";

const failures: string[] = [];
function check(name: string, passed: boolean, extra = "") {
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${extra ? " — " + extra : ""}`);
  if (!passed) failures.push(name);
}

// Load only the two non-secret-shaped vars the ai service needs (never printed).
const aiEnv: Record<string, string> = {};
try {
  const text = fs.readFileSync("services/ai/.env", "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
    if (m && (m[1] === "GROQ_API_KEY" || m[1] === "AI_MODEL")) aiEnv[m[1]] = m[2];
  }
} catch {
  // fall through — ai will 500 and the 200 assertion will report it
}

const AI_PORT = 3102;
const API_PORT = 3103;
let ai: ChildProcess | null = null;
try {
  ai = spawn("npx", ["tsx", "services/ai/src/index.ts"], {
    shell: true,
    env: {
      ...process.env,
      PORT: String(AI_PORT),
      GROQ_API_KEY: aiEnv.GROQ_API_KEY ?? process.env.GROQ_API_KEY ?? "",
      // E2E override only: the plan default (llama-3.3-70b-versatile) is
      // decommissioned on Groq, so verification runs against a live model.
      AI_MODEL:
        process.env.E2E_AI_MODEL ??
        aiEnv.AI_MODEL ??
        process.env.AI_MODEL ??
        "llama-3.3-70b-versatile",
    },
    stdio: "pipe",
  });
  ai.stderr?.on("data", (d) => process.stderr.write(`[ai] ${d}`));
  ai.stdout?.on("data", (d) => process.stderr.write(`[ai-out] ${d}`));

  // Wait for ai health (up to ~60s).
  let healthy = false;
  for (let i = 0; i < 120; i += 1) {
    try {
      const h = await fetch(`http://localhost:${AI_PORT}/health`);
      if (h.ok) {
        healthy = true;
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  check("ai service healthy", healthy);
  if (!healthy) throw new Error("ai service did not start");

  process.env.AI_SERVICE_URL = `http://localhost:${AI_PORT}`;

  // Direct probe of the ai route first — surfaces the real error body.
  const direct = await fetch(`http://localhost:${AI_PORT}/org/suggest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      startupContext: {
        industry: "B2B SaaS",
        goal: "Launch an MVP in 8 weeks",
        constraints: ["budget $10k"],
        priorities: ["speed"],
        stage: "MVP",
      },
    }),
  });
  const directBody = (await direct.json().catch(() => null)) as unknown;
  console.log(`ai direct /org/suggest status=${direct.status}`);
  console.log(`ai direct body=${JSON.stringify(directBody)?.substring(0, 500)}`);

  // NOTE: dynamic import AFTER setting AI_SERVICE_URL — service.ts captures it at load.
  const { createApp } = await import("../src/app.js");
  const app = createApp();
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(API_PORT, () => resolve(s));
  });
  const BASE = `http://localhost:${API_PORT}`;

  const created = (await (
    await fetch(`${BASE}/startup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rawDescription: "T5+T4 e2e probe",
        industry: "B2B SaaS",
        goal: "Launch an MVP in 8 weeks",
        stage: "MVP",
      }),
    })
  ).json()) as { id: string };

  const approved = (await (
    await fetch(`${BASE}/startup/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        industry: "B2B SaaS",
        goal: "Launch an MVP in 8 weeks",
        stage: "MVP",
        constraints: ["budget $10k"],
        priorities: ["speed"],
      }),
    })
  ).json()) as { status: string };
  check("probe startup approved", approved.status === "APPROVED", approved.status);

  const res = await fetch(`${BASE}/org/suggest?startupId=${created.id}`);
  const body = (await res.json().catch(() => null)) as {
    suggestions?: Array<{ role: string; recommendedOn: boolean; reason: string }>;
  } | null;
  const roles = (body?.suggestions ?? []).map((s) => s.role);
  check("suggest returns 200 (live Groq via T4)", res.status === 200, `status=${res.status}`);
  check(
    "suggest returns exactly the 6 fixed roles with non-empty reasons",
    (body?.suggestions?.length ?? 0) === 6 &&
      roles.join(",") ===
        "CEO,TECH_MANAGER,BACKEND_ENGINEER,FRONTEND_ENGINEER,GROWTH_MANAGER,MARKETING_EMPLOYEE" &&
      (body?.suggestions ?? []).every((s) => typeof s.reason === "string" && s.reason.length > 0),
    `roles=${roles.join(",")}`,
  );
  for (const s of body?.suggestions ?? []) {
    console.log(`  - ${s.role} [${s.recommendedOn ? "ON" : "off"}]: ${s.reason}`);
  }

  server.close();
} finally {
  // shell:true wraps the child in cmd.exe — kill the whole tree so no orphan holds the port.
  try {
    if (ai?.pid) execSync(`taskkill /PID ${ai.pid} /T /F`);
  } catch {
    ai?.kill();
  }
  await prisma.$disconnect();
}

if (failures.length > 0) {
  console.log(`${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("T4_T5_E2E_PASSED");
