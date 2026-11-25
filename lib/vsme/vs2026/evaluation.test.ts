import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import {
  evaluateVS2026ReportingState,
  type DatapointEvaluation,
  type EvaluationInput,
  type FactInput,
  type RepeatingRowInput,
  type ReportEvaluation,
} from "./evaluation";
import { COMPREHENSIVE_DISCLOSURES } from "./moduleSelection";

function optionA(additional: readonly string[] = []): EvaluationInput["configuration"] {
  return {
    status: "CONFIGURED",
    reportingOption: "OPTION_A",
    additionalComprehensiveDisclosures: additional,
  };
}

function optionB(): EvaluationInput["configuration"] {
  return {
    status: "CONFIGURED",
    reportingOption: "OPTION_B",
    additionalComprehensiveDisclosures: [],
  };
}

function measured(
  employeeMeasure: number,
  measureKind: string = VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
): EvaluationInput["employeeSize"] {
  return {
    status: "MEASURED",
    reportingPeriodId: "period-1",
    employeeMeasure,
    measureKind,
  };
}

function enumeration(datapointId: string, memberId: string): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "ENUMERATION", memberId } },
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

function textFact(datapointId: string, text: string): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "TEXT", text } },
  };
}

function references(datapointId: string, datapointIds: readonly string[]): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "REFERENCES", datapointIds } },
  };
}

function siteReference(datapointId: string, siteRowId: string): FactInput {
  return {
    datapointId,
    presence: { kind: "PRESENT", literal: { kind: "SITE_REFERENCE", siteRowId } },
  };
}

function evaluate(input: EvaluationInput): ReportEvaluation {
  return evaluateVS2026ReportingState(input);
}

function find(
  report: ReportEvaluation,
  datapointId: string,
  rowId: string | null = null,
): DatapointEvaluation {
  const found = report.datapoints.find(
    (item) => item.datapointId === datapointId && item.rowId === rowId,
  );
  assert.ok(found, `${datapointId} / ${rowId ?? "scalar"}`);
  return found;
}

function completionKey(item: DatapointEvaluation): string {
  return `${item.datapointId}|${item.rowId ?? ""}|${item.completionStatus}`;
}

