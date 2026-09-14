// T4 server-side filter — the guarantee that nothing outside the fixed six survives.
// Pure function: no LLM, no I/O, fully unit-testable.
import {
  AgentSuggestionSchema,
  FIXED_AGENT_ROLES,
  type AgentRole,
  type AgentSuggestion,
} from "@ai-office/shared-types";

/** Normalize model role spellings ("Tech Manager", "tech_manager") to enum values. */
export function normalizeRole(input: unknown): AgentRole | null {
  if (typeof input !== "string") return null;
  const canon = input.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (FIXED_AGENT_ROLES as readonly string[]).includes(canon) ? (canon as AgentRole) : null;
}

export const DEFAULT_BACKFILL_REASON = "Default recommendation (model omitted this role).";

/**
 * Strip anything outside the fixed roster, drop empty reasons, dedupe (first wins),
 * backfill missing roles, and return exactly 6 in FIXED_AGENT_ROLES order.
 * Accepts either a raw array or { suggestions: [...] }.
 */
export function filterSuggestions(raw: unknown): AgentSuggestion[] {
  const candidates: unknown[] = Array.isArray(raw)
    ? raw
    : raw !== null &&
        typeof raw === "object" &&
        Array.isArray((raw as { suggestions?: unknown }).suggestions)
      ? ((raw as { suggestions: unknown[] }).suggestions as unknown[])
      : [];

  const byRole = new Map<AgentRole, AgentSuggestion>();

  for (const entry of candidates) {
    if (entry === null || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const role = normalizeRole(rec.role);
    if (!role || byRole.has(role)) continue;

    const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";
    if (!reason) continue;

    const recommendedOn =
      typeof rec.recommendedOn === "boolean"
        ? rec.recommendedOn
        : typeof rec.recommended === "boolean"
          ? (rec.recommended as boolean)
          : role === "CEO";

    const score =
      typeof rec.score === "number" && rec.score >= 0 && rec.score <= 1 ? rec.score : undefined;

    const parsed = AgentSuggestionSchema.safeParse(
      score === undefined ? { role, recommendedOn, reason } : { role, recommendedOn, reason, score },
    );
    if (parsed.success) byRole.set(role, parsed.data);
  }

  for (const role of FIXED_AGENT_ROLES) {
    if (!byRole.has(role)) {
      byRole.set(role, {
        role,
        recommendedOn: role === "CEO",
        reason: DEFAULT_BACKFILL_REASON,
      });
    }
  }

  // Force CEO on — CEO is mandatory in every org (T6 verify).
  const ceo = byRole.get("CEO")!;
  if (!ceo.recommendedOn) byRole.set("CEO", { ...ceo, recommendedOn: true });

  return FIXED_AGENT_ROLES.map((role) => byRole.get(role)!);
}
