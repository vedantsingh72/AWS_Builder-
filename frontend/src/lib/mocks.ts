import type { StructuredFields } from "./api";

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Healthtech: ["clinic", "patient", "health", "medical", "doctor"],
  Fintech: ["payment", "bank", "finance", "invoice", "money"],
  Edtech: ["student", "course", "learn", "school", "teacher"],
  "E-commerce": ["shop", "store", "product", "checkout", "retail"],
  SaaS: ["dashboard", "workflow", "team", "software", "tool"],
};

function guessIndustry(text: string): string {
  const lower = text.toLowerCase();
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return industry;
  }
  return "General";
}

function firstSentence(text: string): string {
  const match = text.match(/[^.!?]+[.!?]?/);
  return (match?.[0] ?? text).trim();
}


export async function structureDescription(rawDescription: string): Promise<StructuredFields> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    industry: guessIndustry(rawDescription),
    goal: firstSentence(rawDescription) || "Launch the MVP",
    stage: "Pre-seed",
    constraints: [],
    priorities: ["Ship the MVP"],
  };
}