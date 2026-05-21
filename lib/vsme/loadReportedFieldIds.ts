import { prisma } from "@/lib/db/prisma";
import { filterLegacyDataPoints } from "./runtime/dataTruthMode";

/** Field IDs with non-empty v2 values for a reporting period (UI schema visibility). */
export async function loadReportedFieldIds(
  reportingPeriodId: string
): Promise<Set<string>> {
  const dataPoints = await prisma.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
    select: {
      fieldId: true,
      value: true,
      legacyFieldId: true,
      migrationStatus: true,
    },
  });

  const v2Rows = filterLegacyDataPoints(dataPoints);
  const reported = new Set<string>();
  for (const row of v2Rows) {
    if (row.value.trim().length > 0) {
      reported.add(row.fieldId);
    }
  }
  return reported;
}
