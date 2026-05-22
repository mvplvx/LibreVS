import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";
import { buildExportAudit } from "@/lib/vsme/export/exportAudit";
import {
  buildEfragExportSnapshot,
  validateEfragExport,
} from "@/lib/vsme/validateEfragExport";

/** Read-only export audit — same persisted snapshot as export-validation. */
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
    const audit = buildExportAudit({
      snapshot,
      validation,
      exportReady: vsme.exportReady,
      missingSections: vsme.exportValidation.missingSections,
    });

    return apiSuccess(audit);
  });
}
