import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  NO_DIMENSION_MEMBER,
  normalizeDimensionMember,
  registryDatapoint,
  repeatingStorageGroupId,
  siteReferencingGroupIds,
  validateRepeatingCell,
  validateRepeatingParent,
} from "./repeatingIntegrity";

const SCHEMA = readFileSync(new URL("../../../prisma/schema.prisma", import.meta.url), "utf8");
const MIGRATION = readFileSync(
  new URL(
    "../../../prisma/migrations/20261125160000_vs2026_repeating_data/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("VS 2026 repeating storage rules", () => {
  it("uses the B1 site row as the only parent for biodiversity and water stress", () => {
    assert.deepEqual(siteReferencingGroupIds(), [
      "B5_SITE_ASSESSMENT",
      "B5_SITE_BSA_RELATIONSHIP",
      "B6_WATER_STRESS_SITE",
    ]);

    const site = {
      id: "site-1",
      groupId: "B1_SITE",
      reportingPeriodId: "period-1",
    };
    assert.deepEqual(
      validateRepeatingParent({
        groupId: "B5_SITE_BSA_RELATIONSHIP",
        reportingPeriodId: "period-1",
        parent: site,
      }),
      { ok: true },
    );
    assert.deepEqual(
      validateRepeatingParent({
        groupId: "B6_WATER_STRESS_SITE",
        reportingPeriodId: "period-1",
        parent: site,
      }),
      { ok: true },
    );
    assert.equal(
      validateRepeatingParent({
        groupId: "B5_SITE_BSA_RELATIONSHIP",
        reportingPeriodId: "period-1",
        parent: null,
      }).ok,
      false,
    );
    assert.deepEqual(
      validateRepeatingParent({
        groupId: "B6_WATER_STRESS_SITE",
        reportingPeriodId: "period-2",
        parent: site,
      }),
      { ok: false, reason: "PARENT_PERIOD_MISMATCH" },
    );
    assert.deepEqual(
      validateRepeatingParent({
        groupId: "B5_SITE_ASSESSMENT",
        reportingPeriodId: "period-1",
        parent: { ...site, groupId: "B1_SUBSIDIARY" },
      }),
      { ok: false, reason: "PARENT_NOT_SITE" },
    );
    assert.deepEqual(
      validateRepeatingParent({
        groupId: "B7_MATERIAL",
        reportingPeriodId: "period-1",
        parent: site,
      }),
      { ok: false, reason: "PARENT_NOT_ALLOWED" },
    );
  });

  it("keeps an open list for Scope 3 categories and paragraph 22 references", () => {
    const categories = registryDatapoint("B3_SCOPE3_SIGNIFICANT_CATEGORIES");
    const omissions = registryDatapoint("B1_OMITTED_DISCLOSURES");
    assert.ok(categories);
    assert.ok(omissions);
    assert.equal(categories.repeatingGroupId, undefined);
    assert.equal(repeatingStorageGroupId(categories), "B3_SCOPE3_SIGNIFICANT_CATEGORIES");
    assert.equal(repeatingStorageGroupId(omissions), "B1_OMITTED_DISCLOSURES");
    assert.equal(categories.value.kind, "REPEATING_QUANTITY");
    assert.equal(categories.value.maximum, null);
  });

  it("stores energy origin members on one datapoint without collapsing them", () => {
    const electricity = registryDatapoint("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY");
    assert.ok(electricity);
    assert.equal(repeatingStorageGroupId(electricity), "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY");
    assert.equal(electricity.value.kind, "DIMENSIONED_QUANTITY");
    if (electricity.value.kind !== "DIMENSIONED_QUANTITY") {
      return;
    }
    const origin = electricity.value.axes.find((axis) => axis.id === "ENERGY_ORIGIN");
    assert.deepEqual(origin?.legalMembers, [
      "Renewable energy",
      "Non-renewable energy",
      "Total",
    ]);
    assert.equal(normalizeDimensionMember(" Renewable energy "), "Renewable energy");
    assert.equal(normalizeDimensionMember("   "), NO_DIMENSION_MEMBER);
    assert.equal(normalizeDimensionMember(null), NO_DIMENSION_MEMBER);
  });

  it("rejects a scalar datapoint and a cell stored on the wrong group", () => {
    assert.deepEqual(
      validateRepeatingCell({
        rowGroupId: "B1_SITE",
        datapointId: "B1_SITE_IDENTIFIER",
      }),
      { ok: true },
    );
    assert.deepEqual(
      validateRepeatingCell({
        rowGroupId: "B1_SITE",
        datapointId: "B1_TURNOVER",
      }),
      { ok: false, reason: "SCALAR_DATAPOINT" },
    );
    assert.deepEqual(
      validateRepeatingCell({
        rowGroupId: "B1_SITE",
        datapointId: "B4_EMISSION_TO_AIR",
      }),
      { ok: false, reason: "GROUP_MISMATCH" },
    );
    assert.equal(
      validateRepeatingCell({
        rowGroupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
        datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
      }).ok,
      true,
    );
  });

  it("keeps pollutant media as separate datapoints inside the pollutant group", () => {
    for (const datapointId of [
      "B4_POLLUTANT_IDENTITY",
      "B4_EMISSION_TO_AIR",
      "B4_EMISSION_TO_WATER",
      "B4_EMISSION_TO_SOIL",
    ]) {
      const datapoint = registryDatapoint(datapointId);
      assert.ok(datapoint);
      assert.equal(repeatingStorageGroupId(datapoint), "B4_POLLUTANT");
    }
  });
});

