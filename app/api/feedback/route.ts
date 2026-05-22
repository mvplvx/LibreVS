import { getUser } from "@/lib/auth";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { librevsLog } from "@/lib/observability/librevsLog";
import { createFeedbackSchema } from "@/lib/validators/feedback";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = createFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { reportingPeriodId, fieldId, section, message } = parsed.data;

    if (reportingPeriodId) {
      const period = await prisma.reportingPeriod.findFirst({
        where: {
          id: reportingPeriodId,
          company: { organizationId },
        },
      });
      if (!period) {
        return apiError("Reporting period not found", 404);
      }
    }

    const record = await prisma.vsmeFeedback.create({
      data: {
        organizationId,
        reportingPeriodId: reportingPeriodId ?? null,
        fieldId: fieldId ?? null,
        section: section ?? null,
        message: message.trim(),
      },
    });

    librevsLog("feedback.received", {
      feedbackId: record.id,
      organizationId,
      reportingPeriodId: reportingPeriodId ?? null,
      fieldId: fieldId ?? null,
      section: section ?? null,
      messageLength: message.trim().length,
    });

    return apiSuccess({ id: record.id, createdAt: record.createdAt.toISOString() }, 201);
  });
}