describe("VS 2026 evaluation", () => {
  it("is deterministic and does not mutate the input", () => {
    const input: EvaluationInput = {
      configuration: optionA(),
      employeeSize: measured(8),
      facts: [booleanFact("B2_HAS_PRACTICES", false)],
      repeatingRows: [
        {
          rowId: "site-1",
          groupId: "B1_SITE",
          cells: [textFact("B1_SITE_IDENTIFIER", "site-1")],
        },
      ],
      omissions: [],
    };
    const snapshot = JSON.stringify(input);
    const first = evaluate(input);
    const second = evaluate(input);
    assert.equal(JSON.stringify(input), snapshot);
    assert.deepEqual(first, second);
    assert.equal(first.complianceClaim, "NOT_EVALUATED");
    assert.equal(first.completionAssessment, "NOT_EVALUATED");
  });

  it("does not depend on legacy scope, materiality, or a 500-employee gate", () => {
    const source = readFileSync(fileURLToPath(new URL("./evaluation.ts", import.meta.url)), "utf8");
    assert.equal(source.includes("moduleScope"), false);
    assert.equal(source.includes("materiality"), false);
    assert.equal(source.includes("non_material"), false);
    assert.equal(source.includes("employeeCount"), false);
    assert.equal(source.includes("prisma"), false);
    assert.equal(/\b500\b/.test(source), false);

    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [],
      materiality: "non_material",
    } as EvaluationInput);
    assert.equal(find(report, "B8_EMPLOYEES_PERMANENT").completionStatus, "REQUIRED_MISSING");
    assert.equal(find(report, "B8_EMPLOYEES_PERMANENT").blocksExport, true);
  });

  it("keeps a missing configuration distinct from Option A", () => {
    const report = evaluate({
      configuration: { status: "NOT_CONFIGURED" },
      employeeSize: measured(8),
      facts: [numberFact("B3_TOTAL_ENERGY_CONSUMPTION_MWH", 12)],
    });
    assert.equal(report.configurationStatus, "NOT_CONFIGURED");
    assert.equal(report.reportingOption, null);
    assert.equal(report.readiness.missingConfiguration, true);
    assert.equal(report.readiness.readyForReview, false);
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
    const energy = find(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.equal(energy.scope, "NOT_CONFIGURED");
    assert.equal(energy.inReportingScope, false);
    assert.equal(energy.completionStatus, "OUT_OF_SCOPE");
    assert.equal(energy.reasons.includes("NOT_CONFIGURED"), true);
  });

  it("rejects an Option B configuration that also lists additional disclosures", () => {
    const report = evaluate({
      configuration: {
        status: "CONFIGURED",
        reportingOption: "OPTION_B",
        additionalComprehensiveDisclosures: ["C5"],
      },
      employeeSize: measured(50),
    });
    assert.equal(report.configurationStatus, "REJECTED");
    assert.equal(
      report.configurationRejection,
      "ADDITIONAL_DISCLOSURE_NOT_ALLOWED_FOR_OPTION_B",
    );
    assert.equal(report.reportingOption, null);
    assert.equal(report.readiness.missingConfiguration, true);
    assert.equal(report.readiness.readyForReview, false);
  });

  it("classifies the explicit size boundaries and leaves an unknown measure unresolved", () => {
    const ten = evaluate({ configuration: optionA(), employeeSize: measured(10) });
    const eleven = evaluate({ configuration: optionA(), employeeSize: measured(11) });
    const zero = evaluate({ configuration: optionA(), employeeSize: measured(0) });
    const rejected = evaluate({
      configuration: optionA(),
      employeeSize: measured(40, "employeeCount"),
    });
    const absent = evaluate({
      configuration: optionA(),
      employeeSize: { status: "NOT_PROVIDED" },
    });

    assert.equal(ten.employeeCategory, "EMPLOYEES_LE_10");
    assert.equal(zero.employeeCategory, "EMPLOYEES_LE_10");
    assert.equal(eleven.employeeCategory, "EMPLOYEES_GT_10");
    assert.equal(find(ten, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "VOLUNTARY_MISSING");
    assert.equal(find(eleven, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "REQUIRED_MISSING");
    assert.equal(find(eleven, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").employeeSizeTreatment, "NONE");
    assert.equal(find(ten, "B8_EMPLOYEES_PERMANENT").employeeSizeTreatment, "NONE");
    assert.equal(find(ten, "B8_EMPLOYEES_PERMANENT").completionStatus, "REQUIRED_MISSING");

    assert.equal(rejected.employeeCategory, null);
    assert.equal(rejected.employeeSizeRejection, "MEASURE_NOT_EXPLICIT");
    const rejectedEnergy = find(rejected, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.equal(rejectedEnergy.employeeSizeTreatment, "UNRESOLVED");
    assert.equal(rejectedEnergy.completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(rejectedEnergy.reasons.includes("EMPLOYEE_SIZE_MEASURE_REJECTED"), true);

    const absentEnergy = find(absent, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.equal(absent.employeeCategory, null);
    assert.equal(absentEnergy.employeeSizeTreatment, "UNRESOLVED");
    assert.equal(absentEnergy.completionStatus, "BLOCKED_UNASSESSED");
    assert.notEqual(absentEnergy.completionStatus, "VOLUNTARY_MISSING");
    assert.notEqual(absentEnergy.completionStatus, "REQUIRED_MISSING");
  });

  it("keeps zero, false, and empty distinct from missing", () => {
    const reported = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [
        booleanFact("B2_HAS_PRACTICES", false),
        numberFact("B8_EMPLOYEES_PERMANENT", 0),
        textFact("B1_COUNTRY_PRIMARY_OPERATIONS", "   "),
      ],
      repeatingRows: [
        {
          rowId: "site-1",
          groupId: "B1_SITE",
          cells: [textFact("B1_SITE_IDENTIFIER", "")],
        },
      ],
    });
    const practices = find(reported, "B2_HAS_PRACTICES");
    assert.equal(practices.valueStatus, "REPORTED_FALSE");
    assert.equal(practices.recordedValue, "false");
    assert.equal(practices.completionStatus, "COMPLETE");
    assert.equal(practices.requirementType, "IF_APPLICABLE");

    const contracts = find(reported, "B8_EMPLOYEES_PERMANENT");
    assert.equal(contracts.valueStatus, "REPORTED_ZERO");
    assert.equal(contracts.recordedValue, "0");
    assert.equal(contracts.completionStatus, "COMPLETE");

    const blankCountry = find(reported, "B1_COUNTRY_PRIMARY_OPERATIONS");
    assert.equal(blankCountry.valueStatus, "EMPTY");
    assert.equal(blankCountry.recordedValue, null);
    assert.equal(blankCountry.completionStatus, "REQUIRED_MISSING");

    const blankSite = find(reported, "B1_SITE_IDENTIFIER", "site-1");
    assert.equal(blankSite.valueStatus, "EMPTY");
    assert.equal(blankSite.completionStatus, "REQUIRED_MISSING");

    const missing = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [],
    });
    assert.equal(find(missing, "B2_HAS_PRACTICES").valueStatus, "MISSING");
    assert.equal(find(missing, "B2_HAS_PRACTICES").completionStatus, "REQUIRED_MISSING");
    assert.equal(find(missing, "B8_EMPLOYEES_PERMANENT").valueStatus, "MISSING");
    assert.equal(find(missing, "B8_EMPLOYEES_PERMANENT").recordedValue, null);
    assert.equal(find(missing, "B8_EMPLOYEES_PERMANENT").reasons.includes("MISSING_IS_NOT_ZERO"), true);
  });

  it("does not treat preparation, digital, or calculated definitions as completion facts", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B3_ENERGY_BREAKDOWN_INFORMATION", "CANNOT_OBTAIN")],
    });
    const preparation = find(report, "B3_ENERGY_BREAKDOWN_INFORMATION");
    assert.equal(preparation.completionStatus, "NOT_A_COMPLETION_TARGET");
    assert.equal(preparation.outputRole, "PREPARATION_ONLY");
    assert.equal(preparation.exportInclusion, "INCLUDE");
    assert.equal(preparation.blocksExport, false);

    const electricity = find(report, "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY");
    assert.equal(electricity.applicability, "CONDITION_NOT_MET");
    assert.equal(electricity.completionStatus, "NOT_APPLICABLE");
    assert.equal(electricity.recordedValue, null);

    const calculated = find(report, "B3_SCOPE1_SCOPE2_LOCATION_TOTAL");
    assert.equal(calculated.informationClass, "CALCULATED_FACT");
    assert.equal(calculated.completionStatus, "NOT_A_COMPLETION_TARGET");
    assert.equal(calculated.valueStatus, "MISSING");
    assert.equal(calculated.recordedValue, null);
    assert.equal(calculated.blocksExport, false);
    assert.equal(calculated.reasons.includes("CALCULATION_NOT_IMPLEMENTED"), true);
    assert.equal(calculated.reasons.includes("MISSING_IS_NOT_ZERO"), true);

    const digital = find(report, "B7_WASTE_RECYCLING_PERCENT_MASS");
    assert.equal(digital.outputRole, "DIGITAL_ONLY");
    assert.equal(digital.completionStatus, "NOT_A_COMPLETION_TARGET");
    assert.equal(digital.blocksExport, false);

    const guidance = find(report, "B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION");
    assert.equal(guidance.completionStatus, "NOT_A_COMPLETION_TARGET");
    assert.equal(guidance.applicability, "NOT_A_REGULATORY_CONDITION");
    assert.equal(guidance.blocksExport, false);
  });

  it("does not equate separate workforce quantities", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [
        numberFact("B1_EMPLOYEES", 4),
        numberFact("B8_EMPLOYEES_PERMANENT", 9),
      ],
    });
    const employees = find(report, "B1_EMPLOYEES");
    const permanent = find(report, "B8_EMPLOYEES_PERMANENT");
    assert.equal(employees.completionStatus, "COMPLETE");
    assert.equal(permanent.completionStatus, "COMPLETE");
    assert.equal(employees.recordedValue, "4");
    assert.equal(permanent.recordedValue, "9");
    assert.equal(employees.reasons.some((reason) => reason.includes("EQUAL")), false);
  });

  it("keeps a supplied compliance statement from becoming a compliance claim", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [textFact("B1_EXPLICIT_COMPLIANCE_STATEMENT", "The undertaking states Option A.")],
    });
    assert.equal(find(report, "B1_EXPLICIT_COMPLIANCE_STATEMENT").completionStatus, "COMPLETE");
    assert.equal(find(report, "B1_MODULE_OPTION").recordedValue, "OPTION_A");
    assert.equal(find(report, "B1_MODULE_OPTION").reasons.includes("DERIVED_FROM_REPORTING_CONFIGURATION"), true);
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
    assert.equal(report.completionAssessment, "NOT_EVALUATED");
  });

  it("keeps Annex II membership from changing completion", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
    });
    const listed = find(report, "B8_EMPLOYEES_PERMANENT");
    const unlisted = find(report, "B2_HAS_PRACTICES");
    assert.equal(listed.annexII, "MEMBER");
    assert.equal(unlisted.annexII, "NOT_LISTED");
    assert.equal(listed.completionStatus, "REQUIRED_MISSING");
    assert.equal(unlisted.completionStatus, "REQUIRED_MISSING");
  });
});

