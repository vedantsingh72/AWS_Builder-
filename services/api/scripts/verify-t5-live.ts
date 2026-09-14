// T5 LIVE VERIFY: boots the real api app + real Postgres, exercises org endpoints.
// Run: DATABASE_URL=postgresql://postgres:dev@localhost:5434/ai_office npx tsx services/api/scripts/verify-t5-live.ts
// (AI service optional: if reachable with a key, suggest returns 200; else 502 path is asserted.)
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

let failures = 0;
function check(name: string, passed: boolean, extra = "") {
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${extra ? " — " + extra : ""}`);
  if (!passed) failures += 1;
}

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

const app = createApp();
const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
  const s = app.listen(PORT, () => resolve(s));
});

// --- fixture: draft + approved startups ---
const draft = await post("/startup", { rawDescription: "T5 draft fixture" });
const draftId = (draft.body as { id: string }).id;
const created = await post("/startup", {
  rawDescription: "T5 approved fixture",
  industry: "SaaS",
  goal: "Verify T5",
  stage: "MVP",
});
const createdId = (created.body as { id: string }).id;
const approveRes = await fetch(`${BASE}/startup/${createdId}`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    industry: "SaaS",
    goal: "Verify T5",
    stage: "MVP",
    constraints: [],
    priorities: [],
  }),
});
check("fixture startup approved", approveRes.status === 200, `status=${approveRes.status}`);
const approvedId = createdId;

// --- POST /org/select ---
const ALL = ["CEO", "TECH_MANAGER", "BACKEND_ENGINEER", "FRONTEND_ENGINEER", "GROWTH_MANAGER", "MARKETING_EMPLOYEE"];
{
  const r = await post("/org/select", { startupId: approvedId, roles: ALL });
  check("select all-on returns 200", r.status === 200, `status=${r.status}`);
}
{
  const r = await post("/org/select", { startupId: approvedId, roles: ["CEO"] });
  check("select CEO-only returns 200", r.status === 200, `status=${r.status}`);
}
{
  const r = await post("/org/select", { startupId: approvedId, roles: ["TECH_MANAGER"] });
  check("select without CEO rejected 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await post("/org/select", { startupId: approvedId, roles: ["CEO", "Legal Counsel"] });
  check("select Legal Counsel rejected 400 (never reaches DB)", r.status === 400, `status=${r.status}`);
}
{
  const r = await post("/org/select", { startupId: "c".repeat(25), roles: ["CEO"] });
  check("select unknown startup 404", r.status === 404, `status=${r.status}`);
}

// --- GET /org/suggest ---
{
  const r = await get("/org/suggest");
  check("suggest missing startupId 400", r.status === 400, `status=${r.status}`);
}
{
  const r = await get("/org/suggest?startupId=xxxxxxxxxxxxxxxxxxxxxxxxx");
  check("suggest unknown startup 404", r.status === 404, `status=${r.status}`);
}
{
  const r = await get(`/org/suggest?startupId=${draftId}`);
  check("suggest unapproved startup 422", r.status === 422, `status=${r.status}`);
}
{
  // Approved startup: 200 when AI is up with a key, 502 when AI is down.
  // Either proves the wiring; only 200 proves the full T4->T5 path.
  const r = await get(`/org/suggest?startupId=${approvedId}`);
  const body = r.body as { suggestions?: Array<{ role: string; reason: string }> } | null;
  if (r.status === 200) {
    const roles = (body?.suggestions ?? []).map((s) => s.role).join(",");
    const ok =
      (body?.suggestions?.length ?? 0) === 6 &&
      roles === ALL.join(",") &&
      (body?.suggestions ?? []).every((s) => s.reason.length > 0);
    check("suggest approved startup 200 with exactly 6 fixed roles", ok, `roles=${roles}`);
  } else {
    check("suggest approved startup without AI returns 502 (AI down path)", r.status === 502, `status=${r.status} — start ai service with GROQ_API_KEY for the 200 path`);
  }
}

// --- DB-enum proof: invalid role must die at the database layer ---
{
  let rejected = false;
  try {
    await prisma.agent.create({
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: "LEGAL_COUNSEL" as any,
        startupId: approvedId,
      },
    });
  } catch {
    rejected = true;
  }
  check("prisma Agent.create with invalid role rejected", rejected);
}
{
  let rejected = false;
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO agents (id, role, "startupId", "createdAt") VALUES ('t5probe', 'LEGAL_COUNSEL', '${approvedId}', NOW())`,
    );
  } catch {
    rejected = true;
  } finally {
    await prisma.$executeRawUnsafe(`DELETE FROM agents WHERE id = 't5probe'`).catch(() => undefined);
  }
  check("raw SQL insert with invalid enum rejected by Postgres", rejected);
}

server.close();
await prisma.$disconnect();

if (failures > 0) {
  console.log(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("ALL_T5_LIVE_CHECKS_PASSED");
