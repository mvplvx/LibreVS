import { prisma } from "@/lib/db/prisma";
import { loadMaterialityForPeriod } from "@/lib/vsme/loadMateriality";
import { buildVsmePeriodSnapshot } from "@/lib/vsme/periodSnapshot";
import {
  assertV2Only,
  filterLegacyDataPoints,
} from "@/lib/vsme/runtime/dataTruthMode";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import { guardRequiredToFillAlignment } from "@/lib/vsme/dev/contractGuard";

export async function loadPeriodIntelligence(
  reportingPeriodId: string,
  organizationId: string
) {
  const period = await prisma.reportingPeriod.findFirst({
    where: {
      id: reportingPeriodId,
      company: { organizationId },
    },
    include: { company: { select: { employeeCount: true } } },
  });

  if (!period) {
    return null;
  }

  const employeeCount = period.company.employeeCount ?? 0;
  const materialityByFieldId = await loadMaterialityForPeriod(reportingPeriodId);

  const dataPoints = await prisma.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
    orderBy: [{ fieldId: "asc" }],
  });

  const stored = dataPoints.map((dp) => ({
    fieldId: dp.fieldId,
    value: dp.value,
    unit: dp.unit,
    createdAt: dp.createdAt,
    legacyFieldId: dp.legacyFieldId,
    migratedFieldId: dp.migratedFieldId,
    migrationStatus: dp.migrationStatus,
  }));

  assertV2Only(stored, "loadPeriodIntelligence");
  const v2Only = filterLegacyDataPoints(stored);
  /** Snapshot includes `completeness` sets (inScope/material/required/completed + derived gaps). */
  const exportGenerated = period.status === "exported";
  const vsme = buildVsmePeriodSnapshot(
    v2Only,
    employeeCount,
    materialityByFieldId,
    { exportGenerated }
  );

  const result = {
    reportingPeriodId: period.id,
    year: period.year,
    status: period.status,
    companyId: period.companyId,
    schemaVersion: VSME_SCHEMA_VERSION,
    employeeCount,
    materialityByFieldId,
    vsme,
    totalDataPoints: v2Only.length,
  };

  guardRequiredToFillAlignment(vsme, employeeCount, materialityByFieldId);

  return result;
}
