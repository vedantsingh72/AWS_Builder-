// LangGraph shared graph-state shape — the one type both services must agree on.
// Internal orchestration state, NOT the product-facing Task.status the UI displays.
// Rule: node transitions write to the Task table, never the other way around.
//
// Persistence: one StateGraph per startup, Postgres checkpointer,
// thread_id = startup_id (durable, resumable thread).
// Keep every channel JSON-serializable (ISO strings, plain objects/arrays).
import { Annotation } from "@langchain/langgraph";
import { z } from "zod";
import type { Blocker } from "./blocker";
import { BlockerSchema } from "./blocker";
import type { Decision } from "./decision";
import { DecisionSchema } from "./decision";
import type { Task } from "./task";
import { TaskSchema } from "./task";

export const InterruptPayloadSchema = z.object({
  taskId: z.string().uuid(),
  reason: z.string().min(1),
  attemptedFixes: z.array(z.string()).default([]),
});
export type InterruptPayload = z.infer<typeof InterruptPayloadSchema>;

/** Full snapshot shape — also used to validate checkpoints in tests. */
export const GraphStateSnapshotSchema = z.object({
  currentInstruction: z.string(),
  activeTaskTree: z.array(TaskSchema),
  pendingBlocker: BlockerSchema.nullable(),
  interruptPayload: InterruptPayloadSchema.nullable(),
  decisions: z.array(DecisionSchema),
});
export type GraphStateSnapshot = z.infer<typeof GraphStateSnapshotSchema>;

const replace =
  <T>() =>
  (_prev: T, next: T): T =>
    next;

export const GraphStateAnnotation = Annotation.Root({
  currentInstruction: Annotation<string>({
    reducer: replace<string>(),
    default: () => "",
  }),
  activeTaskTree: Annotation<Task[]>({
    reducer: replace<Task[]>(),
    default: () => [],
  }),
  pendingBlocker: Annotation<Blocker | null>({
    reducer: replace<Blocker | null>(),
    default: () => null,
  }),
  interruptPayload: Annotation<InterruptPayload | null>({
    reducer: replace<InterruptPayload | null>(),
    default: () => null,
  }),
  decisions: Annotation<Decision[]>({
    reducer: replace<Decision[]>(),
    default: () => [],
  }),
});

export type GraphState = typeof GraphStateAnnotation.State;
