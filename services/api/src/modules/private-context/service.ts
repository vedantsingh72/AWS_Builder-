import { prisma } from "../../lib/prisma";
import { StartupNotFoundError } from "../startup/service";
import type { UpsertPrivateContextInput } from "./schemas";

export class ForbiddenNotCEOError extends Error {
  constructor() {
    super("Private context is visible to the CEO agent only");
    this.name = "ForbiddenNotCEOError";
  }
}

export class AgentNotFoundError extends Error {
  constructor(id: string) {
    super(`Agent ${id} not found`);
    this.name = "AgentNotFoundError";
  }
}

export class PrivateContextNotFoundError extends Error {
  constructor() {
    super("No private context stored for this CEO agent yet");
    this.name = "PrivateContextNotFoundError";
  }
}

export class CEONotFoundError extends Error {
  constructor(startupId: string) {
    super(`No CEO agent for startup ${startupId} — instantiate the org first (T9)`);
    this.name = "CEONotFoundError";
  }
}

/**
 * The CEO-scoped check. Exported for reuse (T10 context builders, T12 CEO node).
 * Loads the calling agent and requires role === "CEO" within the same startup.
 */
export async function requireCEOAgent(startupId: string, agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.startupId !== startupId) throw new AgentNotFoundError(agentId);
  if (agent.role !== "CEO") throw new ForbiddenNotCEOError();
  return agent;
}

export async function ensureStartupExists(startupId: string): Promise<void> {
  const startup = await prisma.startup.findUnique({ where: { id: startupId } });
  if (!startup) throw new StartupNotFoundError(startupId);
}

/** Metadata storage only — never calls out anywhere. One row per CEO agent. */
export async function upsertPrivateContext(input: UpsertPrivateContextInput) {
  await ensureStartupExists(input.startupId);
  await requireCEOAgent(input.startupId, input.agentId);
  return prisma.agentPrivateContext.upsert({
    where: { agentId: input.agentId },
    create: {
      startupId: input.startupId,
      agentId: input.agentId,
      resourceLabel: input.resourceLabel,
      resourceValue: input.resourceValue,
    },
    update: {
      resourceLabel: input.resourceLabel,
      resourceValue: input.resourceValue,
    },
  });
}

export async function getPrivateContext(startupId: string, agentId: string) {
  await ensureStartupExists(startupId);
  await requireCEOAgent(startupId, agentId);
  const row = await prisma.agentPrivateContext.findUnique({ where: { agentId } });
  if (!row || row.startupId !== startupId) throw new PrivateContextNotFoundError();
  return row;
}

/** Read-only CEO lookup so the T8 UI can resolve which agentId to call with. */
export async function findCEOAgentId(startupId: string): Promise<string> {
  await ensureStartupExists(startupId);
  const ceo = await prisma.agent.findFirst({
    where: { startupId, role: "CEO" },
  });
  if (!ceo) throw new CEONotFoundError(startupId);
  return ceo.id;
}
