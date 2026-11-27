import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import {
  evaluateVS2026ReportingState,
  type EvaluationInput,
  type FactInput,
  type ReportEvaluation,
} from "./evaluation";
import { aggregateReportingReadiness, type ReportingReview } from "./reportingState";
import type { ReportingStandardIdentity } from "./reportingStandard";

const optionA = {
  status: "CONFIGURED" as const,
  reportingOption: "OPTION_A" as const,
  additionalComprehensiveDisclosures: [] as string[],
};

function measured(employeeMeasure: number): EvaluationInput["employeeSize"] {
  return {
    status: "MEASURED",
    reportingPeriodId: "period-1",
    employeeMeasure,
    measureKind: VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE,
  };
}

function booleanFact(datapointId: string, value: boolean): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "BOOLEAN", value } } };
}

function numberFact(datapointId: string, value: number): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "NUMBER", value } } };
}

function references(datapointId: string, datapointIds: readonly string[]): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "REFERENCES", datapointIds } } };
}

function enumeration(datapointId: string, memberId: string): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "ENUMERATION", memberId } } };
}

function invalid(datapointId: string): FactInput {
  return { datapointId, presence: { kind: "INVALID" } };
}

function reviewFor(
  input: EvaluationInput,
  basis: "UNKNOWN" | "FIRST_YEAR" | "SUBSEQUENT" = "FIRST_YEAR",
  supplementaryRowCounts: Record<string, number> = {},
): { report: ReportEvaluation; review: ReportingReview } {
  const report = evaluateVS2026ReportingState(input);
  return {
    report,
    review: aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: basis,
      supplementaryRowCounts,
      integrityIssues: [],
    }),
  };
}

function forDatapoint(review: ReportingReview, datapointId: string) {
  return review.issues.filter((item) => item.datapointId === datapointId);
}

