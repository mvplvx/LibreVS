import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { prisma } from "../../db/prisma";
import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { isVS2026PreviewEnabled } from "./previewAvailability";
import { getVS2026RegulatoryPreview } from "./regulatoryPreview";
import type { ReportingConfigurationDb } from "./reportingConfiguration";

class RollbackSignal extends Error {}

const SOURCE = readFileSync(new URL("./regulatoryPreview.ts", import.meta.url), "utf8");
const PAGE = readFileSync(
  new URL("../../../app/vsme/vs2026/preview/[reportingPeriodId]/page.tsx", import.meta.url),
  "utf8",
);
const CHROME = readFileSync(new URL("../../../components/vsme/LibreVsChrome.tsx", import.meta.url), "utf8");

function forgedRequest(userId: string, organizationId: string): Request {
  return new Request("http://localhost/vsme/vs2026/preview", {
    headers: {
      "x-user-id": userId,
      "x-organization-id": organizationId,
    },
  });
}

function verifiedIdentity(userId: string, organizationId: string) {
  return async (request: Request) => {
    assert.equal(request.headers.get("x-organization-id") === organizationId, false);
    return { userId, organizationId };
  };
}

function unusedDb(): ReportingConfigurationDb {
  return {
    reportingPeriod: {
      findFirst: () => {
        throw new Error("database-secret");
      },
    },
  } as unknown as ReportingConfigurationDb;
}

describe("VS 2026 preview access", () => {
  it("is disabled unless the environment flag is exactly true", () => {
    assert.equal(isVS2026PreviewEnabled({ NODE_ENV: "test" }), false);
    assert.equal(isVS2026PreviewEnabled({ NODE_ENV: "test", VS2026_PREVIEW_ENABLED: "1" }), false);
    assert.equal(isVS2026PreviewEnabled({ NODE_ENV: "test", VS2026_PREVIEW_ENABLED: "true" }), true);
  });

  it("rejects a disabled preview and an unauthenticated request before loading", async () => {
    const load = async () => {
      throw new Error("load-should-not-run");
    };
    const disabled = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("user-1", "org-1"),
      db: unusedDb(),
      isEnabled: () => false,
      load,
    });
    assert.equal(disabled.ok, false);
    if (!disabled.ok) {
      assert.equal(disabled.reason, "PREVIEW_DISABLED");
    }

    const anonymous = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("forged-user", "forged-org"),
      db: unusedDb(),
      isEnabled: () => true,
      load,
    });
    assert.equal(anonymous.ok, false);
    if (!anonymous.ok) {
      assert.equal(anonymous.reason, "UNAUTHENTICATED");
      assert.equal(JSON.stringify(anonymous).includes("librevs-demo-org"), false);
    }
  });

  it("passes the verified organisation to the loader and ignores forged headers", async () => {
    let seenOrganization = "";
    const missing = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("user-1", "forged-org"),
      db: unusedDb(),
      isEnabled: () => true,
      resolveIdentity: verifiedIdentity("user-1", "org-1"),
      load: async (access) => {
        seenOrganization = access.organizationId;
        return { ok: false, reason: "PERIOD_NOT_FOUND", issues: [] };
      },
    });
    assert.equal(seenOrganization, "org-1");
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.equal(missing.reason, "PERIOD_NOT_FOUND");
      assert.equal(missing.message, "Reporting period not found.");
    }

    const invalid = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("user-1", "forged-org"),
      db: unusedDb(),
      isEnabled: () => true,
      resolveIdentity: verifiedIdentity("user-1", "org-1"),
      load: async () => ({
        ok: false,
        reason: "PERSISTED_DATA_INVALID",
        issues: [{ code: "MALFORMED_VALUE", rowId: "row-secret", datapointId: "B3_TOTAL_ENERGY_CONSUMPTION_MWH" }],
      }),
    });
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.equal(invalid.reason, "PERSISTED_DATA_INVALID");
      assert.equal(JSON.stringify(invalid).includes("row-secret"), false);
      assert.equal(invalid.issues[0]?.explanation.includes("does not match"), true);
    }

    const database = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("user-1", "forged-org"),
      db: unusedDb(),
      isEnabled: () => true,
      resolveIdentity: verifiedIdentity("user-1", "org-1"),
      load: async () => {
        throw new Error("database-secret");
      },
    });
    assert.equal(database.ok, false);
    if (!database.ok) {
      assert.equal(database.reason, "DATABASE_FAILURE");
      assert.equal(JSON.stringify(database).includes("database-secret"), false);
    }
  });

  it("evaluates a loaded period without writing", async () => {
    const db = {
      reportingPeriod: {
        findFirst: async () => ({ year: 2026, company: { name: "North mill" } }),
      },
    } as unknown as ReportingConfigurationDb;
    const result = await getVS2026RegulatoryPreview({
      reportingPeriodId: "period-1",
      request: forgedRequest("user-1", "forged-org"),
      resolveIdentity: verifiedIdentity("user-1", "org-1"),
      db,
      isEnabled: () => true,
      load: async () => ({
        ok: true,
        reportingPeriodId: "period-1",
        loaded: {
          input: {
            configuration: {
              status: "CONFIGURED",
              reportingOption: "OPTION_A",
              additionalComprehensiveDisclosures: [],
            },
            employeeSize: {
              status: "MEASURED",
              reportingPeriodId: "period-1",
              employeeMeasure: 8,
              measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
            },
            facts: [
              {
                datapointId: "B2_HAS_PRACTICES",
                presence: { kind: "PRESENT", literal: { kind: "BOOLEAN", value: false } },
              },
            ],
            repeatingRows: [],
            omissions: [],
          },
          rows: [],
          excludedFieldIds: [VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE],
        },
      }),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.year, 2026);
      assert.equal(result.companyName, "North mill");
      assert.equal(result.view.employeeCategoryLabel, "10 employees or fewer");
      assert.equal(result.view.reportingOptionLabel, "Option A — Basic Module");
      assert.equal(
        result.view.diagnostics.some((item) => item.includes(VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE)),
        false,
      );
    }
  });

  it("does not write and does not join the legacy reporting engines", () => {
    assert.equal(SOURCE.includes(".create("), false);
    assert.equal(SOURCE.includes(".update("), false);
    assert.equal(SOURCE.includes(".delete("), false);
    assert.equal(SOURCE.includes(".upsert("), false);
    assert.equal(SOURCE.includes("moduleScope"), false);
    assert.equal(SOURCE.includes("materiality"), false);
    assert.equal(SOURCE.includes("completeness"), false);
    assert.equal(SOURCE.includes("employeeCount"), false);
    assert.equal(SOURCE.includes("x-user-id"), false);
    assert.equal(SOURCE.includes("x-organization-id"), false);
    assert.equal(SOURCE.includes("getUser"), false);
    assert.equal(PAGE.includes("x-user-id"), false);
    assert.equal(PAGE.includes("x-organization-id"), false);
    assert.equal(PAGE.includes("use client"), false);
    assert.equal(PAGE.includes("force-dynamic"), true);
    assert.equal(PAGE.includes("getVS2026RegulatoryPreview"), true);
    assert.equal(PAGE.includes("searchParams"), false);
    assert.equal(CHROME.includes("/vsme/vs2026"), false);
  });
});

