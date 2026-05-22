import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { apiError } from "@/lib/api/response";
import { loadValidatedExportContext } from "@/lib/export/loadValidatedExportContext";
import { writeVsmeWorkbookBuffer } from "@/lib/export/xlsx/writeVsmeWorkbook";
import { librevsLog } from "@/lib/observability/librevsLog";

/** Deterministic VSME XLSX artifact (strict V2 rows, exportReady required). */
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
      format: "xlsx",
    });

    const result = await loadValidatedExportContext(
      reportingPeriodId,
      organizationId
    );

    if (!result.ok) {
      librevsLog("export.failure", {
        reportingPeriodId,
        format: "xlsx",
        reason: result.error,
      });
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const { context } = result;
    const buffer = writeVsmeWorkbookBuffer({
      reportingPeriodId: context.reportingPeriodId,
      rows: context.rows,
      schemaVersion: context.schemaVersion,
    });

    const filename = `librevs-vsme-${context.year}.xlsx`;

    librevsLog("export.success", {
      reportingPeriodId,
      format: "xlsx",
      rowCount: context.rows.length,
      year: context.year,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
