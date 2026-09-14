import { z } from "zod";

export const upsertPrivateContextSchema = z.object({
  startupId: z.string().min(1, "startupId is required"),
  agentId: z.string().min(1, "agentId is required"),
  resourceLabel: z.string().min(1, "resourceLabel is required"),
  resourceValue: z.string().min(1, "resourceValue is required"),
});
export type UpsertPrivateContextInput = z.infer<typeof upsertPrivateContextSchema>;

export const getPrivateContextQuerySchema = z.object({
  startupId: z.string().min(1, "startupId is required"),
  agentId: z.string().min(1, "agentId is required"),
});
export type GetPrivateContextQuery = z.infer<typeof getPrivateContextQuerySchema>;

export const findCEOQuerySchema = z.object({
  startupId: z.string().min(1, "startupId is required"),
});
export type FindCEOQuery = z.infer<typeof findCEOQuerySchema>;
