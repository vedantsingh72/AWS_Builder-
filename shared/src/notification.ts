import { z } from "zod";

// ---- FOUNDER_INTERRUPT excluded from general feed by default (T22). ----
export const NotificationTypeSchema = z.enum([
  "TASK_UPDATE",
  "BLOCKER_ESCALATED",
  "FOUNDER_INTERRUPT",
  "DECISION_RECORDED",
  "REPORT_READY",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().min(1),
  relatedTaskId: z.string().uuid().optional(),
  relatedBlockerId: z.string().uuid().optional(),
  acknowledged: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = NotificationSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
