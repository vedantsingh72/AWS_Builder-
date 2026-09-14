import { Router, type Response } from "express";
import { ZodError } from "zod";
import {
  findCEOQuerySchema,
  getPrivateContextQuerySchema,
  upsertPrivateContextSchema,
} from "./schemas";
import {
  AgentNotFoundError,
  CEONotFoundError,
  ForbiddenNotCEOError,
  PrivateContextNotFoundError,
  findCEOAgentId,
  getPrivateContext,
  upsertPrivateContext,
} from "./service";
import { StartupNotFoundError } from "../startup/service";

export const privateContextRouter = Router();

function fieldErrors(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function sendModuleError(err: unknown, res: Response): void {
  if (err instanceof StartupNotFoundError || err instanceof AgentNotFoundError) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }
  if (err instanceof ForbiddenNotCEOError) {
    res.status(403).json({ error: err.message });
    return;
  }
  if (err instanceof PrivateContextNotFoundError || err instanceof CEONotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  throw err;
}

// PUT /private-context — CEO-only upsert of one connection note (metadata only).
privateContextRouter.put("/private-context", async (req, res) => {
  const parsed = upsertPrivateContextSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid private-context payload", fields: fieldErrors(parsed.error) });
  }
  try {
    const row = await upsertPrivateContext(parsed.data);
    return res.json(row);
  } catch (err) {
    return sendModuleError(err, res);
  }
});

// GET /private-context?startupId=&agentId= — CEO-only read.
privateContextRouter.get("/private-context", async (req, res) => {
  const parsed = getPrivateContextQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid private-context query", fields: fieldErrors(parsed.error) });
  }
  try {
    const row = await getPrivateContext(parsed.data.startupId, parsed.data.agentId);
    return res.json(row);
  } catch (err) {
    return sendModuleError(err, res);
  }
});

// GET /private-context/ceo?startupId= — read-only CEO id lookup for the T8 UI.
privateContextRouter.get("/private-context/ceo", async (req, res) => {
  const parsed = findCEOQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid CEO lookup query", fields: fieldErrors(parsed.error) });
  }
  try {
    const agentId = await findCEOAgentId(parsed.data.startupId);
    return res.json({ startupId: parsed.data.startupId, agentId });
  } catch (err) {
    return sendModuleError(err, res);
  }
});