describe("VS 2026 repeating migration artifact", () => {
  it("adds the two tables without rewriting existing sustainability data", () => {
    assert.equal(MIGRATION.includes("DROP TABLE"), false);
    assert.equal(MIGRATION.includes("DELETE FROM"), false);
    assert.equal(MIGRATION.includes("TRUNCATE"), false);
    assert.equal(MIGRATION.includes('ALTER TABLE "SustainabilityDataPoint"'), false);
    assert.equal(MIGRATION.includes('ALTER TABLE "ReportingPeriod"'), false);
    assert.equal(MIGRATION.includes('CREATE TABLE "Vs2026RepeatingRow"'), true);
    assert.equal(MIGRATION.includes('CREATE TABLE "Vs2026RepeatingValue"'), true);
    assert.equal(
      MIGRATION.includes(
        'CREATE UNIQUE INDEX "Vs2026RepeatingValue_rowId_datapointId_dimensionMember_key"',
      ),
      true,
    );
    assert.equal(MIGRATION.includes(`"dimensionMember" TEXT NOT NULL DEFAULT ''`), true);
    assert.equal(MIGRATION.includes('ON DELETE CASCADE'), true);
    assert.equal(
      MIGRATION.includes(
        'FOREIGN KEY ("parentRowId", "reportingPeriodId") REFERENCES "Vs2026RepeatingRow"("id", "reportingPeriodId")',
      ),
      true,
    );
    assert.equal(MIGRATION.includes("ON DELETE NO ACTION"), true);
    assert.equal(
      MIGRATION.includes('CREATE UNIQUE INDEX "Vs2026RepeatingRow_id_reportingPeriodId_key"'),
      true,
    );
    assert.equal(MIGRATION.includes('FOREIGN KEY ("parentRowId") REFERENCES'), false);
    assert.equal(SCHEMA.includes("model Vs2026RepeatingRow"), true);
    assert.equal(SCHEMA.includes("model Vs2026RepeatingValue"), true);
    assert.equal(SCHEMA.includes("fields: [parentRowId, reportingPeriodId]"), true);
    assert.equal(SCHEMA.includes("references: [id, reportingPeriodId]"), true);
    assert.equal(SCHEMA.includes("onDelete: NoAction"), true);
    assert.equal(SCHEMA.includes("@@unique([id, reportingPeriodId])"), true);
    assert.equal(SCHEMA.includes("@@unique([rowId, datapointId, dimensionMember])"), true);
  });
});
