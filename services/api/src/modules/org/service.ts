import {
  AgentSuggestionSchema,
  StartupContextSchema,
  type AgentSuggestion,
  type StartupContext,
} from "@ai-office/shared-types";
import { prisma } from "../../lib/prisma";
import { StartupNotFoundError } from "../startup/service";
import type { SelectBody } from "./schemas";

export class StartupNotApprovedError extends Error {
  constructor(id: string) {
    super(`Startup ${id} has no approved context yet — approve onboarding first`);
    this.name = "StartupNotApprovedError";
  }
}

export class AiServiceError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiServiceError";
    this.status = status;
  }
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:3002";

/** Load the approved StartupContext for a startup (T2 row -> T1 shape). */
export async function getStartupContext(startupId: string): Promise<StartupContext> {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) throw new StartupNotFoundError(startupId);

  const parsed = StartupContextSchema.safeParse({
    industry: startup.industry ?? "",
    goal: startup.goal ?? "",
    constraints: startup.constraints ?? [],
    priorities: startup.priorities ?? [],
    stage: startup.stage ?? "",
  });
  if (!parsed.success) throw new StartupNotApprovedError(startupId);
  return parsed.data;
}

export async function ensureStartupExists(startupId: string): Promise<void> {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) throw new StartupNotFoundError(startupId);
}

/** Call the ai service (T4) — the only cross-service call in T5. */
export async function fetchSuggestions(context: StartupContext): Promise<AgentSuggestion[]> {
  let res: Response;
  try {
    res = await fetch(`${AI_SERVICE_URL}/org/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startupContext: context }),
    });
  } catch (err) {
    throw new AiServiceError(
      `AI service unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!res.ok) {
    throw new AiServiceError(`AI service returned ${res.status}`, 502);
  }
  const body = (await res.json().catch(() => null)) as { suggestions?: unknown } | null;
  const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];
  const validated: AgentSuggestion[] = [];
  for (const s of suggestions) {
    const parsed = AgentSuggestionSchema.safeParse(s);
    if (!parsed.success) {
      throw new AiServiceError("AI service returned an invalid suggestion shape", 502);
    }
    validated.push(parsed.data);
  }
  if (validated.length !== 6) {
    throw new AiServiceError(`AI service returned ${validated.length} suggestions, expected 6`, 502);
  }
  return validated;
}

/**
 * T5 select is stateless validation only — no Agent rows are written here.
 * Instantiation (with manager_id tree + idempotency) is T9.
 */
export function normalizeSelection(body: SelectBody): SelectBody {
  return { startupId: body.startupId, roles: [...new Set(body.roles)] };
}
