import express from "express";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  return app;
}
