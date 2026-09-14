import { prisma } from "../../lib/prisma";
import type { CreateStartupInput, ApproveStartupInput } from "./schemas";

export class StartupNotFoundError extends Error {
  constructor(id: string) {
    super(`Startup ${id} not found`);
    this.name = "StartupNotFoundError";
  }
}

export async function createStartup(input: CreateStartupInput) {
  return prisma.startup.create({
    data: {
      rawDescription: input.rawDescription,
      industry: input.industry,
      goal: input.goal,
      stage: input.stage,
      constraints: input.constraints ?? [],
      priorities: input.priorities ?? [],
    },
  });
}

export async function getStartup(id: string) {
  const startup = await prisma.startup.findUnique({ where: { id } });
  if (!startup) throw new StartupNotFoundError(id);
  return startup;
}

export async function approveStartup(id: string, input: ApproveStartupInput) {

  await getStartup(id);

  return prisma.startup.update({
    where: { id },
    data: {
      rawDescription: input.rawDescription,
      industry: input.industry,
      goal: input.goal,
      stage: input.stage,
      constraints: input.constraints,
      priorities: input.priorities,
      status: "APPROVED",
    },
  });
}
