// Pure prompt builders — no LLM calls here, easy to unit-test.
const FIELDS = `Extract exactly these fields as a JSON object:
- industry: non-empty string (e.g. "B2B SaaS", "Marketplace", "D2C")
- goal: non-empty string (the founder's main objective)
- constraints: string array (budget, time, team limits; [] if none stated)
- priorities: string array (what matters most; [] if none stated)
- stage: exactly one of IDEA | MVP | GROWTH | SCALE`;

export function buildOnboardingPrompt(rawDescription: string): string {
  return `You structure startup descriptions for a founder dashboard.
${FIELDS}
Rules: return JSON ONLY, no prose or markdown. Never invent a stage outside the four listed values. Use [] for missing arrays, never null.

Founder description:
"""${rawDescription}"""`;
}

export function buildCorrectivePrompt(
  rawDescription: string,
  firstAttemptRaw: unknown,
  issues: string,
): string {
  let firstRendered: string;
  try {
    firstRendered = JSON.stringify(firstAttemptRaw);
  } catch {
    firstRendered = String(firstAttemptRaw);
  }
  return `Your previous output failed schema validation. Fix ONLY the listed issues and return JSON ONLY — no prose, no markdown, no extra fields.

${FIELDS}
Stage must be exactly one of IDEA | MVP | GROWTH | SCALE.

Validation issues:
${issues}

Original founder description:
"""${rawDescription}"""

Previous invalid output:
${firstRendered}`;
}
