import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { startupRouter } from "./modules/startup/router";
import { orgRouter } from "./modules/org/router";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(startupRouter);
  app.use(orgRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}