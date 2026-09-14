import { Router } from "express";
import { ZodError } from "zod";
import { selectBodySchema, suggestQuerySchema } from "./schemas";
import {
  AiServiceError,
  StartupNotApprovedError,
  ensureStartupExists,
  fetchSuggestions,
  getStartupContext,
  normalizeSelection,
} from "./service";
import { StartupNotFoundError } from "../startup/service";

export const orgRouter = Router();

function fieldErrors(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

// GET /org/suggest?startupId=... — proxies the ai service (T4), never invents roles here.
orgRouter.get("/org/suggest", async (req, res) => {
  const parsed = suggestQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid suggest query", fields: fieldErrors(parsed.error) });
  }
  try {
    const context = await getStartupContext(parsed.data.startupId);
    const suggestions = await fetchSuggestions(context);
    return res.json({ startupId: parsed.data.startupId, suggestions });
  } catch (err) {
    if (err instanceof StartupNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof StartupNotApprovedError) {
      return res.status(422).json({ error: err.message });
    }
    if (err instanceof AiServiceError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
});

// POST /org/select — stateless validation. CEO mandatory; unknown roles rejected by the
// shared AgentRole enum (400) before anything could reach the DB enum (T5 verify).
orgRouter.post("/org/select", async (req, res) => {
  const parsed = selectBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid org selection", fields: fieldErrors(parsed.error) });
  }
  try {
    await ensureStartupExists(parsed.data.startupId);
    return res.json(normalizeSelection(parsed.data));
  } catch (err) {
    if (err instanceof StartupNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});
