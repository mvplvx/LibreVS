import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { loadPeriodIntelligence } from "@/lib/api/loadPeriodIntelligence";
import { apiError, apiSuccess } from "@/lib/api/response";
import { buildExportRows } from "@/lib/vsme/exportMapping";
import { assertV2Only } from "@/lib/vsme/runtime/dataTruthMode";

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

    const exportPoints = data.vsme.values.map((v) => ({
      fieldId: v.fieldId,
      value: v.value,
      unit: v.unit,
    }));
    assertV2Only(exportPoints, "export");

    const rows = buildExportRows(
      data.employeeCount,
      exportPoints,
      data.materialityByFieldId
    );

    return apiSuccess({
      reportingPeriodId: data.reportingPeriodId,
      year: data.year,
      schemaVersion: data.schemaVersion,
      employeeCount: data.employeeCount,
      exportReady: data.vsme.exportReady,
      validation: data.vsme.exportValidation,
      rows,
    });
  });
}
