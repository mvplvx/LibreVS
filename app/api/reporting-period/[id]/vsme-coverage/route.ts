import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { completenessApiFields } from "@/lib/api/vsmeCompletenessResponse";
import { apiError, apiSuccess } from "@/lib/api/response";

/** VSME registry coverage and mandatory completeness for a reporting period. */
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

    const { vsme } = data;

    return apiSuccess({
      reportingPeriodId: data.reportingPeriodId,
      schemaVersion: data.schemaVersion,
      employeeCount: data.employeeCount,
      fieldsReported: vsme.fieldsReported,
      totalFields: vsme.totalFields,
      applicableSections: vsme.applicableSections,
      ...completenessApiFields(vsme),
      bySection: vsme.bySection,
    });
  });
}
