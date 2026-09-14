import type { OrgSuggestion, PrivateContext, StructuredFields } from "./api";

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

// Dev-only fallback for T6 while the T5 endpoints are unavailable.
// Never used when the real API answers — see OrgSuggestion page.
export async function mockOrgSuggestion(): Promise<OrgSuggestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  return [
    { role: "CEO", recommendedOn: true, reason: "Every org needs a CEO to talk to the founder and own decisions." },
    { role: "TECH_MANAGER", recommendedOn: true, reason: "Breaks the product goal into backend and frontend work." },
    { role: "BACKEND_ENGINEER", recommendedOn: true, reason: "Builds APIs, data models, and integrations." },
    { role: "FRONTEND_ENGINEER", recommendedOn: true, reason: "Builds the screens the founder and users see." },
    { role: "GROWTH_MANAGER", recommendedOn: true, reason: "Turns the product into messaging and distribution." },
    { role: "MARKETING_EMPLOYEE", recommendedOn: true, reason: "Drafts copy and campaigns from growth direction." },
  ];
}

// Dev-only fallback for T8 while the T7 endpoints are unavailable.
export async function mockPrivateContext(startupId: string, agentId: string): Promise<PrivateContext> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    id: "mock-private-context",
    startupId,
    agentId,
    resourceLabel: "GitHub repo",
    resourceValue: "https://github.com/example/demo",
  };
}