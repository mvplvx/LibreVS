import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RegulatoryPreview } from "../../../components/vsme/vs2026/RegulatoryPreview";
import type { RegulatoryPreviewResult } from "./regulatoryPreview";

const view: Extract<RegulatoryPreviewResult, { ok: true }>["view"] = {
  notice: "VS 2026 diagnostic preview — not a compliance assessment.",
  reportingOptionLabel: "Reporting option not configured",
  configurationStatus: "NOT_CONFIGURED",
  configurationDetail: "No reporting option is stored. This period is not treated as Option A.",
  employeeCategoryLabel: "Employee-size category not determined",
  employeeCategoryResolved: false,
  employeeSizeDetail: "No explicit proportionality measure is stored for this period.",
  evaluatedDisclosureCount: 11,
  completionAssessment: "Not evaluated",
  complianceClaim: "Not evaluated",
  reviewFlag: {
    readyForReview: false,
    label: "Internal review flag: not ready. This flag is not a compliance result.",
  },
  optionBNotice: null,
  additionalComprehensive: [],
  summary: {
    reported: 0,
    reportedZero: 0,
    reportedFalse: 0,
    missingEssential: 0,
    voluntary: 0,
    notApplicable: 0,
    unassessed: 0,
    structurallyOmitted: 0,
    unverifiedOmissions: 0,
    unsupported: 0,
    invalid: 0,
  },
  disclosures: [
    {
      id: "B1",
      heading: "B1 — Basis for preparation",
      evaluatedFacts: 1,
      outstandingRequired: 0,
      unassessedConditions: 0,
      voluntary: 0,
      invalid: 0,
      datapoints: [
        {
          datapointId: "B1_TURNOVER",
          label: "The undertaking shall disclose its turnover.",
          reference: "Paragraph 27",
          dimensionMember: null,
          rowId: null,
          recordedValue: null,
          recordedUnit: null,
          requirementType: "Essential",
          applicability: "Always applicable",
          employeeSizeTreatment: "No employee-size relief",
          valueStatus: "Missing",
          completionStatus: "Out of scope",
          outputInclusion: "Not included in report output",
          explanations: ["No reporting option is stored for this period."],
        },
      ],
    },
  ],
  repeatingRows: [],
  diagnostics: ["Ignored fact: UNKNOWN. This value was not evaluated and is not complete."],
};

describe("VS 2026 preview interface", () => {
  it("renders the diagnostic notice, disclosure title, and ignored fact", () => {
    const html = renderToStaticMarkup(
      createElement(RegulatoryPreview, {
        result: {
          ok: true,
          reportingPeriodId: "period-1",
          year: 2026,
          companyName: "North mill",
          view,
        },
      }),
    );
    assert.equal(html.includes("VS 2026 diagnostic preview — not a compliance assessment."), true);
    assert.equal(html.includes("does not certify regulatory compliance"), true);
    assert.equal(html.includes("Reporting option not configured"), true);
    assert.equal(html.includes("Employee-size category not determined"), true);
    assert.equal(html.includes("B1 — Basis for preparation"), true);
    assert.equal(html.includes("Paragraph 27"), true);
    assert.equal(html.includes("Ignored fact: UNKNOWN"), true);
    assert.equal(html.includes("They are not a compliance score."), true);
    assert.equal(html.includes("100%"), false);
  });

  it("renders a safe failure without a report", () => {
    const html = renderToStaticMarkup(
      createElement(RegulatoryPreview, {
        result: {
          ok: false,
          reason: "PERIOD_NOT_FOUND",
          message: "Reporting period not found.",
          issues: [],
        },
      }),
    );
    assert.equal(html.includes("Reporting period not found."), true);
    assert.equal(html.includes("Option A — Basic Module"), false);
    assert.equal(html.includes("Prisma"), false);
  });
});