describe("scenario A — 8 employees, Option A", () => {
  const report = evaluate({
    configuration: optionA(),
    employeeSize: measured(8),
    facts: [
      enumeration("B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES", "NO_SUCH_PROCESSES_IDENTIFIED"),
      enumeration("B4_REPORTING_CONDITION", "NEITHER"),
      enumeration("B8_MULTI_COUNTRY_OPERATIONS", "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY"),
    ],
    repeatingRows: [
      {
        rowId: "site-1",
        groupId: "B1_SITE",
        cells: [textFact("B1_SITE_IDENTIFIER", "site-1")],
      },
      {
        rowId: "assessment-1",
        groupId: "B5_SITE_ASSESSMENT",
        cells: [
          siteReference("B5_ASSESSED_SITE_REFERENCE", "site-1"),
          enumeration("B5_SITE_BSA_ASSESSMENT", "NO_IDENTIFIED_RELATIONSHIP"),
        ],
      },
    ],
  });

  it("stays on Option A and applies relief only where the registry allows it", () => {
    assert.equal(report.reportingOption, "OPTION_A");
    assert.equal(report.fullComprehensiveExpected, false);
    assert.equal(report.employeeCategory, "EMPLOYEES_LE_10");
    assert.deepEqual(report.unsupportedDisclosures, []);
    assert.equal(report.complianceClaim, "NOT_EVALUATED");

    const energy = find(report, "B3_TOTAL_ENERGY_CONSUMPTION_MWH");
    assert.equal(energy.requirementType, "ESSENTIAL");
    assert.equal(energy.employeeSizeTreatment, "VOLUNTARY");
    assert.equal(energy.completionStatus, "VOLUNTARY_MISSING");
    assert.equal(energy.blocksExport, false);
    assert.equal(energy.valueStatus, "MISSING");
    assert.equal(energy.recordedValue, null);

    assert.equal(find(report, "B3_GROSS_SCOPE1_TCO2E").completionStatus, "VOLUNTARY_MISSING");
    assert.equal(
      find(report, "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E").completionStatus,
      "VOLUNTARY_MISSING",
    );
    assert.equal(find(report, "B6_TOTAL_WATER_WITHDRAWAL_M3").completionStatus, "VOLUNTARY_MISSING");
    assert.equal(find(report, "B7_WASTE_GENERATED_TOTAL_WEIGHT").completionStatus, "VOLUNTARY_MISSING");
    assert.equal(find(report, "B3_GROSS_SCOPE3_TCO2E").employeeSizeTreatment, "NONE");
  });

  it("records the assessed environmental conditions and still blocks B8–B11", () => {
    const consumption = find(report, "B6_WATER_CONSUMPTION_PRODUCTION_M3");
    assert.equal(consumption.applicability, "CONDITION_NOT_MET");
    assert.equal(consumption.completionStatus, "NOT_APPLICABLE");
    assert.equal(consumption.employeeSizeTreatment, "VOLUNTARY");
    assert.equal(consumption.blocksExport, false);

    const pollutant = find(report, "B4_EMISSION_TO_AIR");
    assert.equal(pollutant.applicability, "CONDITION_NOT_MET");
    assert.equal(pollutant.completionStatus, "NOT_APPLICABLE");

    const areaName = find(report, "B5_BSA_NAME");
    assert.equal(areaName.applicability, "CONDITION_NOT_MET");
    assert.equal(areaName.completionStatus, "NOT_APPLICABLE");

    for (const datapointId of [
      "B8_EMPLOYEES_PERMANENT",
      "B8_EMPLOYEES_MALE",
      "B9_RECORDABLE_ACCIDENTS",
      "B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT",
    ]) {
      const item = find(report, datapointId);
      assert.equal(item.employeeSizeTreatment, "NONE");
      assert.equal(item.completionStatus, "REQUIRED_MISSING");
      assert.equal(item.blocksExport, true);
    }
    const convictions = find(report, "B11_CONVICTIONS_COUNT");
    assert.equal(convictions.applicability, "CONDITION_UNASSESSED");
    assert.equal(convictions.completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(convictions.blocksExport, true);
    assert.equal(report.readiness.readyForReview, false);
  });
});

describe("scenario B — 50 employees, incomplete B3", () => {
  const report = evaluate({
    configuration: optionA(),
    employeeSize: measured(50),
  });

  it("marks the paragraph 32 and 33 facts outstanding and does not invent zero", () => {
    assert.equal(report.employeeCategory, "EMPLOYEES_GT_10");
    for (const datapointId of [
      "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
      "B3_GROSS_SCOPE1_TCO2E",
      "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
    ]) {
      const item = find(report, datapointId);
      assert.equal(item.requirementType, "ESSENTIAL");
      assert.equal(item.employeeSizeTreatment, "NONE");
      assert.equal(item.applicability, "ALWAYS");
      assert.equal(item.valueStatus, "MISSING");
      assert.equal(item.recordedValue, null);
      assert.equal(item.completionStatus, "REQUIRED_MISSING");
      assert.equal(item.blocksExport, true);
      assert.equal(item.reasons.includes("MISSING_IS_NOT_ZERO"), true);
    }
    const breakdown = find(report, "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY");
    assert.equal(breakdown.applicability, "CONDITION_UNASSESSED");
    assert.equal(breakdown.completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(breakdown.legalApplicability, "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15");
    assert.equal(breakdown.reasons.includes("INTERNAL_DATA_QUALITY_REQUIREMENT"), true);
    assert.notEqual(breakdown.completionStatus, "NOT_APPLICABLE");
    assert.equal(report.readiness.outstandingRequired, true);
    assert.equal(report.readiness.unassessedConditions, true);
    assert.equal(report.readiness.readyForReview, false);
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
  });

  it("accepts a reported zero as present", () => {
    const withZero = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [numberFact("B3_GROSS_SCOPE1_TCO2E", 0)],
    });
    const scope1 = find(withZero, "B3_GROSS_SCOPE1_TCO2E");
    assert.equal(scope1.valueStatus, "REPORTED_ZERO");
    assert.equal(scope1.recordedValue, "0");
    assert.equal(scope1.completionStatus, "COMPLETE");
    assert.equal(find(withZero, "B3_TOTAL_ENERGY_CONSUMPTION_MWH").completionStatus, "REQUIRED_MISSING");
  });
});

