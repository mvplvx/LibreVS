import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";

/** VSME values grouped by section code (schema-driven). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const reportingPeriodId = await resolveRouteId(params);

    if (!reportingPeriodId) {
      return apiError("Reporting period id is required", 400);
    }

    const data = await loadPeriodIntelligence(reportingPeriodId, organizationId);
    if (!data) {
      return apiError("Reporting period not found", 404);
    }

    return apiSuccess({
      reportingPeriodId: data.reportingPeriodId,
      year: data.year,
      status: data.status,
      companyId: data.companyId,
      totalDataPoints: data.totalDataPoints,
      summary: data.vsme.bySection,
      values: data.vsme.values,
      coveragePercentage: data.vsme.coveragePercentage,
    });
  });
}
