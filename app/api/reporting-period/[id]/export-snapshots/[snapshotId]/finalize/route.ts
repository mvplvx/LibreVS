import { getUser } from "@/lib/auth";
import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  ExportSnapshotLockedError,
  finalizeExportSnapshot,
} from "@/lib/vsme/exportSnapshotVersioning";

/** Lock snapshot as final; marks period exported and blocks further exports. */
export async function POST(
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
    const { organizationId, userId } = getUser(req);
    const resolved = await params;
    const reportingPeriodId = resolved.id?.trim();
    const snapshotId = resolved.snapshotId?.trim();

    if (!reportingPeriodId || !snapshotId) {
      return apiError("Reporting period id and snapshot id are required", 400);
    }

    try {
      const result = await finalizeExportSnapshot({
        snapshotId,
        organizationId,
        userId,
      });

      if (result.reportingPeriodId !== reportingPeriodId) {
        return apiError("Snapshot does not belong to this reporting period", 400);
      }

      return apiSuccess({
        ...result,
        locked: true,
        message:
          "Export snapshot finalized. Period is locked; no further exports allowed.",
      });
    } catch (error) {
      if (error instanceof ExportSnapshotLockedError) {
        return Response.json(
          {
            success: false,
            error: error.message,
            data: {
              code: error.code,
              finalSnapshotId: error.finalSnapshotId,
              finalVersion: error.finalVersion,
            },
          },
          { status: 409 }
        );
      }
      if (error instanceof Error && error.message === "EXPORT_SNAPSHOT_NOT_FOUND") {
        return apiError("Export snapshot not found", 404);
      }
      throw error;
    }
  });
}
