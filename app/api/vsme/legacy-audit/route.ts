import { prisma } from "@/lib/db/prisma";
import { withApiHandler } from "@/lib/api/handler";
import { apiError, apiSuccess } from "@/lib/api/response";
import { buildLegacyDataSummary } from "@/lib/vsme/migration/dataPointMigration";
import { isLegacyStoredRow } from "@/lib/vsme/runtime/dataTruthMode";

const SAMPLE_LIMIT = 20;

/**
 * Debug/audit only — legacy datapoints from storage.
 * Must not be used by KPI, dashboard, export, or coverage logic.
 */
export async function GET(req: Request) {
  return withApiHandler(async () => {
    const reportingPeriodId = new URL(req.url).searchParams
      .get("reportingPeriodId")
      ?.trim();

    const rows = await prisma.sustainabilityDataPoint.findMany({
      where: reportingPeriodId ? { reportingPeriodId } : undefined,
      orderBy: [{ fieldId: "asc" }],
      select: {
        fieldId: true,
        legacyFieldId: true,
        migratedFieldId: true,
        migrationStatus: true,
        reportingPeriodId: true,
      },
    });

    if (reportingPeriodId && rows.length === 0) {
      const period = await prisma.reportingPeriod.findUnique({
        where: { id: reportingPeriodId },
        select: { id: true },
      });
      if (!period) {
        return apiError("Reporting period not found", 404);
      }
    }

    const legacyRows = rows.filter(isLegacyStoredRow);
    const summary = buildLegacyDataSummary(legacyRows);
    const sampleLegacyFieldIds = [
      ...new Set(legacyRows.map((r) => r.legacyFieldId ?? r.fieldId)),
    ]
      .sort()
      .slice(0, SAMPLE_LIMIT);

    return apiSuccess({
      dataTruthMode: "STRICT_V2",
      reportingPeriodId: reportingPeriodId ?? null,
      ...summary,
      sampleLegacyFieldIds,
      totalRowsScanned: rows.length,
    });
  });
}
