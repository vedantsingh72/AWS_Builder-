import { z } from "zod";


export const createStartupSchema = z.object({
  rawDescription: z.string().min(1, "rawDescription is required"),
  industry: z.string().optional(),
  goal: z.string().optional(),
  stage: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
});
export type CreateStartupInput = z.infer<typeof createStartupSchema>;

export const approveStartupSchema = z.object({
  rawDescription: z.string().min(1).optional(),
  industry: z.string().min(1, "industry is required"),
  goal: z.string().min(1, "goal is required"),
  stage: z.string().min(1, "stage is required"),
  constraints: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),
});
export type ApproveStartupInput = z.infer<typeof approveStartupSchema>;