import { z } from "zod";
import { AgentRoleSchema } from "@ai-office/shared-types";

export const suggestQuerySchema = z.object({
  startupId: z.string().min(1, "startupId is required"),
});
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

export const selectBodySchema = z.object({
  startupId: z.string().min(1, "startupId is required"),
  roles: z
    .array(AgentRoleSchema)
    .min(1, "Select at least one role")
    .refine((roles) => roles.includes("CEO"), {
      message: "CEO is mandatory in every org",
    }),
});
export type SelectBody = z.infer<typeof selectBodySchema>;
