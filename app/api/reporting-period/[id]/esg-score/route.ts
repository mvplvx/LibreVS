import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";

/**
 * Legacy route name retained for compatibility.
 * Returns VSME registry coverage only (no ESG scoring in Phase 4).
 */
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
      note: "Phase 4: VSME coverage only. ESG scoring is not part of this architecture.",
      coveragePercentage: data.vsme.coveragePercentage,
      fieldsReported: data.vsme.fieldsReported,
      totalFields: data.vsme.totalFields,
      bySection: data.vsme.bySection,
    });
  });
}
