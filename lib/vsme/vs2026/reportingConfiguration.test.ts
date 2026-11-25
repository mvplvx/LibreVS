import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  getReportingConfiguration,
  saveReportingConfiguration,
  type ReportingConfigurationDb,
} from "./reportingConfiguration";

type FakePeriod = {
  id: string;
  organizationId: string;
  companyId: string;
  employeeCount: number;
  option: string | null;
  additional: string[];
  datapoints: { fieldId: string; value: string }[];
};

function fakeDb(periods: FakePeriod[]): ReportingConfigurationDb {
  return {
    reportingPeriod: {
      async findFirst(args) {
        if (!args?.where) {
          return null;
        }
        const where = args.where as {
          id: string;
          company: { organizationId: string };
        };
        const period = periods.find(
          (row) =>
            row.id === where.id &&
            row.organizationId === where.company.organizationId,
        );
        if (!period) {
          return null;
        }
        return {
          vs2026ReportingOption: period.option,
          vs2026AdditionalComprehensiveDisclosures: [...period.additional],
        };
      },
      async updateMany(args) {
        const where = args.where as {
          id: string;
          company: { organizationId: string };
        };
        const data = args.data as {
          vs2026ReportingOption: string;
          vs2026AdditionalComprehensiveDisclosures: string[];
        };
        const period = periods.find(
          (row) =>
            row.id === where.id &&
            row.organizationId === where.company.organizationId,
        );
        if (!period) {
          return { count: 0 };
        }
        period.option = data.vs2026ReportingOption;
        period.additional = [...data.vs2026AdditionalComprehensiveDisclosures];
        return { count: 1 };
      },
    },
  } as ReportingConfigurationDb;
}

function period(
  id: string,
  organizationId = "org-1",
  companyId = "company-1",
): FakePeriod {
  return {
    id,
    organizationId,
    companyId,
    employeeCount: 650,
    option: null,
    additional: [],
    datapoints: [{ fieldId: "B3_EXAMPLE", value: "12" }],
  };
}

const org = "org-1";

