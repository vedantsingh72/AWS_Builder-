import { z } from "zod";

// ---- Escalation ladder: worker -> manager -> CEO -> founder ----
export const BlockerLevelSchema = z.enum(["MANAGER", "CEO", "FOUNDER"]);
export type BlockerLevel = z.infer<typeof BlockerLevelSchema>;

export const BlockerStatusSchema = z.enum(["OPEN", "RESOLVED", "ESCALATED"]);
export type BlockerStatus = z.infer<typeof BlockerStatusSchema>;

export const BlockerSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  taskId: z.string().uuid(),
  raisedByAgentId: z.string().uuid(),
  level: BlockerLevelSchema,
  description: z.string().min(1),
  attemptedFixes: z.array(z.string()).default([]),
  status: BlockerStatusSchema,
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable().optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

export const CreateBlockerSchema = BlockerSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateBlocker = z.infer<typeof CreateBlockerSchema>;
