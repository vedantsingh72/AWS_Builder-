// T7 LIVE VERIFY: boots the real api app + real Postgres, exercises private-context
// endpoints, the CEO gate, and the no-leak audit.
// Run: DATABASE_URL=postgresql://postgres:dev@localhost:5434/ai_office npm run verify:t7
// (Agent rows are seeded directly via prisma here — test-only until T9 owns creation.)
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

let failures = 0;
function check(name: string, passed: boolean, extra = "") {
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${extra ? " — " + extra : ""}`);
  if (!passed) failures += 1;
}

const PORT = 3104;
const BASE = `http://localhost:${PORT}`;
const SECRET = "ghp_T7-fake-credential-9f8e7d6c5b4a";

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as unknown };
}

const app = createApp();
const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
  const s = app.listen(PORT, () => resolve(s));
});

// --- fixture: approved startup + seeded CEO / worker agents (T9 owns this later) ---
const created = (await (
  await fetch(`${BASE}/startup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rawDescription: "T7 fixture", industry: "SaaS", goal: "Verify T7", stage: "MVP" }),
  })
).json()) as { id: string };
const startupId = created.id;

const ceo = await prisma.agent.create({ data: { startupId, role: "CEO" } });
const worker = await prisma.agent.create({ data: { startupId, role: "BACKEND_ENGINEER", managerId: ceo.id } });

// --- PUT ---
{
  const r = await req("PUT", "/private-context", {
    startupId,
    agentId: ceo.id,
    resourceLabel: "GitHub repo",
    resourceValue: SECRET,
  });
  check("PUT as CEO returns 200 with stored note", r.status === 200, `status=${r.status}`);
}
{
  const r = await req("PUT", "/private-context", {
    startupId,
    agentId: worker.id,
    resourceLabel: "GitHub repo",
    resourceValue: "worker-secret",
  });
  check("PUT as worker rejected 403", r.status === 403, `status=${r.status}`);
}
{
  const r = await req("PUT", "/private-context", { startupId, agentId: ceo.id });
  check("PUT missing fields rejected 400", r.status === 400, `status=${r.status}`);
}
{
  const before = await prisma.agentPrivateContext.count({ where: { startupId } });
  await req("PUT", "/private-context", {
    startupId,
    agentId: ceo.id,
    resourceLabel: "GitHub repo",
    resourceValue: SECRET + "-v2",
  });
  const after = await prisma.agentPrivateContext.count({ where: { startupId } });
  check("second PUT upserts (no duplicate row)", before === 1 && after === 1, `rows=${before}->${after}`);
}

// --- GET ---
{
  const r = await req("GET", `/private-context?startupId=${startupId}&agentId=${ceo.id}`);
  const row = r.body as { resourceValue?: string } | null;
  check("GET as CEO returns the stored note", r.status === 200 && row?.resourceValue === SECRET + "-v2", `status=${r.status}`);
}
{
  const r = await req("GET", `/private-context?startupId=${startupId}&agentId=${worker.id}`);
  check("GET as worker rejected 403", r.status === 403, `status=${r.status}`);
}
{
  const r = await req("GET", `/private-context?startupId=${startupId}&agentId=${"0".repeat(25)}`);
  check("GET unknown agent 404", r.status === 404, `status=${r.status}`);
}

// --- CEO lookup ---
{
  const r = await req("GET", `/private-context/ceo?startupId=${startupId}`);
  check("CEO lookup returns CEO id", r.status === 200 && (r.body as { agentId?: string })?.agentId === ceo.id, `status=${r.status}`);
}
{
  const r = await req("GET", `/private-context/ceo?startupId=${"x".repeat(25)}`);
  check("CEO lookup unknown startup 404", r.status === 404, `status=${r.status}`);
}

// --- leak audit: private value must not appear outside the CEO endpoint ---
{
  const s = await req("GET", `/startup/${startupId}`);
  const leaked = JSON.stringify(s.body).includes(SECRET);
  check("startup response leaks nothing", s.status === 200 && !leaked, `status=${s.status}`);
}
{
  const s = await req("POST", "/org/select", { startupId, roles: ["CEO"] });
  const leaked = JSON.stringify(s.body).includes(SECRET);
  check("org/select response leaks nothing", s.status === 200 && !leaked, `status=${s.status}`);
}
{
  const s = await req("GET", `/org/suggest?startupId=${startupId}`);
  if (s.status === 200) {
    const leaked = JSON.stringify(s.body).includes(SECRET);
    check("org/suggest response leaks nothing", !leaked);
  } else {
    console.log(`SKIP - org/suggest leak audit (AI service returned ${s.status}; run verify:t5:e2e for the 200 path)`);
  }
}

server.close();
await prisma.$disconnect();

if (failures > 0) {
  console.log(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("ALL_T7_LIVE_CHECKS_PASSED");
