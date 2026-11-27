import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { evaluateVS2026ReportingState, type EvaluationInput, type FactInput } from "./evaluation";
import { buildRegulatoryPreviewView } from "./previewPresentation";
import type { LoadedRepeatingRow } from "./reportingDataLoader";

function optionA(additional: readonly string[] = []): EvaluationInput["configuration"] {
  return {
    status: "CONFIGURED",
    reportingOption: "OPTION_A",
    additionalComprehensiveDisclosures: additional,
  };
}

function measured(employeeMeasure: number): EvaluationInput["employeeSize"] {
  return {
    status: "MEASURED",
    reportingPeriodId: "period-1",
    employeeMeasure,
    measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  };
}

function numberFact(datapointId: string, value: number): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "NUMBER", value } },
  };
}

function booleanFact(datapointId: string, value: boolean): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "BOOLEAN", value } },
  };
}

function energyFact(datapointId: string, dimensionMember: string, value: number): FactInput {
  return {
    datapointId,
    dimensionMember,
    unit: "MWh",
    presence: { kind: "PRESENT", literal: { kind: "NUMBER", value } },
  };
}

function viewFor(
  input: EvaluationInput,
  loaded: { rows?: readonly LoadedRepeatingRow[]; excludedFieldIds?: readonly string[] } = {},
) {
  return buildRegulatoryPreviewView(evaluateVS2026ReportingState(input), {
    rows: loaded.rows ?? [],
    excludedFieldIds: loaded.excludedFieldIds ?? [],
  });
}

function disclosure(view: ReturnType<typeof viewFor>, id: string) {
  const found = view.disclosures.find((item) => item.id === id);
  assert.ok(found);
  return found;
}

function datapoint(view: ReturnType<typeof viewFor>, datapointId: string, dimensionMember: string | null = null) {
  for (const section of view.disclosures) {
    const found = section.datapoints.find(
      (item) => item.datapointId === datapointId && item.dimensionMember === dimensionMember,
    );
    if (found) {
      return found;
    }
  }
  assert.fail(datapointId);
}

