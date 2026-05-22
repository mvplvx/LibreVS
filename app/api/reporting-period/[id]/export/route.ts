import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  buildExportRows,
  validateExportCompleteness,
} from "@/lib/vsme/exportMapping";
import {
  buildExportSnapshotPayloads,
  createImmutableExportSnapshot,
  ExportSnapshotLockedError,
  getLatestExportSnapshot,
} from "@/lib/vsme/exportSnapshotVersioning";
import { assertSystemReadyForExport } from "@/lib/vsme/release/readinessCheck";
import { pilotTelemetryLog } from "@/lib/vsme/release/pilotMode";
import {
  buildEfragExportSnapshot,
  validateEfragExport,
} from "@/lib/vsme/validateEfragExport";
import { librevsLog } from "@/lib/observability/librevsLog";

/** EFRAG VSME export rows + validation; persists immutable versioned snapshot. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  return withApiHandler(async () => {
    const { organizationId, userId } = getUser(req);
    const reportingPeriodId = await resolveRouteId(params);

    if (!reportingPeriodId) {
      return apiError("Reporting period id is required", 400);
    }

    try {
      const data = await loadPeriodIntelligence(
        reportingPeriodId,
        organizationId
      );
      if (!data) {
        return apiError("Reporting period not found", 404);
      }

      const readinessGate = await assertSystemReadyForExport();
      if (!readinessGate.ok) {
        librevsLog("export.readiness_blocked", {
          reportingPeriodId,
          systemHealth: readinessGate.readiness.systemHealth,
          blockers: readinessGate.readiness.blockers,
        });
        pilotTelemetryLog("export.readiness_blocked", {
          reportingPeriodId,
          systemHealth: readinessGate.readiness.systemHealth,
        });
        return Response.json(
          {
            success: false,
            error: readinessGate.message,
            data: { readiness: readinessGate.readiness },
          },
          { status: 503 }
        );
      }

      const { vsme } = data;
      const reportedIds = vsme.values.map((v) => v.fieldId);
      const validation = validateExportCompleteness(
        data.employeeCount,
        reportedIds,
        data.materialityByFieldId
      );

      if (!validation.exportReady) {
        return Response.json(
          {
            success: false,
            error: "Export blocked: complete required fields before export",
            data: { validation },
          },
          { status: 422 }
        );
      }

      const dataPoints = vsme.values.map((v) => ({
        fieldId: v.fieldId,
        value: v.value,
        unit: v.unit,
      }));
      const rows = buildExportRows(
        data.employeeCount,
        dataPoints,
        data.materialityByFieldId
      );

      const efragSnapshot = buildEfragExportSnapshot({
        employeeCount: data.employeeCount,
        materialityByFieldId: data.materialityByFieldId,
        values: dataPoints,
        requiredFieldIds: vsme.completeness.requiredFieldIds,
      });
      const efragValidation = validateEfragExport(efragSnapshot);

      if (!efragValidation.isValid) {
        return Response.json(
          {
            success: false,
            error: "Export blocked: EFRAG validation failed",
            data: { validation, efragValidation },
          },
          { status: 422 }
        );
      }

      const previous = await getLatestExportSnapshot(reportingPeriodId);
      const payloads = buildExportSnapshotPayloads({
        data,
        rows,
        exportValidation: validation,
        efragValidation,
        readinessSnapshot: {
          exportReady: validation.exportReady,
          missingMandatoryFields:
            vsme.completeness.missingRequiredFields.length,
          systemHealth: readinessGate.readiness.systemHealth,
          capturedAt: new Date().toISOString(),
        },
        userId,
        organizationId,
        previousSnapshotId: previous?.id ?? null,
      });

      const snapshot = await createImmutableExportSnapshot({
        reportingPeriodId: data.reportingPeriodId,
        companyId: data.companyId,
        reportingState: data.reportingState,
        ...payloads,
      });

      return apiSuccess({
        exportReady: validation.exportReady,
        rows,
        validation,
        year: data.year,
        schemaVersion: data.schemaVersion,
        employeeCount: data.employeeCount,
        snapshotId: snapshot.id,
        snapshotVersion: snapshot.version,
        snapshotCreatedAt: snapshot.createdAt.toISOString(),
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
      throw error;
    }
  });
}
