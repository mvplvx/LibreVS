/**
 * Demo company and an unconfigured reporting period.
 * Sample legacy datapoints are not written. Existing rows are left in place.
 */
import type { PrismaClient } from "@prisma/client";
import { VSME_SCHEMA_VERSION } from "../lib/vsme/schemaVersion";

export const DEMO_ORGANIZATION_ID = "librevs-demo-org";
export const DEMO_COMPANY_ID = "librevs-demo-company";
export const DEMO_PERIOD_ID = "librevs-demo-period-2025";

export type SeedVsmeDemoOptions = {
  organizationId?: string;
};

export async function seedVsmeDemo(
  prisma: PrismaClient,
  options: SeedVsmeDemoOptions = {}
): Promise<{
  companyId: string;
  reportingPeriodId: string;
}> {
  const organizationId = options.organizationId ?? DEMO_ORGANIZATION_ID;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  if (!org) {
    throw new Error(
      `Organization ${organizationId} not found — run base seed first`
    );
  }

  const company = await prisma.company.upsert({
    where: { id: DEMO_COMPANY_ID },
    update: {
      name: "LibreVS Demo Company",
      employeeCount: 120,
      country: "SE",
      currency: "SEK",
      organizationId: org.id,
    },
    create: {
      id: DEMO_COMPANY_ID,
      name: "LibreVS Demo Company",
      employeeCount: 120,
      country: "SE",
      currency: "SEK",
      organizationId: org.id,
    },
  });

  const period = await prisma.reportingPeriod.upsert({
    where: { id: DEMO_PERIOD_ID },
    update: {
      status: "draft",
      schemaVersion: VSME_SCHEMA_VERSION,
    },
    create: {
      id: DEMO_PERIOD_ID,
      companyId: company.id,
      year: 2025,
      status: "draft",
      schemaVersion: VSME_SCHEMA_VERSION,
    },
  });

  console.log("VS 2026 demo seed:");
  console.log(`  company: ${company.name} (${company.id})`);
  console.log(`  period: ${period.year} (${period.id})`);
  console.log("  reporting option: left unconfigured; existing rows were not rewritten");

  return {
    companyId: company.id,
    reportingPeriodId: period.id,
  };
}
