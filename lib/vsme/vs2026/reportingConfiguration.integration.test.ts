import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import {
  getReportingConfiguration,
  saveReportingConfiguration,
} from "./reportingConfiguration";

class RollbackSignal extends Error {}

describe("reporting configuration database", () => {
  it("persists independent period options and leaves datapoints in place", async () => {
    const beforePeriods = await prisma.reportingPeriod.count();
    const beforeDatapoints = await prisma.sustainabilityDataPoint.count();
    const beforeMateriality = await prisma.vsmeFieldMateriality.count();
    const beforeCompanies = await prisma.company.count();

    try {
      await prisma.$transaction(async (tx) => {
        const company = await tx.company.findFirst({
          where: { organizationId: { not: null } },
        });
        assert.ok(company?.organizationId);
        const employeeCount = company.employeeCount;

        const maxYear = await tx.reportingPeriod.aggregate({
          where: { companyId: company.id },
          _max: { year: true },
        });
        const year = (maxYear._max.year ?? 2000) + 1;
        const organizationId = company.organizationId;

        const periodA = await tx.reportingPeriod.create({
          data: {
            year,
            companyId: company.id,
            schemaVersion: "2.0.0",
          },
        });
        const periodB = await tx.reportingPeriod.create({
          data: {
            year: year + 1,
            companyId: company.id,
            schemaVersion: "2.0.0",
          },
        });

        const unconfigured = await getReportingConfiguration(
          { reportingPeriodId: periodA.id, organizationId },
          tx,
        );
        assert.deepEqual(unconfigured, {
          ok: true,
          configuration: {
            status: "NOT_CONFIGURED",
            reportingPeriodId: periodA.id,
          },
        });

        await tx.sustainabilityDataPoint.create({
          data: {
            reportingPeriodId: periodA.id,
            fieldId: "B3_PHASE2C_KEEP",
            value: "keep",
          },
        });

        const savedA = await saveReportingConfiguration(
          { reportingPeriodId: periodA.id, organizationId },
          {
            reportingOption: "OPTION_A",
            additionalComprehensiveDisclosures: ["C5"],
          },
          tx,
        );
        const savedB = await saveReportingConfiguration(
          { reportingPeriodId: periodB.id, organizationId },
          { reportingOption: "OPTION_B" },
          tx,
        );
        assert.equal(savedA.ok, true);
        assert.equal(savedB.ok, true);

        const readA = await getReportingConfiguration(
          { reportingPeriodId: periodA.id, organizationId },
          tx,
        );
        const readB = await getReportingConfiguration(
          { reportingPeriodId: periodB.id, organizationId },
          tx,
        );
        assert.equal(
          readA.ok &&
            readA.configuration.status === "CONFIGURED" &&
            readA.configuration.reportingOption,
          "OPTION_A",
        );
        if (readA.ok && readA.configuration.status === "CONFIGURED") {
          assert.deepEqual(readA.configuration.additionalComprehensiveDisclosures, [
            "C5",
          ]);
        }
        assert.equal(
          readB.ok &&
            readB.configuration.status === "CONFIGURED" &&
            readB.configuration.reportingOption,
          "OPTION_B",
        );

        const kept = await tx.sustainabilityDataPoint.findUnique({
          where: {
            reportingPeriodId_fieldId: {
              reportingPeriodId: periodA.id,
              fieldId: "B3_PHASE2C_KEEP",
            },
          },
        });
        assert.equal(kept?.value, "keep");

        const companyAfter = await tx.company.findUnique({
          where: { id: company.id },
        });
        assert.equal(companyAfter?.employeeCount, employeeCount);

        const outside = await getReportingConfiguration(
          { reportingPeriodId: periodA.id, organizationId: "other-org" },
          tx,
        );
        assert.deepEqual(outside, { ok: false, reason: "PERIOD_NOT_FOUND" });

        throw new RollbackSignal();
      });
      assert.fail("the integration transaction committed");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }

    assert.equal(await prisma.reportingPeriod.count(), beforePeriods);
    assert.equal(await prisma.sustainabilityDataPoint.count(), beforeDatapoints);
    assert.equal(await prisma.vsmeFieldMateriality.count(), beforeMateriality);
    assert.equal(await prisma.company.count(), beforeCompanies);
  });
});
