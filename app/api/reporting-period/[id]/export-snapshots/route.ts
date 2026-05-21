import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";
import { listExportSnapshotsForPeriod } from "@/lib/vsme/exportSnapshotVersioning";

/** Version history of immutable export snapshots for a reporting period. */
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

    const history = await listExportSnapshotsForPeriod(reportingPeriodId);

    return apiSuccess({
      reportingPeriodId,
      companyId: data.companyId,
      year: data.year,
      status: data.status,
      ...history,
    });
  });
}
