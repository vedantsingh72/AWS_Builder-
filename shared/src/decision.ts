import { z } from "zod";

export const DecisionStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "REJECTED",
]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const DecisionSourceSchema = z.enum(["MEETING", "INTERRUPT", "REVIEW"]);
export type DecisionSource = z.infer<typeof DecisionSourceSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  statement: z.string().min(1),
  scope: z.string().min(1),
  source: DecisionSourceSchema,
  sourceRef: z.string().optional(),
  status: DecisionStatusSchema,
  createdByAgentId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const CreateDecisionSchema = DecisionSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateDecision = z.infer<typeof CreateDecisionSchema>;