describe("VS 2026 preview presentation", () => {
  it("keeps an unconfigured period unconfigured", () => {
    const view = viewFor({
      configuration: { status: "NOT_CONFIGURED" },
      employeeSize: { status: "NOT_PROVIDED" },
    });
    assert.equal(view.reportingOptionLabel, "Reporting option not configured");
    assert.equal(view.reportingOptionLabel.includes("Option A"), false);
    assert.equal(view.completionAssessment, "Not evaluated");
    assert.equal(view.complianceClaim, "Not evaluated");
    assert.equal(view.employeeCategoryLabel, "Employee-size category not determined");
    assert.equal(view.notice, "VS 2026 diagnostic preview — not a compliance assessment.");
    assert.equal("score" in view, false);
  });

  it("shows Option A, additional C disclosures, and unsupported Option B", () => {
    const basic = viewFor({ configuration: optionA(), employeeSize: measured(11) });
    assert.equal(basic.reportingOptionLabel, "Option A — Basic Module");
    assert.equal(basic.optionBNotice, null);
    assert.equal(disclosure(basic, "B1").heading, "B1 — Basis for preparation");
    assert.equal(disclosure(basic, "B11").heading.includes("Convictions and fines"), true);

    const additional = viewFor({
      configuration: optionA(["C5"]),
      employeeSize: measured(11),
    });
    assert.equal(additional.reportingOptionLabel, "Option A — Basic Module");
    assert.equal(additional.additionalComprehensive[0]?.disclosureId, "C5");
    assert.equal(additional.additionalComprehensive[0]?.label.includes("remains Option A"), true);
    assert.equal(additional.summary.unsupported, 1);

    const comprehensive = viewFor({
      configuration: {
        status: "CONFIGURED",
        reportingOption: "OPTION_B",
        additionalComprehensiveDisclosures: [],
      },
      employeeSize: measured(11),
    });
    assert.equal(comprehensive.optionBNotice?.includes("not yet implemented"), true);
    assert.equal(comprehensive.complianceClaim, "Not evaluated");
    assert.equal(comprehensive.summary.unsupported, 9);
  });

  it("distinguishes employee relief, missing, zero, false, and unassessed values", () => {
    const eight = viewFor({ configuration: optionA(), employeeSize: measured(8) });
    const eleven = viewFor({
      configuration: optionA(),
      employeeSize: measured(11),
      facts: [
        numberFact("B3_GROSS_SCOPE1_TCO2E", 0),
        booleanFact("B2_HAS_PRACTICES", false),
      ],
    });
    assert.equal(eight.employeeCategoryLabel, "10 employees or fewer");
    assert.equal(datapoint(eight, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "Voluntary");
    assert.equal(eleven.employeeCategoryLabel, "More than 10 employees");
    assert.equal(
      datapoint(eleven, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus,
      "Required and missing",
    );
    assert.equal(datapoint(eleven, "B3_GROSS_SCOPE1_TCO2E").valueStatus, "Reported zero");
    assert.equal(datapoint(eleven, "B2_HAS_PRACTICES").valueStatus, "Reported false");
    assert.equal(eleven.summary.reportedZero, 1);
    assert.equal(eleven.summary.reportedFalse, 1);
    assert.equal(eleven.summary.missingEssential > 0, true);
    assert.equal(
      datapoint(eleven, "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy").completionStatus,
      "Awaiting applicability assessment",
    );
  });

  it("keeps an unverified omission distinct from a structurally complete one", () => {
    const unverified = viewFor({
      configuration: optionA(),
      employeeSize: measured(11),
      facts: [
        {
          datapointId: "B1_OMITTED_DISCLOSURES",
          presence: {
            kind: "PRESENT",
            literal: { kind: "REFERENCES", datapointIds: ["B3_GROSS_SCOPE1_TCO2E"] },
          },
        },
      ],
      omissions: [
        {
          datapointId: "B3_GROSS_SCOPE1_TCO2E",
          reason: "22(c)",
          reassessedForPeriod: false,
          conditionsAssessed: false,
        },
      ],
    });
    assert.equal(
      datapoint(unverified, "B3_GROSS_SCOPE1_TCO2E").completionStatus,
      "Omission requiring verification",
    );

    const structural = viewFor({
      configuration: optionA(),
      employeeSize: measured(11),
      facts: [
        {
          datapointId: "B1_OMITTED_DISCLOSURES",
          presence: {
            kind: "PRESENT",
            literal: { kind: "REFERENCES", datapointIds: ["B3_GROSS_SCOPE1_TCO2E"] },
          },
        },
      ],
      omissions: [
        {
          datapointId: "B3_GROSS_SCOPE1_TCO2E",
          reason: "22(c)",
          reassessedForPeriod: true,
          conditionsAssessed: true,
        },
      ],
    });
    assert.equal(
      datapoint(structural, "B3_GROSS_SCOPE1_TCO2E").completionStatus.includes("not an independent legal approval"),
      true,
    );
  });

  it("keeps dimension members distinct and shows ignored facts", () => {
    const view = viewFor(
      {
        configuration: optionA(),
        employeeSize: measured(11),
        facts: [
          {
            datapointId: "B3_ENERGY_BREAKDOWN_INFORMATION",
            presence: { kind: "PRESENT", literal: { kind: "ENUMERATION", memberId: "CAN_OBTAIN" } },
          },
          energyFact("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", 10),
          energyFact("B3_ENERGY_CONSUMPTION_FROM_FUELS", "Renewable energy", 4),
          energyFact("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Solar", 99),
        ],
      },
      {
        rows: [
          {
            rowId: "site-1",
            groupId: "B1_SITE",
            reportingPeriodId: "period-1",
            parentRowId: null,
            position: 0,
            cells: [
              {
                id: "cell-site",
                datapointId: "B1_SITE_IDENTIFIER",
                dimensionMember: "",
                value: "North",
                unit: null,
              },
            ],
          },
          {
            rowId: "water-1",
            groupId: "B6_WATER_STRESS_SITE",
            reportingPeriodId: "period-1",
            parentRowId: "site-1",
            position: 0,
            cells: [],
          },
        ],
        excludedFieldIds: ["B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY"],
      },
    );
    assert.equal(
      datapoint(view, "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy").recordedValue,
      "10",
    );
    assert.equal(
      datapoint(view, "B3_ENERGY_CONSUMPTION_FROM_FUELS", "Renewable energy").recordedValue,
      "4",
    );
    assert.equal(
      datapoint(view, "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Total").valueStatus,
      "Missing",
    );
    assert.equal(view.diagnostics.some((item) => item.includes("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY:Solar")), true);
    assert.equal(view.diagnostics.some((item) => item.includes("B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY")), true);
    assert.equal(view.repeatingRows[1]?.parentLabel, "North");
    assert.equal(view.reviewFlag.label.includes("not a compliance result"), true);
    assert.equal(view.reviewFlag.readyForReview, false);
  });

  it("does not present a positive review flag as authoritative when facts were ignored", () => {
    const report = evaluateVS2026ReportingState({
      configuration: optionA(),
      employeeSize: measured(11),
      facts: [energyFact("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Solar", 99)],
    });
    const view = buildRegulatoryPreviewView(
      { ...report, readiness: { ...report.readiness, readyForReview: true } },
      { rows: [], excludedFieldIds: [] },
    );
    assert.equal(report.ignoredFactIds.includes("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY:Solar"), true);
    assert.equal(view.reviewFlag.readyForReview, true);
    assert.equal(view.reviewFlag.label.includes("not an authoritative assessment"), true);
    assert.equal(view.reviewFlag.label.includes("not a compliance result"), true);
  });
});
