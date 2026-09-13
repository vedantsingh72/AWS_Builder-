import { z } from "zod";

export const StartupStageSchema = z.enum(["IDEA", "MVP", "GROWTH", "SCALE"]);
export type StartupStage = z.infer<typeof StartupStageSchema>;

export const StartupStatusSchema = z.enum(["DRAFT", "APPROVED"]);
export type StartupStatus = z.infer<typeof StartupStatusSchema>;

export const StartupContextSchema = z.object({
  industry: z.string().min(1),
  goal: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),
  stage: StartupStageSchema,
});
export type StartupContext = z.infer<typeof StartupContextSchema>;

export const StartupSchema = z.object({
  id: z.string().uuid(),
  rawDescription: z.string().min(1),
  context: StartupContextSchema,
  status: StartupStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Startup = z.infer<typeof StartupSchema>;

// API payloads (T2)
export const CreateStartupDraftSchema = z.object({
  rawDescription: z.string().min(1),
  context: StartupContextSchema.optional(),
});
export type CreateStartupDraft = z.infer<typeof CreateStartupDraftSchema>;

export const UpdateStartupSchema = z.object({
  context: StartupContextSchema.optional(),
  rawDescription: z.string().min(1).optional(),
  approved: z.boolean().optional(),
});
export type UpdateStartup = z.infer<typeof UpdateStartupSchema>;
