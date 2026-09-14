import { Router } from "express";
import { ZodError } from "zod";
import { createStartupSchema, approveStartupSchema } from "./schemas";
import { createStartup, getStartup, approveStartup, StartupNotFoundError } from "./service";

export const startupRouter = Router();


function fieldErrors(err: ZodError) {
  return err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

startupRouter.post("/startup", async (req, res) => {
  const parsed = createStartupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid startup payload", fields: fieldErrors(parsed.error) });
  }

  const startup = await createStartup(parsed.data);
  res.status(201).json(startup);
});

startupRouter.get("/startup/:id", async (req, res) => {
  try {
    const startup = await getStartup(req.params.id);
    res.json(startup);
  } catch (err) {
    if (err instanceof StartupNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});

startupRouter.put("/startup/:id", async (req, res) => {
  const parsed = approveStartupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid startup payload", fields: fieldErrors(parsed.error) });
  }

  try {
    const startup = await approveStartup(req.params.id, parsed.data);
    res.json(startup);
  } catch (err) {
    if (err instanceof StartupNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});