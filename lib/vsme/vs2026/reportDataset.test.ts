import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { evaluateVS2026ReportingState, type EvaluationInput, type FactInput } from "./evaluation";
import { aggregateReportingReadiness } from "./reportingState";
import {
  buildVS2026ReportDataset,
  type ReportFact,
  type VS2026ReportDataset,
} from "./reportDataset";
import { hashReportDataset, renderDraftReportFile, renderFinalReportFile, stableStringify } from "./reportJson";
import { finalisationDecision } from "./reportFinalise";
import { unverifiedVs2026FieldIds } from "./reportProvenance";

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

function numberFact(datapointId: string, value: number, unit?: string): FactInput {
  return { datapointId, unit, presence: { kind: "PRESENT", literal: { kind: "NUMBER", value } } };
}

function textFact(datapointId: string, text: string): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "TEXT", text } } };
}

function enumeration(datapointId: string, memberId: string): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "ENUMERATION", memberId } } };
}

function references(datapointId: string, datapointIds: readonly string[]): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "REFERENCES", datapointIds } } };
}

function siteReference(datapointId: string, siteRowId: string): FactInput {
  return { datapointId, presence: { kind: "PRESENT", literal: { kind: "SITE_REFERENCE", siteRowId } } };
}

function energy(datapointId: string, dimensionMember: string, value: number): FactInput {
  return {
    datapointId,
    dimensionMember,
    unit: "MWh",
    presence: { kind: "PRESENT", literal: { kind: "NUMBER", value } },
  };
}

function datasetFor(input: EvaluationInput, provenance: string[] = []): VS2026ReportDataset {
  const report = evaluateVS2026ReportingState(input);
  const review = aggregateReportingReadiness({
    standard: { kind: "VS2026", option: "OPTION_A" },
    report,
    comparativeBasis: "FIRST_YEAR",
    supplementaryRowCounts: { B3_SCOPE3_SIGNIFICANT_CATEGORIES: 1 },
    integrityIssues: [],
    provenanceConflicts: provenance.map((datapointId) => ({ datapointId })),
  });
  return buildVS2026ReportDataset({
    reportingPeriodId: "period-1",
    year: 2026,
    undertakingName: "Northwind AB",
    currency: "SEK",
    comparativeBasis: "FIRST_YEAR",
    report,
    review,
    rows: [
      { rowId: "site-b", groupId: "B1_SITE", position: 1, cells: [] },
      { rowId: "site-a", groupId: "B1_SITE", position: 0, cells: [] },
      { rowId: "pollutant-b", groupId: "B4_POLLUTANT", position: 1, cells: [] },
      { rowId: "pollutant-a", groupId: "B4_POLLUTANT", position: 0, cells: [] },
      {
        rowId: "scope3-9",
        groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
        position: 1,
        cells: [{ datapointId: "B3_SCOPE3_CATEGORY_VALUE", dimensionMember: "Category 9", value: "4", unit: "tCO2eq" }],
      },
      {
        rowId: "scope3-1",
        groupId: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
        position: 0,
        cells: [{ datapointId: "B3_SCOPE3_CATEGORY_VALUE", dimensionMember: "Category 1", value: "3", unit: "tCO2eq" }],
      },
    ],
    omissions: input.omissions ?? [],
    provenanceExclusions: provenance,
    status: "DRAFT",
    conformityStatement: null,
  });
}

function fact(dataset: VS2026ReportDataset, datapointId: string, rowId: string | null = null, dimensionMember: string | null = null): ReportFact {
  const found = dataset.disclosures
    .flatMap((disclosure) => disclosure.facts)
    .find((item) => item.datapointId === datapointId && item.rowId === rowId && item.dimensionMember === dimensionMember);
  assert.ok(found, datapointId);
  return found;
}

