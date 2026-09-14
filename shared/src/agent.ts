import { z } from "zod";
import { StartupContextSchema } from "./startup";
import { DecisionSchema } from "./decision";

// ---- Fixed six-role roster. Nothing outside this survives (T4 filter, T5 DB enum). ----
export const AgentRoleSchema = z.enum([
  "CEO",
  "TECH_MANAGER",
  "BACKEND_ENGINEER",
  "FRONTEND_ENGINEER",
  "GROWTH_MANAGER",
  "MARKETING_EMPLOYEE",
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const FIXED_AGENT_ROLES: readonly AgentRole[] = [
  "CEO",
  "TECH_MANAGER",
  "BACKEND_ENGINEER",
  "FRONTEND_ENGINEER",
  "GROWTH_MANAGER",
  "MARKETING_EMPLOYEE",
] as const;

/** Human-readable labels — UI only, never persisted. */
export const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  CEO: "CEO",
  TECH_MANAGER: "Tech Manager",
  BACKEND_ENGINEER: "Backend Engineer",
  FRONTEND_ENGINEER: "Frontend Engineer",
  GROWTH_MANAGER: "Growth Manager",
  MARKETING_EMPLOYEE: "Marketing Employee",
};

export const AgentStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  role: AgentRoleSchema,
  /** Null only for CEO (org root). Enforced in T9. */
  managerId: z.string().uuid().nullable(),
  status: AgentStatusSchema,
  createdAt: z.string().datetime(),
});
export type Agent = z.infer<typeof AgentSchema>;

/** Frontend component prop example: an agent card never carries private notes. */
export const AgentCardPropSchema = z.object({
  agent: AgentSchema,
  taskCount: z.number().int().nonnegative(),
  selected: z.boolean(),
});
export type AgentCardProp = z.infer<typeof AgentCardPropSchema>;

export const AgentSuggestionSchema = z.object({
  role: AgentRoleSchema,
  recommendedOn: z.boolean(),
  reason: z.string().min(1),
  score: z.number().min(0).max(1).optional(),
});
export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;

export const OrgSuggestionSchema = z.object({
  startupId: z.string().uuid(),
  suggestions: z.array(AgentSuggestionSchema).length(6),
});
export type OrgSuggestion = z.infer<typeof OrgSuggestionSchema>;

/**
 * CEO-only private notes. Metadata only — no real integration executes anything.
 * Readable only through a CEO-scoped auth check (T7). Must never appear in
 * agent-list or task payloads.
 */
export const AgentPrivateContextSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  ceoAgentId: z.string().uuid(),
  repoUrl: z.string().min(1).optional(),
  apiKeyLabel: z.string().min(1).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgentPrivateContext = z.infer<typeof AgentPrivateContextSchema>;

// ---- Prompt-context shapes (built only by the two T10 builders) ----
export const SharedAgentContextSchema = z.object({
  startupContext: StartupContextSchema,
  role: AgentRoleSchema,
  agentId: z.string().uuid(),
  /** Chain from direct manager up to CEO (CEO itself: empty array). */
  managerChain: z.array(AgentSchema),
  approvedDecisions: z.array(DecisionSchema),
});
export type SharedAgentContext = z.infer<typeof SharedAgentContextSchema>;

export const CEOContextSchema = SharedAgentContextSchema.extend({
  /** Reference only — never the raw secret inline in prompts/logs. */
  privateContextRef: z.string().uuid(),
});
export type CEOContext = z.infer<typeof CEOContextSchema>;
