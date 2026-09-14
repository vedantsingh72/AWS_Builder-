
import { StartupContextSchema, type StartupContext } from "@ai-office/shared-types";
import { StructuredCallError } from "../errors";
import { getChatModel } from "../../agents/common/llm";
import { buildCorrectivePrompt, buildOnboardingPrompt } from "./prompts";

/** Minimal surface T1 needs — real Runnable or test stub. */
export interface OnboardingModel {
  invoke(input: string): Promise<unknown>;
}

export interface StructureOpts {
  /** Injected model (tests/stubs). Defaults to Groq withStructuredOutput. */
  model?: OnboardingModel;
  apiKey?: string;
  modelName?: string;
}

function formatIssues(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path?: unknown; message?: unknown }> }).issues
      .map((i) => `- ${JSON.stringify(i.path)}: ${String(i.message)}`)
      .join("\n");
  }
  return String(error);
}

export async function structureStartupContext(
  rawDescription: string,
  opts?: StructureOpts,
): Promise<StartupContext> {
  if (!rawDescription || rawDescription.trim().length === 0) {
    throw new StructuredCallError("EMPTY_INPUT", "Founder description must not be empty.");
  }

  const model: OnboardingModel =
    opts?.model ??
    getChatModel({ apiKey: opts?.apiKey, model: opts?.modelName }).withStructuredOutput(
      StartupContextSchema,
    );

  // --- attempt 1 ---
  let raw: unknown;
  try {
    raw = await model.invoke(buildOnboardingPrompt(rawDescription));
  } catch (err) {
    return retryAfterCallFailure(rawDescription, model, err);
  }
  const first = StartupContextSchema.safeParse(raw);
  if (first.success) return first.data;

  // --- attempt 2 (single retry) ---
  let repaired: unknown;
  try {
    repaired = await model.invoke(
      buildCorrectivePrompt(rawDescription, raw, formatIssues(first.error)),
    );
  } catch (err) {
    throw new StructuredCallError("MODEL_CALL_FAILED", "Groq call failed on retry.", {
      raw,
      issues: err instanceof Error ? err.message : String(err),
    });
  }
  const second = StartupContextSchema.safeParse(repaired);
  if (second.success) return second.data;

  throw new StructuredCallError(
    "SCHEMA_VALIDATION",
    "Model output failed StartupContext validation after one retry.",
    { issues: second.error.issues, raw: repaired },
  );
}

async function retryAfterCallFailure(
  rawDescription: string,
  model: OnboardingModel,
  firstErr: unknown,
): Promise<StartupContext> {
  let repaired: unknown;
  try {
    repaired = await model.invoke(
      buildCorrectivePrompt(
        rawDescription,
        null,
        `First call failed: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
      ),
    );
  } catch (err) {
    throw new StructuredCallError("MODEL_CALL_FAILED", "Groq call failed twice.", {
      issues: err instanceof Error ? err.message : String(err),
    });
  }
  const parsed = StartupContextSchema.safeParse(repaired);
  if (parsed.success) return parsed.data;
  throw new StructuredCallError(
    "SCHEMA_VALIDATION",
    "Model output failed StartupContext validation after one retry.",
    { issues: parsed.error.issues, raw: repaired },
  );
}
