import { z } from "zod";

export const DailyReportTotalsSchema = z.object({
  completed: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  resolvedInternally: z.number().int().nonnegative(),
  pendingDecisions: z.number().int().nonnegative(),
});
export type DailyReportTotals = z.infer<typeof DailyReportTotalsSchema>;

export const DailyReportSchema = z.object({
  id: z.string().uuid(),
  startupId: z.string().uuid(),
  /** YYYY-MM-DD */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totals: DailyReportTotalsSchema,
  narrative: z.string().min(1),
  /** Every ID referenced in narrative must resolve to a real row (T25 check). */
  decisionRefs: z.array(z.string().uuid()).default([]),
  taskRefs: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
});
export type DailyReport = z.infer<typeof DailyReportSchema>;
