import { z } from "zod";

export const createDataPointSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
  reportingPeriodId: z.string().min(1),
});

export const bulkDataPointSchema = z.object({
  reportingPeriodId: z.string().min(1),
  dataPoints: z
    .array(
      z.object({
        category: z.string().min(1),
        key: z.string().min(1),
        value: z.string().min(1),
        unit: z.string().optional(),
      })
    )
    .min(1),
});
