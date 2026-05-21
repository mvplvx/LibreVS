import { prisma } from "@/lib/db/prisma";

export async function findReportingPeriodById(
  id: string,
  organizationId: string
) {
  return prisma.reportingPeriod.findFirst({
    where: {
      id,
      company: { organizationId },
    },
  });
}
