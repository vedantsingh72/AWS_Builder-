import cors from "cors";
import express from "express";
import { StartupContextSchema } from "@ai-office/shared-types";
import { config } from "./config.js";
import { suggestOrg } from "./calls/org-suggestion/index.js";

export function createAiApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // T4: one-shot org suggestion. Stateless — NOT a graph node.
  app.post("/org/suggest", async (req, res) => {
    const parsed = StartupContextSchema.safeParse(req.body?.startupContext ?? req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid StartupContext",
        fields: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    try {
      const suggestions = await suggestOrg(parsed.data);
      return res.json({ suggestions });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : "Org suggestion failed",
        code: (err as { code?: string }).code ?? "ORG_SUGGEST_FAILED",
      });
    }
  });

  return app;
}

const app = createAiApp();
app.listen(config.port, () => {
  console.log(`ai listening on :${config.port}`);
});
