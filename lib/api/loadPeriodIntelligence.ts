import { prisma } from "@/lib/db/prisma";
import { buildVsmePeriodSnapshot } from "@/lib/vsme/periodSnapshot";

export async function loadPeriodIntelligence(
  reportingPeriodId: string,
  organizationId: string
) {
  const period = await prisma.reportingPeriod.findFirst({
    where: {
      id: reportingPeriodId,
      company: { organizationId },
    },
  });

  if (!period) {
    return null;
  }

  const dataPoints = await prisma.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
    orderBy: [{ fieldId: "asc" }],
  });

  const vsme = buildVsmePeriodSnapshot(
    dataPoints.map((dp) => ({
      fieldId: dp.fieldId,
      value: dp.value,
      unit: dp.unit,
      createdAt: dp.createdAt,
    }))
  );

  return {
    reportingPeriodId: period.id,
    year: period.year,
    status: period.status,
    companyId: period.companyId,
    vsme,
    totalDataPoints: dataPoints.length,
  };
}