describe("VS 2026 preview database access", () => {
  it("shows one organisation's period and leaves stored data unchanged", async () => {
    const beforePeriods = await prisma.reportingPeriod.count();
    const beforeDatapoints = await prisma.sustainabilityDataPoint.count();
    const beforeRows = await prisma.vs2026RepeatingRow.count();

    try {
      await prisma.$transaction(async (tx) => {
        const company = await tx.company.findFirst({
          where: { organizationId: { not: null } },
        });
        assert.ok(company?.organizationId);
        const organizationId = company.organizationId;
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
        await tx.sustainabilityDataPoint.createMany({
          data: [
            {
              reportingPeriodId: period.id,
              fieldId: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
              value: "8",
            },
            { reportingPeriodId: period.id, fieldId: "B1_TURNOVER", value: "0" },
            { reportingPeriodId: period.id, fieldId: "B2_HAS_PRACTICES", value: "false" },
          ],
        });
        const site = await tx.vs2026RepeatingRow.create({
          data: { reportingPeriodId: period.id, groupId: "B1_SITE", position: 0 },
        });
        await tx.vs2026RepeatingValue.create({
          data: { rowId: site.id, datapointId: "B1_SITE_IDENTIFIER", value: "Mill" },
        });
        await tx.vs2026RepeatingRow.create({
          data: {
            reportingPeriodId: period.id,
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
              ],
            },
          },
        });

        const result = await getVS2026RegulatoryPreview({
          reportingPeriodId: period.id,
          request: forgedRequest("forged-user", "forged-org"),
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => ({ userId: "preview-user", organizationId }),
        });
        assert.equal(result.ok, true);
        if (result.ok) {
          assert.equal(result.year, year);
          assert.equal(result.view.reportingOptionLabel, "Option A — Basic Module");
          assert.equal(result.view.employeeCategoryLabel, "10 employees or fewer");
          assert.equal(result.view.additionalComprehensive[0]?.disclosureId, "C5");
          assert.equal(result.view.summary.reportedZero > 0, true);
          assert.equal(result.view.summary.reportedFalse > 0, true);
          const renewable = result.view.disclosures
            .flatMap((item) => item.datapoints)
            .find(
              (item) =>
                item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" &&
                item.dimensionMember === "Renewable energy",
            );
          assert.equal(renewable?.recordedValue, "10");
          assert.equal(renewable?.recordedUnit, "MWh");
          assert.equal(result.view.repeatingRows.some((row) => row.parentLabel === null && row.rowId === site.id), true);
        }

        const otherOrganization = await tx.organization.create({
          data: { name: "vs04-other-organization" },
        });
        const foreign = await getVS2026RegulatoryPreview({
          reportingPeriodId: period.id,
          request: forgedRequest("forged-user", organizationId),
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => ({
            userId: "other-user",
            organizationId: otherOrganization.id,
          }),
        });
        const guessed = await getVS2026RegulatoryPreview({
          reportingPeriodId: "guessed-period",
          request: forgedRequest("forged-user", "forged-org"),
          db: tx,
          isEnabled: () => true,
          resolveIdentity: async () => ({ userId: "preview-user", organizationId }),
        });
        assert.equal(foreign.ok, false);
        assert.equal(guessed.ok, false);
        if (!foreign.ok && !guessed.ok) {
          assert.equal(foreign.reason, "PERIOD_NOT_FOUND");
          assert.equal(guessed.reason, "PERIOD_NOT_FOUND");
          assert.equal(foreign.message, guessed.message);
          assert.equal(JSON.stringify(foreign).includes("Mill"), false);
          assert.equal(JSON.stringify(guessed).includes(period.id), false);
        }

        throw new RollbackSignal();
      });
      assert.fail("the preview transaction committed");
    } catch (error) {
      if (!(error instanceof RollbackSignal)) {
        throw error;
      }
    }

    assert.equal(await prisma.reportingPeriod.count(), beforePeriods);
    assert.equal(await prisma.sustainabilityDataPoint.count(), beforeDatapoints);
    assert.equal(await prisma.vs2026RepeatingRow.count(), beforeRows);
  });
});