describe("scenario C — 600 employees choosing Basic", () => {
  const basic = evaluate({ configuration: optionA(), employeeSize: measured(50) });
  const large = evaluate({ configuration: optionA(), employeeSize: measured(600) });

  it("does not make Comprehensive mandatory", () => {
    assert.equal(large.reportingOption, "OPTION_A");
    assert.equal(large.employeeCategory, "EMPLOYEES_GT_10");
    assert.equal(large.fullComprehensiveExpected, false);
    assert.deepEqual(large.modules, ["BASIC"]);
    assert.deepEqual(large.unsupportedDisclosures, []);
    assert.equal(large.complianceClaim, "NOT_EVALUATED");
    assert.deepEqual(
      large.datapoints.map(completionKey),
      basic.datapoints.map(completionKey),
    );
  });
});

describe("scenario D — Option B", () => {
  const report = evaluate({
    configuration: optionB(),
    employeeSize: measured(50),
    facts: [textFact("C5_PARTIAL", "filled")],
  });

  it("cannot evaluate Comprehensive completion or a compliance claim", () => {
    assert.equal(report.reportingOption, "OPTION_B");
    assert.equal(report.fullComprehensiveExpected, true);
    assert.deepEqual(report.modules, ["BASIC", "COMPREHENSIVE"]);
    assert.deepEqual(
      report.unsupportedDisclosures.map((item) => item.disclosureId),
      [...COMPREHENSIVE_DISCLOSURES],
    );
    assert.equal(report.unsupportedDisclosures[0]?.completionStatus, "NOT_YET_EVALUATED");
    assert.equal(report.unsupportedDisclosures[0]?.reason, "COMPREHENSIVE_REGISTRY_NOT_IMPLEMENTED");
    assert.equal(report.completionAssessment, "NOT_EVALUATED");
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
    assert.equal(report.readiness.unsupportedRequirements, true);
    assert.equal(report.readiness.readyForReview, false);
    assert.deepEqual(report.ignoredFactIds, ["C5_PARTIAL"]);
    assert.equal(
      report.datapoints.some((item) => item.datapointId === "C5_PARTIAL"),
      false,
    );
  });
});