describe("VS 2026 canonical report dataset", () => {
  const omitted = "B3_TOTAL_ENERGY_CONSUMPTION_MWH";
  const input: EvaluationInput = {
    configuration: optionA,
    employeeSize: measured(8),
    facts: [
      enumeration("B1_REPORTING_BASIS", "INDIVIDUAL"),
      textFact("B1_LEGAL_FORM", "Aktiebolag"),
      booleanFact("B2_HAS_PRACTICES", false),
      numberFact("B3_GROSS_SCOPE1_TCO2E", 0, "tCO2eq"),
      numberFact("B3_SCOPE1_SCOPE2_LOCATION_TOTAL", 99, "tCO2eq"),
      energy("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Renewable energy", 10),
      energy("B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY", "Non-renewable energy", 4),
      energy("B3_ENERGY_CONSUMPTION_FROM_FUELS", "Renewable energy", 0),
      numberFact("B7_WASTE_DIVERTED_PROPORTION", 0),
      numberFact("B7_WASTE_RECYCLING_PERCENT_MASS", 10),
      numberFact("B8_EMPLOYEES_PERMANENT", 0),
      numberFact("B9_RECORDABLE_ACCIDENTS", 2),
      numberFact("B9_RECORDABLE_ACCIDENT_RATE", 1.5),
      enumeration("B9_ACCIDENT_RATE_BASIS", "BASIS_200000_HOURS"),
      enumeration("B10_MINIMUM_WAGE_DETERMINATION", "STATUTORY_MINIMUM_WAGE"),
      booleanFact("B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE", false),
      enumeration("B11_CONVICTIONS_AND_FINES_ASSESSMENT", "BOTH_OCCURRED"),
      numberFact("B11_CONVICTIONS_COUNT", 2),
      numberFact("B11_FINES_AMOUNT", 1500),
      numberFact(omitted, 991.25),
      references("B1_OMITTED_DISCLOSURES", [omitted]),
    ],
    repeatingRows: [
      { rowId: "site-b", groupId: "B1_SITE", cells: [textFact("B1_SITE_IDENTIFIER", "Plant B")] },
      { rowId: "site-a", groupId: "B1_SITE", cells: [textFact("B1_SITE_IDENTIFIER", "Plant A")] },
      {
        rowId: "assessment-1",
        groupId: "B5_SITE_ASSESSMENT",
        cells: [siteReference("B5_ASSESSED_SITE_REFERENCE", "site-a")],
      },
      {
        rowId: "water-1",
        groupId: "B6_WATER_STRESS_SITE",
        cells: [siteReference("B6_WATER_STRESS_SITE_REFERENCE", "site-a")],
      },
      {
        rowId: "pollutant-b",
        groupId: "B4_POLLUTANT",
        cells: [textFact("B4_POLLUTANT_IDENTITY", "Nitrogen")],
      },
      {
        rowId: "pollutant-a",
        groupId: "B4_POLLUTANT",
        cells: [textFact("B4_POLLUTANT_IDENTITY", "Dust")],
      },
    ],
    omissions: [
      { datapointId: omitted, reason: "22(b)", conditionsAssessed: true, reassessedForPeriod: true },
    ],
  };

  it("keeps B1–B11 order, currency, zero, false, omissions, and supplementary values", () => {
    const first = datasetFor(input);
    const second = datasetFor(input);
    assert.deepEqual(first, second);
    assert.deepEqual(first.disclosures.map((item) => item.id), ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", "B11"]);
    assert.equal(first.metadata.reportingOption, "OPTION_A");
    assert.equal(first.metadata.regulatoryVersion, "EU-2026/1560");
    assert.equal(first.metadata.status, "DRAFT");
    assert.equal(first.undertaking.name, "Northwind AB");
    assert.equal(first.undertaking.currency, "SEK");
    assert.equal(first.metadata.currency, "SEK");
    assert.equal(first.conformityStatement, null);
    assert.equal(first.validation.complianceClaim, "NOT_EVALUATED");
    assert.equal(first.basisOfPreparation.organisationalBoundary, "INDIVIDUAL");
    assert.equal(first.basisOfPreparation.comparativeInformation, "NOT_IMPLEMENTED");

    assert.equal(fact(first, "B2_HAS_PRACTICES").reportedValue, "false");
    assert.equal(fact(first, "B2_HAS_PRACTICES").valueStatus, "REPORTED_FALSE");
    assert.equal(fact(first, "B8_EMPLOYEES_PERMANENT").reportedValue, "0");
    assert.equal(fact(first, "B8_EMPLOYEES_PERMANENT").valueStatus, "REPORTED_ZERO");
    assert.equal(fact(first, "B3_GROSS_SCOPE1_TCO2E").reportedValue, "0");
    assert.equal(fact(first, "B3_GROSS_SCOPE1_TCO2E").employeeSizeTreatment, "VOLUNTARY");
    assert.equal(fact(first, "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E").valueStatus, "MISSING");
    assert.equal(fact(first, "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E").reportedValue, null);

    const electricity = first.disclosures.find((item) => item.id === "B3")?.facts.filter((item) => item.datapointId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY") ?? [];
    assert.deepEqual(electricity.map((item) => item.dimensionMember), ["Non-renewable energy", "Renewable energy", "Total"]);
    assert.equal(electricity[1]?.unit, "MWh");
    assert.equal(fact(first, "B3_ENERGY_CONSUMPTION_FROM_FUELS", null, "Renewable energy").reportedValue, "0");

    const sites = first.disclosures.find((item) => item.id === "B1")?.facts.filter((item) => item.datapointId === "B1_SITE_IDENTIFIER") ?? [];
    assert.deepEqual(sites.map((item) => item.reportedValue), ["Plant A", "Plant B"]);
    assert.equal(fact(first, "B5_ASSESSED_SITE_REFERENCE", "assessment-1").reportedValue, "site-a");
    assert.equal(fact(first, "B6_WATER_STRESS_SITE_REFERENCE", "water-1").reportedValue, "site-a");

    const pollutants = first.disclosures.find((item) => item.id === "B4")?.facts.filter((item) => item.datapointId === "B4_POLLUTANT_IDENTITY") ?? [];
    assert.deepEqual(pollutants.map((item) => item.reportedValue), ["Dust", "Nitrogen"]);
    assert.equal(fact(first, "B7_WASTE_DIVERTED_PROPORTION").reportedValue, "0");
    assert.equal(first.disclosures.some((item) => item.facts.some((entry) => entry.datapointId === "B7_WASTE_RECYCLING_PERCENT_MASS")), false);
    assert.equal(first.disclosures.some((item) => item.facts.some((entry) => entry.datapointId === "B3_SCOPE1_SCOPE2_LOCATION_TOTAL")), false);

    assert.equal(fact(first, "B9_RECORDABLE_ACCIDENT_RATE").reportedValue, "1.5");
    assert.equal(fact(first, "B9_ACCIDENT_RATE_BASIS").publication, "PREPARATION_CONTEXT");
    assert.equal(fact(first, "B9_ACCIDENT_RATE_BASIS").reportedValue, "BASIS_200000_HOURS");
    assert.equal(fact(first, "B10_MINIMUM_WAGE_DETERMINATION").publication, "PREPARATION_CONTEXT");
    assert.equal(fact(first, "B10_MINIMUM_WAGE_DETERMINATION").reportedValue, "STATUTORY_MINIMUM_WAGE");
    assert.equal(fact(first, "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE").reportedValue, "false");
    assert.equal(fact(first, "B11_CONVICTIONS_COUNT").reportedValue, "2");
    assert.equal(fact(first, "B11_FINES_AMOUNT").reportedValue, "1500");

    assert.equal(first.omittedDisclosures.length, 1);
    assert.equal(first.omittedDisclosures[0]?.datapointId, omitted);
    assert.equal(first.omittedDisclosures[0]?.reason, "22(b)");
    assert.equal(first.omittedDisclosures[0]?.independentLegalApproval, false);
    assert.equal(first.disclosures.some((item) => item.facts.some((entry) => entry.datapointId === omitted)), false);

    assert.equal(first.supplementaryInformation.length, 2);
    assert.deepEqual(first.supplementaryInformation.map((item) => item.rowId), ["scope3-1", "scope3-9"]);
    assert.equal(first.supplementaryInformation[0]?.evaluation, "NOT_EVALUATED_AS_BASIC_MODULE");
    assert.equal(first.supplementaryInformation[0]?.cells[0]?.reportedValue, "3");
    assert.equal(first.supplementaryInformation[1]?.cells[0]?.reportedValue, "4");

    const serialised = stableStringify(first);
    assert.equal(serialised.includes("991.25"), false);
    assert.equal(serialised.includes("password"), false);
    assert.equal(serialised.includes("cookie"), false);
    assert.equal(/secret/i.test(serialised), false);
    assert.equal(first.validation.limitations.some((item) => item.includes("not a limitation of Regulation")), true);
  });

  it("drops an unverified legacy value instead of reporting it", () => {
    const dataset = datasetFor(input, ["B1_LEGAL_FORM"]);
    assert.equal(fact(dataset, "B1_LEGAL_FORM").reportedValue, null);
    assert.equal(fact(dataset, "B1_LEGAL_FORM").valueStatus, "EXCLUDED_UNVERIFIED_ORIGIN");
    assert.deepEqual(dataset.validation.provenanceExclusions, ["B1_LEGAL_FORM"]);
    assert.equal(stableStringify(dataset).includes("Aktiebolag"), false);
  });

  it("renders a draft without a declaration and a final file from the frozen dataset", () => {
    const dataset = datasetFor(input);
    const draft = renderDraftReportFile(dataset);
    const parsed = JSON.parse(draft) as { status: string; dataset: VS2026ReportDataset; contentHash: string };
    assert.equal(parsed.status, "DRAFT");
    assert.equal(parsed.dataset.conformityStatement, null);
    assert.equal(parsed.dataset.validation.complianceClaim, "NOT_EVALUATED");
    assert.equal(parsed.contentHash, hashReportDataset(parsed.dataset));
    assert.equal(draft.endsWith("\n"), true);
    assert.equal(renderDraftReportFile(dataset), draft);

    const finalDataset: VS2026ReportDataset = {
      ...dataset,
      metadata: { ...dataset.metadata, status: "FINAL" },
      conformityStatement: {
        text: "Northwind AB states Option A.",
        acceptedBy: "AUTHENTICATED_ORGANISATION_USER",
        legalEffect: "UNDERTAKING_DECLARATION",
        assuranceOpinion: false,
      },
    };
    const body = renderFinalReportFile({
      snapshotId: "snap-1",
      revision: 1,
      finalisedAt: "2026-11-27T12:00:00.000Z",
      finalisedByUserId: "user-1",
      contentHash: hashReportDataset(finalDataset),
      dataset: finalDataset,
    });
    const finalFile = JSON.parse(body) as { status: string; revision: number; dataset: VS2026ReportDataset };
    assert.equal(finalFile.status, "FINAL");
    assert.equal(finalFile.revision, 1);
    assert.equal(finalFile.dataset.conformityStatement?.assuranceOpinion, false);
    assert.equal(body.includes("XBRL filing"), true);
  });
});

describe("VS 2026 finalisation gate", () => {
  it("blocks every unsupported report and ignores a caller-supplied ready flag", () => {
    assert.equal(finalisationDecision({
      configuration: "LEGACY",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    })?.code, "NOT_CONFIGURED");
    assert.equal(finalisationDecision({
      configuration: "INVALID",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    })?.code, "INVALID_REPORTING_STATE");
    assert.equal(finalisationDecision({
      configuration: "OPTION_B",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    })?.code, "OPTION_B_UNSUPPORTED");
    assert.equal(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: ["C5"],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    })?.code, "UNSUPPORTED_COMPREHENSIVE");
    assert.equal(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: ["B1_LEGAL_FORM"],
      confirmed: true,
    })?.code, "LEGACY_VALUE_PROVENANCE");
    assert.match(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "UNKNOWN",
      provenanceFieldIds: [],
      confirmed: true,
    })?.message ?? "", /reporting year does not/i);
    assert.match(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "SUBSEQUENT",
      provenanceFieldIds: [],
      confirmed: true,
    })?.message ?? "", /Subsequent-year/);
    assert.equal(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "IN_PROGRESS",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    })?.code, "NOT_READY");
    assert.equal(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: false,
    })?.code, "CONFIRMATION_REQUIRED");
    assert.equal(finalisationDecision({
      configuration: "OPTION_A",
      additionalComprehensiveDisclosures: [],
      readiness: "READY_FOR_REVIEW",
      comparativeBasis: "FIRST_YEAR",
      provenanceFieldIds: [],
      confirmed: true,
    }), null);

    const source = readFileSync(new URL("./reportFinalise.ts", import.meta.url), "utf8");
    assert.equal(source.includes("assertSystemReadyForExport"), false);
    assert.equal(source.includes("runReadinessCheckForOrganization"), true);
    const route = readFileSync(new URL("../../../app/api/vsme/vs2026/report/[reportingPeriodId]/finalise/route.ts", import.meta.url), "utf8");
    assert.equal(route.includes("conformityStatement"), false);
    assert.equal(route.includes("finalisedByUserId"), false);
    assert.equal(route.includes("ready"), false);
  });

  it("recognises an unmarked registry value and a verified editor value", () => {
    assert.deepEqual(unverifiedVs2026FieldIds([
      { fieldId: "legacy-vsme-field", legacyFieldId: null, migratedFieldId: null, migrationStatus: null, reportingOrigin: null },
      { fieldId: "B1_LEGAL_FORM", legacyFieldId: "old", migratedFieldId: null, migrationStatus: null, reportingOrigin: "VS2026_EDITOR" },
      { fieldId: "B1_NACE_CODES", legacyFieldId: null, migratedFieldId: null, migrationStatus: null, reportingOrigin: null },
      { fieldId: "B1_TURNOVER", legacyFieldId: null, migratedFieldId: null, migrationStatus: null, reportingOrigin: "VS2026_EDITOR" },
    ]), ["B1_LEGAL_FORM", "B1_NACE_CODES"]);
  });
});
