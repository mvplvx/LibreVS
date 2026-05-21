import { z } from "zod";

export const createReportingPeriodSchema = z.object({
  year: z.number().int(),
  companyId: z.string().min(1),
  status: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