describe("scenario E — Option A with C5 selected", () => {
  const report = evaluate({
    configuration: optionA(["C5"]),
    employeeSize: measured(50),
  });

  it("keeps Option A and records C5 as additional and unevaluated", () => {
    assert.equal(report.reportingOption, "OPTION_A");
    assert.equal(report.fullComprehensiveExpected, false);
    assert.deepEqual(report.modules, ["BASIC"]);
    assert.deepEqual(report.additionalComprehensiveDisclosures, ["C5"]);
    assert.equal(report.unsupportedDisclosures.length, 1);
    assert.equal(report.unsupportedDisclosures[0]?.disclosureId, "C5");
    assert.equal(report.unsupportedDisclosures[0]?.scope, "ADDITIONAL_COMPREHENSIVE");
    assert.equal(report.unsupportedDisclosures[0]?.completionStatus, "NOT_YET_EVALUATED");
    assert.equal(find(report, "B1_MODULE_OPTION").recordedValue, "OPTION_A");
    assert.equal(find(report, "B1_MODULE_OPTION").completionStatus, "COMPLETE");
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
    assert.equal(report.readiness.readyForReview, false);
  });
});

describe("scenario F — paragraph 22 omission", () => {
  const energy = "B3_TOTAL_ENERGY_CONSUMPTION_MWH";

  function omitted(list: readonly string[], claim: EvaluationInput["omissions"]): ReportEvaluation {
    return evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: list.length === 0 ? [] : [references("B1_OMITTED_DISCLOSURES", list)],
      omissions: claim,
    });
  }

  it("leaves an essential fact missing when no omission is claimed", () => {
    const report = omitted([], []);
    const item = find(report, energy);
    assert.equal(item.omissionStatus, "NONE");
    assert.equal(item.applicability, "ALWAYS");
    assert.equal(item.completionStatus, "REQUIRED_MISSING");
    assert.equal(item.blocksExport, true);
  });

  it("does not accept an unverified omission as complete", () => {
    const report = omitted(
      [energy],
      [
        {
          datapointId: energy,
          reason: "22(a)",
          reassessedForPeriod: true,
          conditionsAssessed: false,
        },
      ],
    );
    const item = find(report, energy);
    assert.equal(item.omissionStatus, "UNVERIFIED");
    assert.equal(item.completionStatus, "OMISSION_UNVERIFIED");
    assert.equal(item.applicability, "ALWAYS");
    assert.notEqual(item.completionStatus, "NOT_APPLICABLE");
    assert.notEqual(item.completionStatus, "OMITTED");
    assert.equal(item.reasons.includes("OMISSION_REQUIRES_VALIDATION"), true);
    assert.equal(item.blocksExport, true);
    assert.equal(report.readiness.unresolvedOmissions, true);
    assert.equal(report.readiness.readyForReview, false);
  });

  it("keeps the fact required when the B1 paragraph 27(b) list is incomplete", () => {
    const report = omitted(
      [],
      [
        {
          datapointId: energy,
          reason: "22(a)",
          reassessedForPeriod: true,
          conditionsAssessed: true,
        },
      ],
    );
    const item = find(report, energy);
    assert.equal(item.omissionStatus, "INVALID");
    assert.equal(item.completionStatus, "REQUIRED_MISSING");
    assert.equal(item.reasons.includes("B1_27B_LIST_INCOMPLETE"), true);
    assert.equal(find(report, "B1_OMITTED_DISCLOSURES").completionStatus, "REQUIRED_MISSING");
  });

  it("accepts a validated omission without treating it as not applicable", () => {
    const report = omitted(
      [energy],
      [
        {
          datapointId: energy,
          reason: "22(c)",
          reassessedForPeriod: true,
          conditionsAssessed: true,
        },
      ],
    );
    const item = find(report, energy);
    assert.equal(item.omissionStatus, "VALID");
    assert.equal(item.completionStatus, "OMITTED");
    assert.equal(item.exportInclusion, "INCLUDE_WITH_OMISSION");
    assert.equal(item.outputRole, "VALID_OMISSION");
    assert.equal(item.applicability, "ALWAYS");
    assert.equal(item.legalApplicability, "APPLICABLE");
    assert.equal(item.valueStatus, "MISSING");
    assert.equal(item.recordedValue, null);
    assert.equal(item.blocksExport, false);
    assert.equal(find(report, "B1_OMITTED_DISCLOSURES").completionStatus, "COMPLETE");
    assert.equal(find(report, "B1_OMITTED_DISCLOSURES").applicability, "CONDITION_MET");
  });
});

