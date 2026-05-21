import { getUser } from "@/lib/auth";
import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getExportSnapshotById } from "@/lib/vsme/exportSnapshotVersioning";

/** Full immutable export snapshot (audit read-only). */
export async function GET(
  req: Request,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; snapshotId: string }>
      | { id: string; snapshotId: string };
  }
) {
  return withApiHandler(async () => {
    const { organizationId } = getUser(req);
    const resolved = await params;
    const reportingPeriodId = resolved.id?.trim();
    const snapshotId = resolved.snapshotId?.trim();

    if (!reportingPeriodId || !snapshotId) {
      return apiError("Reporting period id and snapshot id are required", 400);
    }

    const snapshot = await getExportSnapshotById(snapshotId, organizationId);
    if (!snapshot || snapshot.reportingPeriodId !== reportingPeriodId) {
      return apiError("Export snapshot not found", 404);
    }

    return apiSuccess({
      id: snapshot.id,
      reportingPeriodId: snapshot.reportingPeriodId,
      companyId: snapshot.companyId,
      version: snapshot.version,
      createdAt: snapshot.createdAt.toISOString(),
      isFinal: snapshot.isFinal,
      reportingState: snapshot.reportingState,
      coverage: snapshot.coverage,
      stateSnapshot: snapshot.stateSnapshot,
      exportData: snapshot.exportData,
      validationResult: snapshot.validationResult,
    });
  });
}
