import { prisma } from "@/lib/db/prisma";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { findReportingPeriodById } from "@/lib/api/reportingPeriod";
import { buildDataPointSummary } from "@/lib/api/summary";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    const reportingPeriodId = await resolveRouteId(params);
    if (!reportingPeriodId) {
      return apiError("Reporting period id is required", 400);
    }

    const reportingPeriod = await findReportingPeriodById(reportingPeriodId);
    if (!reportingPeriod) {
      return apiError("Reporting period not found", 404);
    }

    const dataPoints = await prisma.sustainabilityDataPoint.findMany({
      where: { reportingPeriodId },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const { totalDataPoints, summary } = buildDataPointSummary(dataPoints);

    return apiSuccess({
      reportingPeriodId,
      totalDataPoints,
      summary,
    });
  });
}
