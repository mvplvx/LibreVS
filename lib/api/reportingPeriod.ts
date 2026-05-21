import { prisma } from "@/lib/db/prisma";

export async function findReportingPeriodById(id: string) {
  return prisma.reportingPeriod.findUnique({
    where: { id },
  });
}
