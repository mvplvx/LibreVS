import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import {
  buildCanonicalExportDataset,
  serializeExportDatasetJson,
} from "@/lib/export/exportDataset";
import { loadValidatedExportContext } from "@/lib/export/loadValidatedExportContext";
import { librevsLog } from "@/lib/observability/librevsLog";

/** Canonical JSON export — same row set as XLSX/PDF serialization. */
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

    librevsLog("export.attempted", {
      reportingPeriodId,
      format: "json",
    });

    const result = await loadValidatedExportContext(
      reportingPeriodId,
      organizationId
    );

    if (!result.ok) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const { context } = result;
    const dataset = buildCanonicalExportDataset(
      context.rows,
      context.schemaVersion,
      new Date().toISOString(),
      context.reportingCurrency
    );

    librevsLog("export.success", {
      reportingPeriodId,
      format: "json",
      rowCount: dataset.metadata.rowCount,
      year: context.year,
    });

    return new Response(serializeExportDatasetJson(dataset), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="librevs-vsme-${context.year}.json"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
