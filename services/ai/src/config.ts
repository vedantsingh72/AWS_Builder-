// Service-level config. Env-driven, no hardcoded secrets.
export const config = {
  port: Number(process.env.PORT ?? 3002),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  model: process.env.AI_MODEL ?? "llama-3.3-70b-versatile",
  apiBaseUrl: process.env.API_BASE_URL ?? "http://api:3001",
  databaseUrl: process.env.DATABASE_URL ?? "",
};