describe("scenario G — unassessed B4", () => {
  const report = evaluate({
    configuration: optionA(),
    employeeSize: measured(50),
    applicabilityAssessments: [
      { condition: "WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES", state: "NOT_APPLICABLE" },
    ],
  });

  it("preserves UNASSESSED and separates paragraph 15 from the quality control", () => {
    const emission = find(report, "B4_EMISSION_TO_AIR");
    assert.equal(emission.applicability, "CONDITION_UNASSESSED");
    assert.equal(emission.completionStatus, "BLOCKED_UNASSESSED");
    assert.notEqual(emission.completionStatus, "NOT_APPLICABLE");
    assert.equal(emission.legalApplicability, "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15");
    assert.equal(emission.reasons.includes("INTERNAL_DATA_QUALITY_REQUIREMENT"), true);
    assert.equal(emission.reasons.includes("PARAGRAPH_15_ASSUMED_NOT_APPLICABLE"), true);
    assert.equal(emission.blocksExport, true);
    assert.equal(report.readiness.unassessedConditions, true);
    assert.equal(report.readiness.readyForReview, false);
    assert.equal(report.complianceClaim, "NOT_EVALUATED");
  });
});

describe("scenario H — more than five sites and materials", () => {
  const siteRows: RepeatingRowInput[] = [];
  const materialRows: RepeatingRowInput[] = [];
  for (let index = 1; index <= 6; index += 1) {
    const rowId = `site-${index}`;
    siteRows.push({
      rowId,
      groupId: "B1_SITE",
      cells: [
        textFact("B1_SITE_IDENTIFIER", rowId),
        textFact("B1_SITE_ADDRESS", `${index} Harbour Road`),
        textFact("B1_SITE_POSTAL_CODE", `1000${index}`),
        textFact("B1_SITE_CITY", "Stockholm"),
        enumeration("B1_SITE_COUNTRY", "SE"),
        textFact("B1_SITE_GPS_LOCATION", `59.${index},18.${index}`),
      ],
    });
    materialRows.push({
      rowId: `material-${index}`,
      groupId: "B7_MATERIAL",
      cells: [
        textFact("B7_MATERIAL_NAME", `Material ${index}`),
        numberFact("B7_MATERIAL_WEIGHT", index),
      ],
    });
  }

  const report = evaluate({
    configuration: optionA(),
    employeeSize: measured(50),
    facts: [enumeration("B7_SIGNIFICANT_MATERIAL_FLOWS", "SIGNIFICANT_FLOWS")],
    repeatingRows: [...siteRows, ...materialRows],
  });

  it("keeps every row addressable", () => {
    const identifiers = report.datapoints.filter((item) => item.datapointId === "B1_SITE_IDENTIFIER");
    const names = report.datapoints.filter((item) => item.datapointId === "B7_MATERIAL_NAME");
    assert.deepEqual(
      identifiers.map((item) => item.rowId),
      ["site-1", "site-2", "site-3", "site-4", "site-5", "site-6"],
    );
    assert.deepEqual(
      names.map((item) => item.rowId),
      ["material-1", "material-2", "material-3", "material-4", "material-5", "material-6"],
    );
    assert.equal(identifiers.every((item) => item.completionStatus === "COMPLETE"), true);
    assert.equal(names.every((item) => item.completionStatus === "COMPLETE"), true);
    assert.equal(
      identifiers.every((item) => item.reasons.includes("REPEATING_CARDINALITY_OPEN")),
      true,
    );
    const volumes = report.datapoints.filter((item) => item.datapointId === "B7_MATERIAL_VOLUME");
    assert.equal(volumes.length, 6);
    assert.equal(volumes.every((item) => item.blocksExport === false), true);
    assert.equal(volumes.every((item) => item.completionStatus === "NOT_A_COMPLETION_TARGET"), true);
  });
});

