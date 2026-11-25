import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";

import { prisma } from "../../db/prisma";
import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { evaluateVS2026ReportingState } from "./evaluation";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";

class RollbackSignal extends Error {}

function isKnownRequest(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

describe("VS 2026 reporting data loader", () => {
  it("loads one organisation's period into an evaluation and hides every other period", async () => {
    const beforePeriods = await prisma.reportingPeriod.count();
    const beforeDatapoints = await prisma.sustainabilityDataPoint.count();
    const beforeCompanies = await prisma.company.count();

    try {
      await prisma.$transaction(async (tx) => {
        const company = await tx.company.findFirst({
          where: { organizationId: { not: null } },
        });
        assert.ok(company?.organizationId);
        const organizationId = company.organizationId;
        await tx.company.update({
          where: { id: company.id },
          data: { employeeCount: 650 },
        });
        const year =
          ((
            await tx.reportingPeriod.aggregate({
              where: { companyId: company.id },
              _max: { year: true },
            })
          )._max.year ?? 2000) + 1;
        const period = await tx.reportingPeriod.create({
          data: {
            year,
            companyId: company.id,
            schemaVersion: "2.0.0",
            vs2026ReportingOption: "OPTION_A",
            vs2026AdditionalComprehensiveDisclosures: ["C5"],
          },
        });
        await tx.sustainabilityDataPoint.create({
          data: { reportingPeriodId: period.id, fieldId: "B1_TURNOVER", value: "0" },
        });
        await tx.sustainabilityDataPoint.create({
          data: {
            reportingPeriodId: period.id,
            fieldId: "B2_HAS_POLICIES",
            value: "false",
          },
        });
        const site = await tx.vs2026RepeatingRow.create({
          data: { reportingPeriodId: period.id, groupId: "B1_SITE", position: 0 },
        });
        await tx.vs2026RepeatingValue.create({
          data: { rowId: site.id, datapointId: "B1_SITE_IDENTIFIER", value: "North" },
        });
        const biodiversity = await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: period.id,
            groupId: "B5_SITE_BSA_RELATIONSHIP",
            parentRowId: site.id,
            position: 0,
          },
        });
        await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: period.id,
            groupId: "B1_OMITTED_DISCLOSURES",
            position: 0,
            values: {
              create: {
                datapointId: "B1_OMITTED_DISCLOSURES",
                dimensionMember: "22(c)",
                value: "B3_GROSS_SCOPE1_TCO2E",
              },
            },
          },
        });

        const otherOrganization = await tx.organization.create({
          data: { name: "vs03-other-organization" },
        });
        const otherCompany = await tx.company.create({
          data: {
            name: "vs03-other-company",
            organizationId: otherOrganization.id,
            employeeCount: 20,
          },
        });
        const otherPeriod = await tx.reportingPeriod.create({
          data: { year, companyId: otherCompany.id, schemaVersion: "2.0.0" },
        });
        const otherSite = await tx.vs2026RepeatingRow.create({
          data: { reportingPeriodId: otherPeriod.id, groupId: "B1_SITE", position: 0 },
        });
        await tx.vs2026RepeatingValue.create({
          data: { rowId: otherSite.id, datapointId: "B1_SITE_IDENTIFIER", value: "Secret" },
        });

        const loaded = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId },
          tx,
        );
        assert.equal(loaded.ok, true);
        if (!loaded.ok) {
          return;
        }
        assert.equal(
          loaded.loaded.rows.some((item) => item.rowId === otherSite.id),
          false,
        );
        assert.equal(JSON.stringify(loaded).includes("Secret"), false);
        const report = evaluateVS2026ReportingState(loaded.loaded.input);
        assert.equal(report.reportingOption, "OPTION_A");
        assert.deepEqual(report.additionalComprehensiveDisclosures, ["C5"]);
        assert.equal(report.employeeCategory, null);
        const turnover = report.datapoints.find((item) => item.datapointId === "B1_TURNOVER");
        const policies = report.datapoints.find((item) => item.datapointId === "B2_HAS_POLICIES");
        assert.equal(turnover?.valueStatus, "REPORTED_ZERO");
        assert.equal(policies?.valueStatus, "REPORTED_FALSE");
        const reference = loaded.loaded.input.repeatingRows?.find(
          (item) => item.rowId === biodiversity.id,
        );
        const siteFact = reference?.cells.find(
          (cell) => cell.datapointId === "B5_RELATIONSHIP_SITE_REFERENCE",
        );
        assert.equal(siteFact?.presence.kind, "PRESENT");
        const omitted = report.datapoints.find(
          (item) => item.datapointId === "B3_GROSS_SCOPE1_TCO2E",
        );
        assert.equal(omitted?.omissionStatus, "UNVERIFIED");
        assert.equal(omitted?.reasons.includes("OMISSION_NOT_REASSESSED"), true);
        assert.equal(omitted?.reasons.includes("CONDITIONS_NOT_ASSESSED"), true);

        const sized = await tx.reportingPeriod.create({
          data: {
            year: year + 1,
            companyId: company.id,
            schemaVersion: "2.0.0",
            vs2026ReportingOption: "OPTION_A",
            vs2026AdditionalComprehensiveDisclosures: [],
          },
        });
        await tx.sustainabilityDataPoint.createMany({
          data: [
            {
              reportingPeriodId: sized.id,
              fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
              value: "8",
            },
            { reportingPeriodId: sized.id, fieldId: "B1_EMPLOYEES", value: "600" },
            {
              reportingPeriodId: sized.id,
              fieldId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
              value: "15",
            },
            {
              reportingPeriodId: sized.id,
              fieldId: "B3_ENERGY_BREAKDOWN_INFORMATION",
              value: "CAN_OBTAIN",
            },
          ],
        });
        const sizedSite = await tx.vs2026RepeatingRow.create({
          data: { reportingPeriodId: sized.id, groupId: "B1_SITE", position: 0 },
        });
        await tx.vs2026RepeatingValue.create({
          data: { rowId: sizedSite.id, datapointId: "B1_SITE_IDENTIFIER", value: "Mill" },
        });
        const water = await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: sized.id,
            groupId: "B6_WATER_STRESS_SITE",
            parentRowId: sizedSite.id,
            position: 0,
          },
        });
        await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: sized.id,
            groupId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
            position: 0,
            values: {
              create: [
                {
                  datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
                  dimensionMember: "Renewable energy",
                  value: "10",
                  unit: "MWh",
                },
                {
                  datapointId: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
                  dimensionMember: "Total",
                  value: "10",
                  unit: "MWh",
                },
              ],
            },
          },
        });
        await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: sized.id,
            groupId: "B3_ENERGY_CONSUMPTION_FROM_FUELS",
            position: 0,
            values: {
              create: [
                {
                  datapointId: "B3_ENERGY_CONSUMPTION_FROM_FUELS",
                  dimensionMember: "Renewable energy",
                  value: "0",
                  unit: "MWh",
                },
                {
                  datapointId: "B3_ENERGY_CONSUMPTION_FROM_FUELS",
                  dimensionMember: "Non-renewable energy",
                  value: "3",
                  unit: "MWh",
                },
              ],
            },
          },
        });

        const isolated = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId },
          tx,
        );
        assert.equal(isolated.ok, true);
        if (isolated.ok) {
          const isolatedReport = evaluateVS2026ReportingState(isolated.loaded.input);
          assert.equal(isolatedReport.employeeCategory, null);
        }
        const sizedLoad = await loadVS2026EvaluationInput(
          { reportingPeriodId: sized.id, organizationId },
          tx,
        );
        assert.equal(sizedLoad.ok, true);
        if (!sizedLoad.ok) {
          return;
        }
        const sizedReport = evaluateVS2026ReportingState(sizedLoad.loaded.input);
        assert.equal(sizedReport.reportingOption, "OPTION_A");
        assert.equal(sizedReport.employeeCategory, "EMPLOYEES_LE_10");
        assert.equal(sizedReport.employeeSizeRejection, null);
        const totalEnergy = sizedReport.datapoints.find(
          (item) => item.datapointId === "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
        );
        assert.equal(totalEnergy?.recordedValue, "15");
        assert.equal(totalEnergy?.employeeSizeTreatment, "VOLUNTARY");
        const renewableElectricity = sizedReport.datapoints.find(
          (item) =>
            item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" &&
            item.dimensionMember === "Renewable energy",
        );
        const missingElectricity = sizedReport.datapoints.find(
          (item) =>
            item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" &&
            item.dimensionMember === "Non-renewable energy",
        );
        const renewableFuels = sizedReport.datapoints.find(
          (item) =>
            item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_FUELS" &&
            item.dimensionMember === "Renewable energy",
        );
        const missingFuelTotal = sizedReport.datapoints.find(
          (item) =>
            item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_FUELS" &&
            item.dimensionMember === "Total",
        );
        assert.equal(renewableElectricity?.recordedValue, "10");
        assert.equal(renewableElectricity?.recordedUnit, "MWh");
        assert.equal(missingElectricity?.valueStatus, "MISSING");
        assert.equal(missingElectricity?.recordedValue, null);
        assert.equal(missingElectricity?.completionStatus, "VOLUNTARY_MISSING");
        assert.equal(renewableFuels?.valueStatus, "REPORTED_ZERO");
        assert.equal(missingFuelTotal?.valueStatus, "MISSING");
        assert.equal(
          sizedReport.ignoredGroupIds.includes("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY"),
          false,
        );
        assert.equal(sizedReport.ignoredGroupIds.includes("B3_ENERGY_CONSUMPTION_FROM_FUELS"), false);
        const waterReference = sizedLoad.loaded.input.repeatingRows?.find(
          (item) => item.rowId === water.id,
        );
        const waterSite = waterReference?.cells.find(
          (cell) => cell.datapointId === "B6_WATER_STRESS_SITE_REFERENCE",
        );
        assert.equal(waterSite?.presence.kind, "PRESENT");
        if (waterSite?.presence.kind === "PRESENT" && waterSite.presence.literal.kind === "SITE_REFERENCE") {
          assert.equal(waterSite.presence.literal.siteRowId, sizedSite.id);
        }

        const foreign = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId: otherOrganization.id },
          tx,
        );
        assert.deepEqual(foreign, { ok: false, reason: "PERIOD_NOT_FOUND", issues: [] });
        const guessed = await loadVS2026EvaluationInput(
          { reportingPeriodId: "guessed-period", organizationId },
          tx,
        );
        assert.deepEqual(guessed, { ok: false, reason: "PERIOD_NOT_FOUND", issues: [] });

        const subsidiary = await tx.vs2026RepeatingRow.create({
          data: { reportingPeriodId: period.id, groupId: "B1_SUBSIDIARY", position: 0 },
        });
        await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: period.id,
            groupId: "B6_WATER_STRESS_SITE",
            parentRowId: subsidiary.id,
            position: 0,
          },
        });
        const invalid = await loadVS2026EvaluationInput(
          { reportingPeriodId: period.id, organizationId },
          tx,
        );
        assert.equal(invalid.ok, false);
        if (!invalid.ok) {
          assert.equal(invalid.reason, "PERSISTED_DATA_INVALID");
          assert.equal(invalid.issues.some((item) => item.code === "PARENT_NOT_SITE"), true);
          assert.equal(JSON.stringify(invalid).includes("Secret"), false);
        }

        await tx.$executeRawUnsafe("SAVEPOINT cross_period_parent");
        try {
          await tx.vs2026RepeatingRow.create({
            data: {
              reportingPeriodId: otherPeriod.id,
              groupId: "B5_SITE_ASSESSMENT",
              parentRowId: site.id,
              position: 0,
            },
          });
          assert.fail("cross-period parent was accepted");
        } catch (error) {
          assert.equal(isKnownRequest(error, "P2003"), true);
          await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT cross_period_parent");
        }
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT cross_period_parent");

        throw new RollbackSignal();
      });
      assert.fail("the loader transaction committed");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }

    assert.equal(await prisma.reportingPeriod.count(), beforePeriods);
    assert.equal(await prisma.sustainabilityDataPoint.count(), beforeDatapoints);
    assert.equal(await prisma.company.count(), beforeCompanies);
    assert.equal(await prisma.vs2026RepeatingRow.count(), 0);
  });

  it("returns a database failure without the thrown detail", async () => {
    const secret = "other-organisation-row-secret";
    const db = {
      $connect() {
        return Promise.resolve();
      },
      async $transaction(): Promise<never> {
        throw new Error(secret);
      },
    };
    const result = await loadVS2026EvaluationInput(
      { reportingPeriodId: "period-1", organizationId: "org-1" },
      db as never,
    );
    assert.deepEqual(result, { ok: false, reason: "DATABASE_FAILURE", issues: [] });
    assert.equal(JSON.stringify(result).includes(secret), false);
  });
});
