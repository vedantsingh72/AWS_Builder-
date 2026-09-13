// T1 VERIFY: stub retry/error checks always; live 3-sample only with GROQ_API_KEY.
// Run: npm run verify:t1 --workspace=@ai-office/ai
import { structureStartupContext, StructuredCallError } from "../dist/calls/onboarding/index.js";
import { StartupContextSchema } from "@ai-office/shared-types";

let failures = 0;
function check(name, passed, extra = "") {
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${extra ? " — " + extra : ""}`);
  if (!passed) failures += 1;
}

const VALID = {
  industry: "B2B SaaS",
  goal: "Launch an MVP in 8 weeks",
  constraints: ["budget $10k"],
  priorities: ["speed"],
  stage: "MVP",
};

// 1. Malformed first, valid second -> retry fires exactly once, no crash.
{
  let calls = 0;
  const stub = {
    async invoke() {
      calls += 1;
      return calls === 1 ? { industry: "", stage: "NOPE" } : VALID;
    },
  };
  try {
    const out = await structureStartupContext("We build B2B SaaS, launch MVP fast.", {
      model: stub,
    });
    check("retry path fires and recovers", calls === 2 && out.stage === "MVP", `calls=${calls}`);
  } catch (e) {
    check("retry path fires and recovers", false, String(e));
  }
}

// 2. Always malformed -> structured error (not a crash), exactly 2 calls.
{
  let calls = 0;
  const stub = {
    async invoke() {
      calls += 1;
      return { garbage: true };
    },
  };
  try {
    await structureStartupContext("something", { model: stub });
    check("double-malformed throws structured error", false, "did not throw");
  } catch (e) {
    const ok =
      e instanceof StructuredCallError && e.code === "SCHEMA_VALIDATION" && calls === 2;
    check("double-malformed throws structured error", ok, `calls=${calls}`);
  }
}

// 3. Empty input -> EMPTY_INPUT without touching the model.
{
  let calls = 0;
  const stub = {
    async invoke() {
      calls += 1;
      return VALID;
    },
  };
  try {
    await structureStartupContext("   ", { model: stub });
    check("empty input rejected", false, "did not throw");
  } catch (e) {
    check(
      "empty input rejected",
      e instanceof StructuredCallError && e.code === "EMPTY_INPUT" && calls === 0,
    );
  }
}

// 4. Live: 3 samples through real Groq (skipped without key).
if (!process.env.GROQ_API_KEY) {
  console.log("SKIP - live 3-sample run (GROQ_API_KEY not set)");
} else {
  const samples = [
    "We are building B2B SaaS for invoice automation. Goal: 50 paying teams by year end. Constraint: only 3 engineers. Priority: ship fast. We have a prototype with 2 pilot users.",
    "A marketplace connecting home chefs with nearby buyers. Goal: launch in one city with 100 chefs. Constraints: food-safety compliance, tight seed budget. Stage: just an idea.",
    "D2C skincare brand selling vitamin-C serum online. Goal: $100k monthly revenue. Priorities: brand and repeat purchase. Already selling on Shopify with steady orders.",
  ];
  for (let i = 0; i < samples.length; i += 1) {
    try {
      const out = await structureStartupContext(samples[i]);
      const parsed = StartupContextSchema.safeParse(out);
      check(`live sample ${i + 1} schema-valid`, parsed.success, JSON.stringify(out));
    } catch (e) {
      check(`live sample ${i + 1} schema-valid`, false, String(e));
    }
    if (i < samples.length - 1) await new Promise((r) => setTimeout(r, 1500));
  }
}

if (failures > 0) {
  console.log(`${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("ALL_T1_CHECKS_PASSED");
