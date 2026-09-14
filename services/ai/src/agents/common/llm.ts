// Groq model factory (ChatGroq). Injectable for tests — production reads env.
import { ChatGroq } from "@langchain/groq";
import { config } from "../../config";
import { StructuredCallError } from "../../calls/errors";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const FAST_MODEL = "llama-3.1-8b-instant";

export interface GetChatModelOpts {
  apiKey?: string;
  model?: string;
}

export function getChatModel(opts?: GetChatModelOpts): ChatGroq {
  const apiKey = opts?.apiKey ?? config.groqApiKey;
  if (!apiKey) {
    throw new StructuredCallError(
      "MISSING_API_KEY",
      "GROQ_API_KEY is not set. Copy services/ai/.env.example to .env and add your Groq key (https://console.groq.com).",
    );
  }
  return new ChatGroq({
    apiKey,
    model: opts?.model ?? process.env.AI_MODEL ?? config.model,
    temperature: 0,
  });
}
