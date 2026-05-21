import { prisma } from "@/lib/db/prisma";

export async function findCompanyInOrganization(
  companyId: string,
  organizationId: string
) {
  return prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
}

export async function findReportingPeriodInOrganization(
  reportingPeriodId: string,
  organizationId: string
) {
  return prisma.reportingPeriod.findFirst({
    where: {
      id: reportingPeriodId,
      company: { organizationId },
    },
  });
}