describe("scenario I — conditional B10 and B11", () => {
  it("does not turn an absent minimum wage or an unassessed condition into a negative fact", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B10_MINIMUM_WAGE_DETERMINATION", "NO_APPLICABLE_MINIMUM_IDENTIFIED")],
    });
    const wage = find(report, "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE");
    assert.equal(wage.applicability, "CONDITION_NOT_MET");
    assert.equal(wage.completionStatus, "NOT_APPLICABLE");
    assert.equal(wage.valueStatus, "MISSING");
    assert.equal(wage.recordedValue, null);

    const payGap = find(report, "B10_GENDER_PAY_GAP_PERCENT");
    assert.equal(payGap.applicability, "CONDITION_UNASSESSED");
    assert.equal(payGap.completionStatus, "BLOCKED_UNASSESSED");
    assert.notEqual(payGap.completionStatus, "NOT_APPLICABLE");

    assert.equal(find(report, "B11_CONVICTIONS_COUNT").completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(find(report, "B11_FINES_AMOUNT").completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(find(report, "B11_CONVICTIONS_COUNT").recordedValue, null);
    assert.equal(find(report, "B11_FINES_AMOUNT").recordedValue, null);
  });

  it("keeps an unresolved wage determination unassessed", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B10_MINIMUM_WAGE_DETERMINATION", "DETERMINATION_UNRESOLVED")],
    });
    const wage = find(report, "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE");
    assert.equal(wage.applicability, "CONDITION_UNASSESSED");
    assert.equal(wage.completionStatus, "BLOCKED_UNASSESSED");
    assert.equal(wage.reasons.includes("CONDITION_MEMBER_UNRESOLVED"), true);
    assert.notEqual(wage.completionStatus, "NOT_APPLICABLE");
    assert.equal(wage.recordedValue, null);
  });

  it("accepts a conviction without inventing a fine", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [
        enumeration("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "CONVICTIONS_OCCURRED"),
        numberFact("B11_CONVICTIONS_COUNT", 2),
      ],
    });
    const count = find(report, "B11_CONVICTIONS_COUNT");
    const fine = find(report, "B11_FINES_AMOUNT");
    assert.equal(count.completionStatus, "COMPLETE");
    assert.equal(count.recordedValue, "2");
    assert.equal(fine.applicability, "CONDITION_NOT_MET");
    assert.equal(fine.completionStatus, "NOT_APPLICABLE");
    assert.equal(fine.valueStatus, "MISSING");
    assert.equal(fine.recordedValue, null);
    assert.equal(count.reasons.includes("PARAGRAPH_43_CONJUNCTION_UNRESOLVED"), true);
    assert.equal(fine.reasons.includes("PARAGRAPH_43_CONJUNCTION_UNRESOLVED"), true);
  });

  it("accepts a fine without inventing a conviction count", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [
        enumeration("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "FINES_OCCURRED"),
        numberFact("B11_FINES_AMOUNT", 10),
      ],
    });
    assert.equal(find(report, "B11_FINES_AMOUNT").completionStatus, "COMPLETE");
    assert.equal(find(report, "B11_FINES_AMOUNT").recordedValue, "10");
    assert.equal(find(report, "B11_CONVICTIONS_COUNT").completionStatus, "NOT_APPLICABLE");
    assert.equal(find(report, "B11_CONVICTIONS_COUNT").recordedValue, null);
    assert.equal(
      find(report, "B11_CONVICTIONS_COUNT").reasons.includes("PARAGRAPH_43_CONJUNCTION_UNRESOLVED"),
      true,
    );
  });

  it("does not write zeros when neither event occurred", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "NEITHER_AFTER_ASSESSMENT")],
    });
    for (const datapointId of ["B11_CONVICTIONS_COUNT", "B11_FINES_AMOUNT"]) {
      const item = find(report, datapointId);
      assert.equal(item.completionStatus, "NOT_APPLICABLE");
      assert.equal(item.recordedValue, null);
      assert.equal(item.reasons.includes("PARAGRAPH_43_CONJUNCTION_UNRESOLVED"), false);
    }
  });
});

