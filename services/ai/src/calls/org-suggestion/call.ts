import { z } from "zod";
import {
  AgentSuggestionSchema,
  StartupContextSchema,
  type AgentSuggestion,
  type StartupContext,
} from "@ai-office/shared-types";
import { StructuredCallError } from "../errors.js";
import { getChatModel } from "../../agents/common/llm.js";
import { buildOrgCorrectivePrompt, buildOrgSuggestionPrompt } from "./prompts.js";
import { filterSuggestions } from "./filter.js";

/** Minimal surface T4 needs — real Runnable or test stub. */
export interface OrgSuggestionModel {
  invoke(input: string): Promise<unknown>;
}

export interface SuggestOpts {
  /** Injected model (tests/stubs). Defaults to Groq withStructuredOutput. */
  model?: OrgSuggestionModel;
  apiKey?: string;
  modelName?: string;
}

/** LLM wire shape — deliberately NOT length-constrained so a 7th role fails open into the filter. */
const OrgWrapperSchema = z.object({
  suggestions: z.array(AgentSuggestionSchema),
});

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

function toCandidates(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw;
  const parsed = OrgWrapperSchema.safeParse(raw);
  if (parsed.success) return parsed.data.suggestions;
  // Pass through unparsed so the filter (not a crash) decides — retry handles it.
  return raw;
}

function validateFiltered(filtered: AgentSuggestion[], raw: unknown): void {
  if (filtered.length !== 6) {
    throw new StructuredCallError("SCHEMA_VALIDATION", "Org suggestion must contain exactly 6 roles.", {
      issues: `got ${filtered.length}`,
      raw,
    });
  }
  for (const s of filtered) {
    const parsed = AgentSuggestionSchema.safeParse(s);
    if (!parsed.success) {
      throw new StructuredCallError("SCHEMA_VALIDATION", "Org suggestion entry invalid.", {
        issues: parsed.error.issues,
        raw,
      });
    }
  }
}

export async function suggestOrg(
  context: StartupContext,
  opts?: SuggestOpts,
): Promise<AgentSuggestion[]> {
  const ctxParsed = StartupContextSchema.safeParse(context);
  if (!ctxParsed.success) {
    throw new StructuredCallError("SCHEMA_VALIDATION", "Invalid StartupContext for org suggestion.", {
      issues: ctxParsed.error.issues,
      raw: context,
    });
  }
  const ctx = ctxParsed.data;

  const model: OrgSuggestionModel =
    opts?.model ??
    getChatModel({ apiKey: opts?.apiKey, model: opts?.modelName }).withStructuredOutput(
      OrgWrapperSchema,
    );

  // --- attempt 1 ---
  let raw: unknown;
  try {
    raw = await model.invoke(buildOrgSuggestionPrompt(ctx));
  } catch (err) {
    return retryAfterCallFailure(ctx, model, err);
  }
  let filtered = filterSuggestions(toCandidates(raw));
  if (filtered.length === 6) {
    try {
      validateFiltered(filtered, raw);
      return filtered;
    } catch {
      // fall through to single retry
    }
  }

  // --- attempt 2 (single retry) ---
  let repaired: unknown;
  try {
    repaired = await model.invoke(
      buildOrgCorrectivePrompt(ctx, raw, formatIssues("expected exactly 6 fixed roles with non-empty reasons")),
    );
  } catch (err) {
    throw new StructuredCallError("MODEL_CALL_FAILED", "Groq call failed on retry.", {
      raw,
      issues: err instanceof Error ? err.message : String(err),
    });
  }
  filtered = filterSuggestions(toCandidates(repaired));
  validateFiltered(filtered, repaired);
  return filtered;
}

async function retryAfterCallFailure(
  ctx: StartupContext,
  model: OrgSuggestionModel,
  firstErr: unknown,
): Promise<AgentSuggestion[]> {
  let repaired: unknown;
  try {
    repaired = await model.invoke(
      buildOrgCorrectivePrompt(
        ctx,
        null,
        `First call failed: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}`,
      ),
    );
  } catch (err) {
    throw new StructuredCallError("MODEL_CALL_FAILED", "Groq call failed twice.", {
      issues: err instanceof Error ? err.message : String(err),
    });
  }
  const filtered = filterSuggestions(toCandidates(repaired));
  validateFiltered(filtered, repaired);
  return filtered;
}
