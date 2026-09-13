// Structured errors for one-shot calls. Never return a partial contract object.
export type CallErrorCode =
  | "EMPTY_INPUT"
  | "MISSING_API_KEY"
  | "SCHEMA_VALIDATION"
  | "MODEL_CALL_FAILED";

export class StructuredCallError extends Error {
  readonly code: CallErrorCode;
  readonly issues?: unknown;
  readonly raw?: unknown;

  constructor(code: CallErrorCode, message: string, opts?: { issues?: unknown; raw?: unknown }) {
    super(message);
    this.name = "StructuredCallError";
    this.code = code;
    this.issues = opts?.issues;
    this.raw = opts?.raw;
  }
}
