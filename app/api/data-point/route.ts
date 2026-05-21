import { prisma } from "@/lib/db/prisma";
import { withApiHandler, parseJsonBody } from "@/lib/api/handler";
import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import { apiError, apiSuccess, formatZodError } from "@/lib/api/response";
import { bulkDataPointSchema } from "@/lib/validators/datapoint";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const reportingPeriodId = new URL(req.url).searchParams
      .get("reportingPeriodId")
      ?.trim();

    if (!reportingPeriodId) {
      return apiError("reportingPeriodId query parameter is required", 400);
    }

    const reportingPeriod = await findReportingPeriodById(reportingPeriodId);
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const dataPoints = await prisma.sustainabilityDataPoint.findMany({
      where: { reportingPeriodId },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(dataPoints);
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const body = await parseJsonBody(req);
    if (body === null) {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = bulkDataPointSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }

    const { reportingPeriodId, dataPoints } = parsed.data;

    const reportingPeriod = await findReportingPeriodById(reportingPeriodId);
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const result = await prisma.sustainabilityDataPoint.createMany({
      data: dataPoints.map((dp) => ({
        ...dp,
        reportingPeriodId,
      })),
    });

    return apiSuccess({ created: result.count }, 201);
  });
}