describe("reporting configuration persistence", () => {
  it("keeps each reporting period on its own option", async () => {
    const periods = [period("period-a"), period("period-b")];
    const db = fakeDb(periods);
    const savedA = await saveReportingConfiguration(
      { reportingPeriodId: "period-a", organizationId: org },
      { reportingOption: "OPTION_A" },
      db,
    );
    const savedB = await saveReportingConfiguration(
      { reportingPeriodId: "period-b", organizationId: org },
      { reportingOption: "OPTION_B" },
      db,
    );
    assert.equal(savedA.ok && savedA.configuration.status, "CONFIGURED");
    assert.equal(
      savedA.ok &&
        savedA.configuration.status === "CONFIGURED" &&
        savedA.configuration.reportingOption,
      "OPTION_A",
    );
    assert.equal(
      savedB.ok &&
        savedB.configuration.status === "CONFIGURED" &&
        savedB.configuration.reportingOption,
      "OPTION_B",
    );

    const readA = await getReportingConfiguration(
      { reportingPeriodId: "period-a", organizationId: org },
      db,
    );
    assert.equal(
      readA.ok &&
        readA.configuration.status === "CONFIGURED" &&
        readA.configuration.reportingOption,
      "OPTION_A",
    );
    assert.equal(periods[0].option, "OPTION_A");
    assert.equal(periods[1].option, "OPTION_B");
    assert.deepEqual(periods[0].datapoints, [{ fieldId: "B3_EXAMPLE", value: "12" }]);
    assert.equal(periods[0].employeeCount, 650);
    assert.equal(periods[1].employeeCount, 650);
  });

  it("stores selected Comprehensive disclosures only for Option A", async () => {
    const periods = [period("period-a")];
    const db = fakeDb(periods);
    const saved = await saveReportingConfiguration(
      { reportingPeriodId: "period-a", organizationId: org },
      {
        reportingOption: "OPTION_A",
        additionalComprehensiveDisclosures: ["C3", "C8"],
      },
      db,
    );
    assert.equal(saved.ok, true);
    if (saved.ok && saved.configuration.status === "CONFIGURED") {
      assert.deepEqual(saved.configuration.additionalComprehensiveDisclosures, [
        "C3",
        "C8",
      ]);
    }
    assert.deepEqual(periods[0].additional, ["C3", "C8"]);

    const rejectedCases = [
      {
        input: {
          reportingOption: "OPTION_B",
          additionalComprehensiveDisclosures: ["C1"],
        },
        reason: "ADDITIONAL_DISCLOSURE_NOT_ALLOWED_FOR_OPTION_B",
      },
      {
        input: {
          reportingOption: "OPTION_A",
          additionalComprehensiveDisclosures: ["C1", "C1"],
        },
        reason: "DUPLICATE_DISCLOSURE",
      },
      {
        input: {
          reportingOption: "OPTION_A",
          additionalComprehensiveDisclosures: ["C99"],
        },
        reason: "UNKNOWN_DISCLOSURE",
      },
      {
        input: {
          reportingOption: "OPTION_A",
          additionalComprehensiveDisclosures: ["B3"],
        },
        reason: "BASIC_DISCLOSURE_NOT_ADDITIONAL",
      },
      { input: { reportingOption: "OPTION_C" }, reason: "UNKNOWN_REPORTING_OPTION" },
      {
        input: {
          reportingOption: "OPTION_A",
          additionalComprehensiveDisclosures: "C1",
        },
        reason: "MALFORMED_CONFIGURATION",
      },
    ] as const;
    for (const item of rejectedCases) {
      const additional = [...periods[0].additional];
      const rejected = await saveReportingConfiguration(
        { reportingPeriodId: "period-a", organizationId: org },
        item.input,
        db,
      );
      assert.deepEqual(rejected, { ok: false, reason: item.reason });
      assert.deepEqual(periods[0].additional, additional);
      assert.equal(periods[0].option, "OPTION_A");
    }
  });

  it("leaves an unconfigured period unconfigured", async () => {
    const db = fakeDb([period("period-new")]);
    const read = await getReportingConfiguration(
      { reportingPeriodId: "period-new", organizationId: org },
      db,
    );
    assert.deepEqual(read, {
      ok: true,
      configuration: {
        status: "NOT_CONFIGURED",
        reportingPeriodId: "period-new",
      },
    });
  });

  it("updates the option without discarding stored datapoints and accepts an identical save", async () => {
    const periods = [period("period-a")];
    const db = fakeDb(periods);
    const access = { reportingPeriodId: "period-a", organizationId: org };
    await saveReportingConfiguration(
      access,
      { reportingOption: "OPTION_A", additionalComprehensiveDisclosures: ["C5"] },
      db,
    );
    const updated = await saveReportingConfiguration(
      access,
      { reportingOption: "OPTION_B" },
      db,
    );
    const repeated = await saveReportingConfiguration(
      access,
      { reportingOption: "OPTION_B" },
      db,
    );
    assert.deepEqual(updated, repeated);
    assert.equal(periods[0].option, "OPTION_B");
    assert.deepEqual(periods[0].additional, []);
    assert.deepEqual(periods[0].datapoints, [{ fieldId: "B3_EXAMPLE", value: "12" }]);
  });

  it("rejects a missing period and a period outside the organization", async () => {
    const periods = [period("period-a", "org-1", "company-1")];
    const db = fakeDb(periods);
    const missing = await saveReportingConfiguration(
      { reportingPeriodId: "missing", organizationId: org },
      { reportingOption: "OPTION_A" },
      db,
    );
    const otherOrg = await getReportingConfiguration(
      { reportingPeriodId: "period-a", organizationId: "org-2" },
      db,
    );
    assert.deepEqual(missing, { ok: false, reason: "PERIOD_NOT_FOUND" });
    assert.deepEqual(otherOrg, { ok: false, reason: "PERIOD_NOT_FOUND" });
    assert.equal(periods[0].option, null);
  });

  it("reports a stored value that is not a valid selection", async () => {
    const periods = [period("period-a")];
    periods[0].option = "OPTION_B";
    periods[0].additional = ["C1"];
    const read = await getReportingConfiguration(
      { reportingPeriodId: "period-a", organizationId: org },
      fakeDb(periods),
    );
    assert.deepEqual(read, {
      ok: false,
      reason: "STORED_CONFIGURATION_INVALID",
    });
  });

  it("does not consult an employee figure", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./reportingConfiguration.ts", import.meta.url)),
      "utf8",
    );
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("500"), false);
  });
});