describe("disclosure-specific restrictions and site references", () => {
  it("does not collapse a B9 legal restriction into paragraph 22", () => {
    const restricted = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B9_FATALITY_LEGAL_RESTRICTION", "RESTRICTION_AFFECTS_DISCLOSURE")],
    });
    const total = find(restricted, "B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM");
    assert.equal(total.applicability, "LEGALLY_RESTRICTED");
    assert.equal(total.legalApplicability, "LEGALLY_RESTRICTED");
    assert.equal(total.completionStatus, "LEGALLY_RESTRICTED");
    assert.equal(total.omissionStatus, "NONE");
    assert.equal(total.outputRole, "LEGAL_RESTRICTION");
    assert.equal(total.blocksExport, false);
    assert.equal(total.reasons.includes("LEGAL_RESTRICTION_NOT_PARAGRAPH_22"), true);

    const reportable = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B9_FATALITY_LEGAL_RESTRICTION", "NO_RESTRICTION_IDENTIFIED")],
    });
    assert.equal(
      find(reportable, "B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM").completionStatus,
      "REQUIRED_MISSING",
    );
  });

  it("requires a biodiversity site reference to name a B1 site row", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      repeatingRows: [
        {
          rowId: "site-1",
          groupId: "B1_SITE",
          cells: [textFact("B1_SITE_IDENTIFIER", "site-1")],
        },
        {
          rowId: "assessment-1",
          groupId: "B5_SITE_ASSESSMENT",
          cells: [
            siteReference("B5_ASSESSED_SITE_REFERENCE", "missing-site"),
            enumeration("B5_SITE_BSA_ASSESSMENT", "RELATIONSHIP_IDENTIFIED"),
          ],
        },
        {
          rowId: "relation-1",
          groupId: "B5_SITE_BSA_RELATIONSHIP",
          cells: [
            siteReference("B5_RELATIONSHIP_SITE_REFERENCE", "missing-site"),
            textFact("B5_BSA_NAME", "Example area"),
          ],
        },
      ],
    });
    const reference = find(report, "B5_RELATIONSHIP_SITE_REFERENCE", "relation-1");
    assert.equal(reference.completionStatus, "REQUIRED_MISSING");
    assert.equal(reference.reasons.includes("SITE_REFERENCE_NOT_IN_B1_INVENTORY"), true);
    assert.equal(find(report, "B5_BSA_NAME", "relation-1").completionStatus, "COMPLETE");
  });

  it("flags a stored module option that disagrees with the configuration", () => {
    const report = evaluate({
      configuration: optionA(),
      employeeSize: measured(50),
      facts: [enumeration("B1_MODULE_OPTION", "OPTION_B")],
    });
    const option = find(report, "B1_MODULE_OPTION");
    assert.equal(option.recordedValue, "OPTION_A");
    assert.equal(option.reasons.includes("CONFIGURATION_VALUE_CONFLICT"), true);
    assert.equal(report.reportingOption, "OPTION_A");
  });
});
