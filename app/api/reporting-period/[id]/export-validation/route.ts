import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";
import { buildExportPreview } from "@/lib/vsme/buildExportPreview";
import {
  buildEfragExportSnapshot,
  validateEfragExport,
} from "@/lib/vsme/validateEfragExport";

/** EFRAG export integrity check + preview (does not modify export payload). */
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
    const snapshot = buildEfragExportSnapshot({
      employeeCount: data.employeeCount,
      materialityByFieldId: data.materialityByFieldId,
      values: vsme.values.map((v) => ({
        fieldId: v.fieldId,
        value: v.value,
      })),
      requiredFieldIds: vsme.completeness.requiredFieldIds,
    });

    const validation = validateEfragExport(snapshot);
    const unitsByFieldId: Record<string, string | null> = {};
    for (const row of vsme.values) {
      unitsByFieldId[row.fieldId] = row.unit;
    }
    const preview = buildExportPreview(snapshot, validation, unitsByFieldId);

    return apiSuccess({
      reportingPeriodId: data.reportingPeriodId,
      year: data.year,
      status: data.status,
      reportingState: data.reportingState,
      exportReady: vsme.exportReady,
      validation,
      preview,
    });
  });
}
