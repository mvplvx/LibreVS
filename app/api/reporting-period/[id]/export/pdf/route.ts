import { getUser } from "@/lib/auth";
import { withApiHandler, resolveRouteId } from "@/lib/api/handler";
import { apiError } from "@/lib/api/response";
import { loadValidatedExportContext } from "@/lib/export/loadValidatedExportContext";
import { writeVsmePdf } from "@/lib/export/pdf/writeVsmePdf";

/** Deterministic VSME PDF summary (strict V2 rows, exportReady required). */
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
    const exportedAt = new Date().toISOString();
    const pdfBytes = await writeVsmePdf({
      companyName: context.companyName,
      reportingPeriodId: context.reportingPeriodId,
      year: context.year,
      schemaVersion: context.schemaVersion,
      exportedAt,
      rows: context.rows,
      exportReady: context.validation.exportReady,
      mandatoryCoveragePercentage: context.mandatoryCoveragePercentage,
      missingRequiredCount: context.missingRequiredCount,
    });

    const filename = `librevs-vsme-${context.year}.pdf`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