describe("VS 2026 reporting readiness", () => {
  it("keeps an unconfigured period off the VS 2026 review", () => {
    const standard: ReportingStandardIdentity = { kind: "UNCONFIGURED" };
    const review = aggregateReportingReadiness({
      standard,
      report: null,
      comparativeBasis: "UNKNOWN",
      supplementaryRowCounts: {},
      integrityIssues: [],
    });
    assert.equal(review.readiness, "NOT_CONFIGURED");
    assert.equal(review.complianceClaim, "NOT_EVALUATED");
    assert.equal(review.conformityStatement, "NOT_PREPARED");
  });

  it("does not treat Option B as a complete Basic Module review", () => {
    const review = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_B" },
      report: null,
      comparativeBasis: "UNKNOWN",
      supplementaryRowCounts: {},
      integrityIssues: [],
    });
    assert.equal(review.readiness, "UNSUPPORTED");
    assert.equal(review.complianceClaim, "NOT_EVALUATED");
  });

  it("classifies required, conditional, voluntary, zero, and false values", () => {
    const { report, review } = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [
        booleanFact("B2_HAS_PRACTICES", false),
        booleanFact("B2_HAS_POLICIES", false),
        booleanFact("B2_HAS_FUTURE_INITIATIVES", false),
        numberFact("B7_WASTE_DIVERTED_PROPORTION", 0),
      ],
    });
    assert.equal(report.reportingOption, "OPTION_A");
    assert.equal(report.employeeCategory, "EMPLOYEES_GT_10");
    assert.equal(forDatapoint(review, "B3_GROSS_SCOPE1_TCO2E").some((item) => item.code === "REQUIRED_FACT_MISSING"), true);
    assert.equal(forDatapoint(review, "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E").some((item) => item.code === "REQUIRED_FACT_MISSING"), true);
    assert.equal(forDatapoint(review, "B3_SCOPE1_SCOPE2_LOCATION_TOTAL").length, 0);
    assert.equal(forDatapoint(review, "B2_HAS_PRACTICES").length, 0);
    assert.equal(forDatapoint(review, "B7_WASTE_DIVERTED_PROPORTION").some((item) => item.severity === "blocking"), false);
    const small = reviewFor({
      configuration: optionA,
      employeeSize: measured(8),
      facts: [],
    });
    assert.equal(small.report.employeeCategory, "EMPLOYEES_LE_10");
    assert.equal(
      small.review.issues.some((item) => item.datapointId === "B7_WASTE_DIVERTED_PROPORTION" && item.severity === "blocking"),
      false,
    );
    assert.equal(forDatapoint(review, "B7_WASTE_RECYCLING_PERCENT_MASS").some((item) => item.severity === "blocking"), false);
    assert.equal(
      forDatapoint(review, "B1_SITE_IDENTIFIER").some((item) => item.code === "REQUIRED_FACT_MISSING"),
      false,
    );
    assert.equal(forDatapoint(review, "B1_EXPLICIT_COMPLIANCE_STATEMENT")[0]?.severity, "finalisation");
    assert.equal(forDatapoint(review, "B1_EXPLICIT_COMPLIANCE_STATEMENT")[0]?.code, "REPORT_FINALISATION_PENDING");
    assert.equal(
      forDatapoint(review, "B2_COOPERATIVE_DISCLOSURES_COOP_INVESTMENT_SOCIAL_ECONOMY").some((item) => item.severity === "blocking"),
      false,
    );
    assert.equal(review.complianceClaim, "NOT_EVALUATED");
    assert.notEqual(review.readiness, "READY_FOR_REVIEW");
    const titles = review.disclosures.map((item) => item.title);
    assert.equal(titles.includes("Basis for preparation"), true);
    assert.equal(titles.includes("Energy and greenhouse gas emissions"), true);
  });

  it("asks for an assessment when a condition or the employee measure is open", () => {
    const unassessed = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [],
    });
    assert.equal(
      unassessed.review.issues.some((item) => item.code === "CONDITION_UNASSESSED"),
      true,
    );
    const notApplicable = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [booleanFact("B2_HAS_PRACTICES", false)],
    });
    assert.equal(
      notApplicable.review.issues.some(
        (item) => item.datapointId === "B2_HAS_PRACTICES" && item.code === "REQUIRED_FACT_MISSING",
      ),
      false,
    );
    const noMeasure = reviewFor({
      configuration: optionA,
      employeeSize: { status: "NOT_PROVIDED" },
      facts: [],
    });
    assert.equal(noMeasure.review.employeeCategory, null);
    assert.equal(
      noMeasure.review.issues.some((item) => item.message.includes("employee-size measure")),
      true,
    );
  });

  it("keeps a reported accident rate and does not require the combined emissions total", () => {
    const { review } = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [
        numberFact("B9_RECORDABLE_ACCIDENT_RATE", 1.5),
        enumeration("B9_ACCIDENT_RATE_BASIS", "BASIS_200000_HOURS"),
        numberFact("B3_GROSS_SCOPE1_TCO2E", 4),
        numberFact("B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E", 2),
      ],
    });
    assert.equal(forDatapoint(review, "B9_RECORDABLE_ACCIDENT_RATE").length, 0);
    assert.equal(forDatapoint(review, "B3_SCOPE1_SCOPE2_LOCATION_TOTAL").length, 0);
    assert.equal(forDatapoint(review, "B3_GROSS_SCOPE1_TCO2E").length, 0);
    assert.equal(forDatapoint(review, "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E").length, 0);
    const wages = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [
        enumeration("B10_MINIMUM_WAGE_DETERMINATION", "STATUTORY_MINIMUM_WAGE"),
        enumeration("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", "YES"),
        enumeration("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "NEITHER_AFTER_ASSESSMENT"),
      ],
    });
    assert.equal(forDatapoint(wages.review, "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE").length, 0);
    assert.equal(
      forDatapoint(wages.review, "B11_CONVICTIONS_COUNT").some((item) => item.code === "REQUIRED_FACT_MISSING"),
      false,
    );
    const unanswered = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [],
    });
    assert.equal(forDatapoint(unanswered.review, "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE").length > 0, true);
    assert.equal(
      forDatapoint(unanswered.review, "B11_CONVICTIONS_AND_FINES_ASSESSMENT").some((item) => item.code === "REQUIRED_FACT_MISSING"),
      false,
    );
    assert.equal(
      unanswered.review.issues.some((item) => item.disclosureId === "B11" && item.code === "CONDITION_UNASSESSED"),
      true,
    );
  });

  it("treats paragraph 22 claims as attestation and invalid values as corrections", () => {
    const omitted = "B3_TOTAL_ENERGY_CONSUMPTION_MWH";
    const complete = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [references("B1_OMITTED_DISCLOSURES", [omitted])],
      omissions: [
        {
          datapointId: omitted,
          reason: "22(c)",
          conditionsAssessed: true,
          reassessedForPeriod: true,
        },
      ],
    });
    assert.equal(forDatapoint(complete.review, omitted).some((item) => item.code === "REQUIRED_FACT_MISSING"), false);
    assert.ok(complete.review.structuralOmissions >= 1);
    assert.equal(complete.review.complianceClaim, "NOT_EVALUATED");

    const incomplete = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [references("B1_OMITTED_DISCLOSURES", [omitted])],
      omissions: [
        {
          datapointId: omitted,
          reason: "22(c)",
          conditionsAssessed: true,
          reassessedForPeriod: false,
        },
      ],
    });
    assert.equal(forDatapoint(incomplete.review, omitted)[0]?.code, "OMISSION_INCOMPLETE");
    assert.equal(incomplete.review.readiness, "NEEDS_CORRECTION");

    const rejected = reviewFor({
      configuration: optionA,
      employeeSize: measured(50),
      facts: [invalid("B1_NACE_CODES")],
    });
    assert.equal(forDatapoint(rejected.review, "B1_NACE_CODES").some((item) => item.code === "INVALID_REPORTED_VALUE"), true);
    assert.equal(rejected.review.readiness, "NEEDS_CORRECTION");
  });

  it("keeps entered Scope 3 rows visible without making them mandatory", () => {
    const input: EvaluationInput = {
      configuration: optionA,
      employeeSize: measured(50),
      repeatingRows: [
        {
          rowId: "scope3-1",
          groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
          cells: [numberFact("B3_SCOPE3_SIGNIFICANT_CATEGORIES", 3)],
        },
      ],
    };
    const report = evaluateVS2026ReportingState(input);
    const review = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: "FIRST_YEAR",
      supplementaryRowCounts: { B3_SCOPE3_SIGNIFICANT_CATEGORIES: 1 },
      integrityIssues: [],
    });
    const supplementary = review.issues.find((item) => item.code === "UNRECOGNISED_SUPPLEMENTARY_INFORMATION" && item.disclosureId === "B3");
    assert.ok(supplementary);
    assert.equal(supplementary?.severity, "warning");
    assert.notEqual(review.readiness, "READY_FOR_REVIEW");
  });

  it("separates first-year, unknown, and subsequent reporting history", () => {
    const report = {
      reportingOption: "OPTION_A",
      employeeCategory: "EMPLOYEES_GT_10",
      datapoints: [],
      unsupportedDisclosures: [],
      ignoredGroupIds: [],
    } as unknown as ReportEvaluation;
    const first = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: "FIRST_YEAR",
      supplementaryRowCounts: {},
      integrityIssues: [],
    });
    assert.equal(first.readiness, "READY_FOR_REVIEW");
    assert.equal(first.complianceClaim, "NOT_EVALUATED");
    assert.equal(first.limitations.some((item) => item.includes("not treated as unchanged")), true);

    const unknown = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: "UNKNOWN",
      supplementaryRowCounts: {},
      integrityIssues: [],
    });
    assert.equal(unknown.readiness, "NEEDS_ASSESSMENT");

    const subsequent = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: "SUBSEQUENT",
      supplementaryRowCounts: {},
      integrityIssues: [],
    });
    assert.equal(subsequent.readiness, "UNSUPPORTED");
    assert.notEqual(subsequent.readiness, "READY_FOR_REVIEW");

    const provenance = aggregateReportingReadiness({
      standard: { kind: "VS2026", option: "OPTION_A" },
      report,
      comparativeBasis: "FIRST_YEAR",
      supplementaryRowCounts: {},
      integrityIssues: [],
      provenanceConflicts: [{ datapointId: "B1_LEGAL_FORM" }],
    });
    assert.equal(
      provenance.issues.some((item) => item.code === "LEGACY_VALUE_PROVENANCE" && item.datapointId === "B1_LEGAL_FORM"),
      true,
    );
    assert.equal(provenance.readiness, "NEEDS_CORRECTION");
  });

  it("blocks review when a Comprehensive disclosure is selected and leaves Appendix B optional", () => {
    const { review } = reviewFor({
      configuration: { ...optionA, additionalComprehensiveDisclosures: ["C5"] },
      employeeSize: measured(50),
      facts: [
        booleanFact("B2_HAS_PRACTICES", true),
        booleanFact("B2_HAS_POLICIES", true),
        booleanFact("B2_HAS_FUTURE_INITIATIVES", true),
      ],
    });
    assert.equal(review.issues.some((item) => item.disclosureId === "C5" && item.severity === "unsupported"), true);
    assert.notEqual(review.readiness, "READY_FOR_REVIEW");
    const topics = forDatapoint(review, "B2_SUSTAINABILITY_ISSUES_ADDRESSED");
    if (topics.length > 0) {
      assert.equal(topics.every((item) => item.severity !== "blocking"), true);
    }
  });
});
