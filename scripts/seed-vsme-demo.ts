/**
 * Minimal VSME demo seed — one company, one reporting period, optional sample v2 data.
 * Used by prisma/seed.ts for local onboarding.
 */
import type { PrismaClient } from "@prisma/client";
import { VSME_FIELD_IDS } from "../lib/vsme/vsme.fieldRegistry";
import { VSME_SCHEMA_VERSION } from "../lib/vsme/schemaVersion";

export const DEMO_ORGANIZATION_ID = "librevs-demo-org";
export const DEMO_COMPANY_ID = "librevs-demo-company";
export const DEMO_PERIOD_ID = "librevs-demo-period-2025";

const SAMPLE_VALUES: Record<string, { value: string; unit?: string }> = {
  B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY: { value: "true" },
  B1_REPORTING_SCOPE_REPORTING_INDIVIDUAL: { value: "true" },
  B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH: { value: "840", unit: "MWh" },
  B8_GENDER_EMPLOYEES_MALE: { value: "48" },
};

const MATERIAL_FIELD_IDS = Object.keys(SAMPLE_VALUES);

export type SeedVsmeDemoOptions = {
  organizationId?: string;
  includeSampleData?: boolean;
};

export async function seedVsmeDemo(
  prisma: PrismaClient,
  options: SeedVsmeDemoOptions = {}
): Promise<{
  companyId: string;
  reportingPeriodId: string;
}> {
  const organizationId = options.organizationId ?? DEMO_ORGANIZATION_ID;
  const includeSampleData = options.includeSampleData !== false;

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
      organizationId: org.id,
    },
    create: {
      id: DEMO_COMPANY_ID,
      name: "LibreVS Demo Company",
      employeeCount: 120,
      country: "SE",
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

  if (includeSampleData) {
    for (const fieldId of MATERIAL_FIELD_IDS) {
      const sample = SAMPLE_VALUES[fieldId];
      if (!sample) {
        continue;
      }
      await prisma.sustainabilityDataPoint.upsert({
        where: {
          reportingPeriodId_fieldId: {
            reportingPeriodId: period.id,
            fieldId,
          },
        },
        update: { value: sample.value, unit: sample.unit ?? null },
        create: {
          reportingPeriodId: period.id,
          fieldId,
          value: sample.value,
          unit: sample.unit ?? null,
        },
      });
      await prisma.vsmeFieldMateriality.upsert({
        where: {
          reportingPeriodId_fieldId: {
            reportingPeriodId: period.id,
            fieldId,
          },
        },
        update: { materiality: "material" },
        create: {
          reportingPeriodId: period.id,
          fieldId,
          materiality: "material",
        },
      });
    }

    const extra = VSME_FIELD_IDS.filter(
      (id) => !MATERIAL_FIELD_IDS.includes(id)
    ).slice(0, 2);
    for (const fieldId of extra) {
      await prisma.sustainabilityDataPoint.upsert({
        where: {
          reportingPeriodId_fieldId: {
            reportingPeriodId: period.id,
            fieldId,
          },
        },
        update: { value: "1", unit: null },
        create: {
          reportingPeriodId: period.id,
          fieldId,
          value: "1",
          unit: null,
        },
      });
    }
  }

  console.log("VSME demo seed:");
  console.log(`  company: ${company.name} (${company.id})`);
  console.log(`  period: ${period.year} (${period.id})`);
  console.log(
    includeSampleData
      ? `  sample v2 datapoints: ${MATERIAL_FIELD_IDS.length}+`
      : "  sample datapoints: skipped"
  );

  return {
    companyId: company.id,
    reportingPeriodId: period.id,
  };
}
