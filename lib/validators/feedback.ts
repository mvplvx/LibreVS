import { z } from "zod";

export const createFeedbackSchema = z.object({
  reportingPeriodId: z.string().min(1).optional(),
  fieldId: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  message: z.string().min(1).max(4000),
});
