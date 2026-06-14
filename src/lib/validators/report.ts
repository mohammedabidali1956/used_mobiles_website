/**
 * Report query validators.
 */

import { z } from "zod";

export const zGroupBy = z.enum(["day", "week", "month"]);
export type GroupBy = z.infer<typeof zGroupBy>;

export const zSalesReportQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  groupBy: zGroupBy.optional().default("day"),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type SalesReportQuery = z.infer<typeof zSalesReportQuery>;

export const zTopProductsReportQuery = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type TopProductsReportQuery = z.infer<typeof zTopProductsReportQuery>;

export const zLowAvailabilityReportQuery = z.object({
  threshold: z
    .string()
    .optional()
    .default("2")
    .transform(Number)
    .pipe(z.number().int().min(0)),
});

export type LowAvailabilityReportQuery = z.infer<typeof zLowAvailabilityReportQuery>;
