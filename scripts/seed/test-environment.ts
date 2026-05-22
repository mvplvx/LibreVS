/**
 * Phase 6 — realistic incomplete SME test data for controlled release validation.
 * Usage: npx tsx scripts/seed/test-environment.ts
 */
import { PrismaClient } from "@prisma/client";
import { VSME_FIELD_IDS } from "../../lib/vsme/vsme.fieldRegistry";

const MOCK_ORGANIZATION_ID = "librevs-demo-org";

const prisma = new PrismaClient();

const SAMPLE_VALUES: Record<string, { value: string; unit?: string }> = {
  B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY: { value: "true" },
  B1_REPORTING_SCOPE_REPORTING_INDIVIDUAL: { value: "true" },
  B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH: { value: "1200", unit: "MWh" },
  B8_GENDER_EMPLOYEES_MALE: { value: "72" },
};

const MATERIAL_FIELDS = [
  "B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY",
  "B1_REPORTING_SCOPE_REPORTING_INDIVIDUAL",
  "B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH",
  "B8_GENDER_EMPLOYEES_MALE",
] as const;

const NON_MATERIAL_FIELDS = [
  "B1_SENSITIVE_OMISSIONS_SENSITIVE_DISCLOSURES_OMITTED",
] as const;

function pickExtraFieldIds(count: number, exclude: Set<string>): string[] {
  const pool = VSME_FIELD_IDS.filter((id) => !exclude.has(id));
  return pool.slice(0, count);
}

async function seedPeriodData(
  reportingPeriodId: string,
  employeeCount: number,
  fillLevel: "light" | "medium"
) {
  const exclude = new Set<string>();
  const dataPoints: Array<{
    reportingPeriodId: string;
    fieldId: string;
    value: string;
    unit: string | null;
  }> = [];

  for (const fieldId of MATERIAL_FIELDS) {
    const sample = SAMPLE_VALUES[fieldId];
    if (sample) {
      dataPoints.push({
        reportingPeriodId,
        fieldId,
        value: sample.value,
        unit: sample.unit ?? null,
      });
      exclude.add(fieldId);
    }
  }

  const extraCount = fillLevel === "medium" ? 6 : 2;
  for (const fieldId of pickExtraFieldIds(extraCount, exclude)) {
    dataPoints.push({
      reportingPeriodId,
      fieldId,
      value: "1",
      unit: null,
    });
    exclude.add(fieldId);
  }

  for (const dp of dataPoints) {
    await prisma.sustainabilityDataPoint.upsert({
      where: {
        reportingPeriodId_fieldId: {
          reportingPeriodId: dp.reportingPeriodId,
          fieldId: dp.fieldId,
        },
      },
      update: { value: dp.value, unit: dp.unit },
      create: dp,
    });
  }

  for (const fieldId of MATERIAL_FIELDS) {
    await prisma.vsmeFieldMateriality.upsert({
      where: {
        reportingPeriodId_fieldId: { reportingPeriodId, fieldId },
      },
      update: { materiality: "material" },
      create: {
        reportingPeriodId,
        fieldId,
        materiality: "material",
      },
    });
  }

  for (const fieldId of NON_MATERIAL_FIELDS) {
    await prisma.vsmeFieldMateriality.upsert({
      where: {
        reportingPeriodId_fieldId: { reportingPeriodId, fieldId },
      },
      update: { materiality: "non_material" },
      create: {
        reportingPeriodId,
        fieldId,
        materiality: "non_material",
      },
    });
  }

  if (employeeCount >= 500) {
    const cField = VSME_FIELD_IDS.find((id) => id.startsWith("C1_"));
    if (cField) {
      await prisma.vsmeFieldMateriality.upsert({
        where: {
          reportingPeriodId_fieldId: { reportingPeriodId, fieldId: cField },
        },
        update: { materiality: "material" },
        create: {
          reportingPeriodId,
          fieldId: cField,
          materiality: "material",
        },
      });
    }
  }

  console.log(
    `  period ${reportingPeriodId}: ${dataPoints.length} values, partial materiality (incomplete by design)`
  );
}

async function main(): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: MOCK_ORGANIZATION_ID },
  });
  if (!org) {
    console.error("Run prisma/seed.js first (demo organization missing).");
    process.exit(1);
  }

  const companySmall = await prisma.company.upsert({
    where: { id: "librevs-test-sme-small" },
    update: {
      name: "Nordic SME Pilot (<500)",
      employeeCount: 120,
      organizationId: org.id,
    },
    create: {
      id: "librevs-test-sme-small",
      name: "Nordic SME Pilot (<500)",
      employeeCount: 120,
      country: "SE",
      organizationId: org.id,
    },
  });

  const companyLarge = await prisma.company.upsert({
    where: { id: "librevs-test-sme-large" },
    update: {
      name: "Growth Corp Pilot (≥500)",
      employeeCount: 650,
      organizationId: org.id,
    },
    create: {
      id: "librevs-test-sme-large",
      name: "Growth Corp Pilot (≥500)",
      employeeCount: 650,
      country: "SE",
      organizationId: org.id,
    },
  });

  const periodDefs = [
    { companyId: companySmall.id, year: 2024 },
    { companyId: companySmall.id, year: 2025 },
    { companyId: companyLarge.id, year: 2024 },
    { companyId: companyLarge.id, year: 2025 },
  ];

  for (const def of periodDefs) {
    const period = await prisma.reportingPeriod.upsert({
      where: {
        id: `librevs-test-period-${def.companyId}-${def.year}`,
      },
      update: { status: "draft" },
      create: {
        id: `librevs-test-period-${def.companyId}-${def.year}`,
        companyId: def.companyId,
        year: def.year,
        status: "draft",
        schemaVersion: "2.0.0",
      },
    });

    const employeeCount =
      def.companyId === companyLarge.id ? 650 : 120;
    await seedPeriodData(
      period.id,
      employeeCount,
      def.year === 2024 ? "medium" : "light"
    );
  }

  console.log("Test environment seed complete:");
  console.log(`  ${companySmall.name} (B-module scope)`);
  console.log(`  ${companyLarge.name} (B+C scope)`);
  console.log("  2 reporting periods per company — partial data only");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
