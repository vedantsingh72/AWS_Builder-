import { z } from "zod";

// ---- Product-facing task status (Task table). Graph state is separate. ----
export const TaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "DONE",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/** Enforced transitions for T19. Frozen here so API + UI agree. */
export const VALID_TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["BLOCKED", "REVIEW"],
  BLOCKED: ["IN_PROGRESS"],
  REVIEW: ["DONE", "IN_PROGRESS"],
  DONE: [],
};

export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable().optional(),
  createdByAgentId: z.string().uuid(),
  assignedAgentId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema.default("MEDIUM"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const TaskExecutionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  agentId: z.string().uuid(),
  summary: z.string().min(1),
  artifact: z.string().optional(),
  blockerFlag: z.boolean(),
  nextStep: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type TaskExecution = z.infer<typeof TaskExecutionSchema>;

/** Worker-node return shape (T18): schema is the contract, stub or LLM both OK. */
export const ExecutionResultSchema = z.object({
  summary: z.string().min(1),
  artifact: z.string().optional(),
  blockerFlag: z.boolean(),
  nextStep: z.string().optional(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
