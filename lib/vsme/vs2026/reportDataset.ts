import type { DatapointEvaluation, OmissionClaimInput, ReportEvaluation } from "./evaluation";
import { disclosureDatapoints } from "./registry";
import type { ReportingReview } from "./reportingState";
import type { ComparativeBasis } from "./reportingStandard";
import { editorDisclosures, registryDatapoint } from "./scalarEligibility";

export const VS2026_REPORT_FORMAT = "librevs-vs2026-report";
export const VS2026_REPORT_FORMAT_VERSION = "1";
export const VS2026_REGULATORY_VERSION = "EU-2026/1560";
export const VS2026_REGULATORY_INSTRUMENT = "Commission Delegated Regulation (EU) 2026/1560";

const SCOPE3_GROUP = "B3_SCOPE3_SIGNIFICANT_CATEGORIES";
const COMPLIANCE_STATEMENT = "B1_EXPLICIT_COMPLIANCE_STATEMENT";
const IMPLEMENTATION_NOTE =
  "This LibreVS version finalises an explicit first year of VS 2026 Option A reporting. Comparative information under paragraph 14 and unchanged-information references under paragraph 18 are not produced. That is a limitation of this version, not a limitation of Regulation (EU) 2026/1560.";

const DATAPOINT_ORDER = new Map<string, number>();
let datapointSequence = 0;
for (const disclosure of editorDisclosures()) {
  for (const datapoint of disclosureDatapoints(disclosure, true)) {
    DATAPOINT_ORDER.set(datapoint.id, datapointSequence);
    datapointSequence += 1;
  }
}

export type ReportPublication = "REPORTED_FACT" | "PREPARATION_CONTEXT";

export type ReportFact = {
  datapointId: string;
  label: string;
  paragraph: string;
  repeatingGroupId: string | null;
  requirementType: string;
  applicability: string;
  legalApplicability: string;
  employeeSizeTreatment: string;
  completionStatus: string;
  valueStatus: string;
  outputRole: string;
  informationClass: string;
  publication: ReportPublication;
  reportedValue: string | null;
  unit: string | null;
  dimensionMember: string | null;
  rowId: string | null;
};

export type ReportDisclosure = {
  id: string;
  title: string;
  facts: ReportFact[];
};

export type SupplementaryCell = {
  datapointId: string;
  label: string;
  reportedValue: string;
  unit: string | null;
  dimensionMember: string;
};

export type SupplementaryInformation = {
  kind: "SCOPE_3_CATEGORY";
  evaluation: "NOT_EVALUATED_AS_BASIC_MODULE";
  limitation: string;
  rowId: string;
  position: number;
  cells: SupplementaryCell[];
};

export type OmittedDisclosure = {
  datapointId: string;
  label: string;
  paragraph: string;
  rowId: string | null;
  reason: "22(a)" | "22(b)" | "22(c)" | "22(d)" | null;
  reassessedForPeriod: boolean;
  conditionsAssessed: boolean;
  attestation: "STRUCTURAL_UNDERTAKING_ATTESTATION";
  independentLegalApproval: false;
};

export type ConformityStatement = {
  text: string;
  acceptedBy: "AUTHENTICATED_ORGANISATION_USER";
  legalEffect: "UNDERTAKING_DECLARATION";
  assuranceOpinion: false;
};

export type ReportValidationSummary = {
  readiness: ReportingReview["readiness"];
  complianceClaim: "NOT_EVALUATED";
  comparativeBasis: ComparativeBasis;
  issues: { code: string; datapointId: string | null; message: string }[];
  unsupportedDisclosures: string[];
  provenanceExclusions: string[];
  limitations: string[];
};

export type VS2026ReportDataset = {
  metadata: {
    format: typeof VS2026_REPORT_FORMAT;
    formatVersion: typeof VS2026_REPORT_FORMAT_VERSION;
    regulatoryInstrument: typeof VS2026_REGULATORY_INSTRUMENT;
    regulatoryVersion: typeof VS2026_REGULATORY_VERSION;
    annex: "I";
    status: "DRAFT" | "FINAL";
    reportingPeriodId: string;
    year: number | null;
    reportingOption: "OPTION_A" | "OPTION_B" | null;
    currency: string;
  };
  undertaking: { name: string; currency: string };
  basisOfPreparation: {
    reportingOption: "OPTION_A" | "OPTION_B" | null;
    comparativeBasis: ComparativeBasis;
    currency: string;
    organisationalBoundary: string | null;
    comparativeInformation: "NOT_IMPLEMENTED";
    unchangedInformationReferences: "NOT_IMPLEMENTED";
    implementationNote: string;
  };
  disclosures: ReportDisclosure[];
  supplementaryInformation: SupplementaryInformation[];
  omittedDisclosures: OmittedDisclosure[];
  validation: ReportValidationSummary;
  conformityStatement: ConformityStatement | null;
};

export type ReportRowInput = {
  rowId: string;
  groupId: string;
  position: number;
  cells: readonly {
    datapointId: string;
    dimensionMember: string;
    value: string;
    unit: string | null;
  }[];
};

export type ReportDatasetInput = {
  reportingPeriodId: string;
  year: number | null;
  undertakingName: string;
  currency: string;
  comparativeBasis: ComparativeBasis;
  report: ReportEvaluation;
  review: ReportingReview;
  rows: readonly ReportRowInput[];
  omissions: readonly OmissionClaimInput[];
  provenanceExclusions: readonly string[];
  status: "DRAFT" | "FINAL";
  conformityStatement: ConformityStatement | null;
};

export type VS2026ReportPanel = {
  currency: string;
  proposedStatement: string;
  snapshots: { id: string; revision: number; finalisedAt: string; contentHash: string }[];
};

export function proposedConformityStatement(input: {
  undertakingName: string;
  year: number | null;
}): string {
  const name = input.undertakingName.trim() || "The undertaking";
  const year = input.year === null ? "the reporting period" : String(input.year);
  return (
    `${name} states that this sustainability report for ${year} is prepared in conformity with ` +
    "Commission Delegated Regulation (EU) 2026/1560, Option A — Basic Module. " +
    "The information is supplied by the undertaking. The undertaking is responsible for its correctness and has reviewed the declared reporting basis. " +
    "Any paragraph 22 omissions are the undertaking's own assessments. " +
    "This statement is the undertaking's declaration. It is not an assurance opinion."
  );
}

export function conformityStatementFor(text: string): ConformityStatement {
  return {
    text,
    acceptedBy: "AUTHENTICATED_ORGANISATION_USER",
    legalEffect: "UNDERTAKING_DECLARATION",
    assuranceOpinion: false,
  };
}

export function buildVS2026ReportDataset(input: ReportDatasetInput): VS2026ReportDataset {
  const exclusions = new Set(input.provenanceExclusions);
  const positions = new Map(input.rows.map((row) => [row.rowId, row.position]));
  const factsByDisclosure = new Map<string, ReportFact[]>();
  for (const disclosure of editorDisclosures()) {
    factsByDisclosure.set(disclosure.id, []);
  }

  for (const datapoint of input.report.datapoints) {
    if (!includeFact(datapoint)) {
      continue;
    }
    const facts = factsByDisclosure.get(datapoint.disclosureId);
    if (!facts) {
      continue;
    }
    facts.push(toFact(datapoint, exclusions.has(datapoint.datapointId)));
  }
  for (const facts of factsByDisclosure.values()) {
    facts.sort((left, right) => compareFacts(left, right, positions));
  }

  const disclosures: ReportDisclosure[] = editorDisclosures().map((disclosure) => ({
    id: disclosure.id,
    title: disclosure.title,
    facts: factsByDisclosure.get(disclosure.id) ?? [],
  }));
  const boundary = disclosures
    .flatMap((disclosure) => disclosure.facts)
    .find((fact) => fact.datapointId === "B1_REPORTING_BASIS" && fact.rowId === null);
  const statement = input.status === "FINAL" ? input.conformityStatement : null;
  const limitations = [...input.review.limitations];
  if (!limitations.includes(IMPLEMENTATION_NOTE)) {
    limitations.push(IMPLEMENTATION_NOTE);
  }

  return {
    metadata: {
      format: VS2026_REPORT_FORMAT,
      formatVersion: VS2026_REPORT_FORMAT_VERSION,
      regulatoryInstrument: VS2026_REGULATORY_INSTRUMENT,
      regulatoryVersion: VS2026_REGULATORY_VERSION,
      annex: "I",
      status: input.status,
      reportingPeriodId: input.reportingPeriodId,
      year: input.year,
      reportingOption: input.report.reportingOption,
      currency: input.currency,
    },
    undertaking: {
      name: input.undertakingName.trim() || "The undertaking",
      currency: input.currency,
    },
    basisOfPreparation: {
      reportingOption: input.report.reportingOption,
      comparativeBasis: input.comparativeBasis,
      currency: input.currency,
      organisationalBoundary: boundary?.reportedValue ?? null,
      comparativeInformation: "NOT_IMPLEMENTED",
      unchangedInformationReferences: "NOT_IMPLEMENTED",
      implementationNote: IMPLEMENTATION_NOTE,
    },
    disclosures,
    supplementaryInformation: supplementary(input.rows),
    omittedDisclosures: omitted(input.report.datapoints, input.omissions),
    validation: {
      readiness: input.review.readiness,
      complianceClaim: "NOT_EVALUATED",
      comparativeBasis: input.comparativeBasis,
      issues: [...input.review.issues]
        .map((item) => ({
          code: item.code,
          datapointId: item.datapointId,
          message: item.message,
        }))
        .sort(compareIssues),
      unsupportedDisclosures: input.report.unsupportedDisclosures
        .map((item) => item.disclosureId)
        .sort(),
      provenanceExclusions: [...exclusions].sort(),
      limitations,
    },
    conformityStatement: statement,
  };
}

function includeFact(datapoint: DatapointEvaluation): boolean {
  if (!datapoint.inReportingScope || datapoint.datapointId === COMPLIANCE_STATEMENT) {
    return false;
  }
  if (datapoint.informationClass === "CALCULATED_FACT" || datapoint.informationClass === "DIGITAL_FACT") {
    return false;
  }
  if (datapoint.informationClass === "SUPPLEMENTARY") {
    return false;
  }
  if (datapoint.outputRole === "CALCULATED" || datapoint.outputRole === "DIGITAL_ONLY") {
    return false;
  }
  if (datapoint.omissionStatus === "VALID") {
    return false;
  }
  return true;
}

function toFact(datapoint: DatapointEvaluation, excluded: boolean): ReportFact {
  const definition = registryDatapoint(datapoint.datapointId);
  const preparation =
    datapoint.informationClass === "PREPARATION_DATA" || datapoint.outputRole === "PREPARATION_ONLY";
  return {
    datapointId: datapoint.datapointId,
    label: definition?.regulatoryStatement ?? datapoint.datapointId,
    paragraph: definition?.paragraph ?? "",
    repeatingGroupId: definition?.repeatingGroupId ?? null,
    requirementType: datapoint.requirementType,
    applicability: datapoint.applicability,
    legalApplicability: datapoint.legalApplicability,
    employeeSizeTreatment: datapoint.employeeSizeTreatment,
    completionStatus: datapoint.completionStatus,
    valueStatus: excluded ? "EXCLUDED_UNVERIFIED_ORIGIN" : datapoint.valueStatus,
    outputRole: datapoint.outputRole,
    informationClass: datapoint.informationClass,
    publication: preparation ? "PREPARATION_CONTEXT" : "REPORTED_FACT",
    reportedValue: excluded ? null : datapoint.recordedValue,
    unit: datapoint.recordedUnit,
    dimensionMember: datapoint.dimensionMember,
    rowId: datapoint.rowId,
  };
}

function compareFacts(
  left: ReportFact,
  right: ReportFact,
  positions: ReadonlyMap<string, number>,
): number {
  const order = orderOf(left.datapointId) - orderOf(right.datapointId);
  if (order !== 0) {
    return order;
  }
  const position = positionOf(left.rowId, positions) - positionOf(right.rowId, positions);
  if (position !== 0) {
    return position;
  }
  const row = (left.rowId ?? "").localeCompare(right.rowId ?? "");
  if (row !== 0) {
    return row;
  }
  return (left.dimensionMember ?? "").localeCompare(right.dimensionMember ?? "");
}

function positionOf(rowId: string | null, positions: ReadonlyMap<string, number>): number {
  if (!rowId) {
    return -1;
  }
  return positions.get(rowId) ?? 0;
}

function orderOf(datapointId: string): number {
  return DATAPOINT_ORDER.get(datapointId) ?? datapointSequence;
}

function supplementary(rows: readonly ReportRowInput[]): SupplementaryInformation[] {
  return rows
    .filter((row) => row.groupId === SCOPE3_GROUP)
    .slice()
    .sort((left, right) => left.position - right.position || left.rowId.localeCompare(right.rowId))
    .map((row) => ({
      kind: "SCOPE_3_CATEGORY" as const,
      evaluation: "NOT_EVALUATED_AS_BASIC_MODULE" as const,
      limitation:
        "This Scope 3 category was stored by the undertaking. It is supplementary. It was not evaluated as a Basic Module requirement and it is not a mandatory Basic Module disclosure.",
      rowId: row.rowId,
      position: row.position,
      cells: row.cells
        .slice()
        .sort(
          (left, right) =>
            orderOf(left.datapointId) - orderOf(right.datapointId) ||
            left.dimensionMember.localeCompare(right.dimensionMember),
        )
        .map((cell) => ({
          datapointId: cell.datapointId,
          label: registryDatapoint(cell.datapointId)?.regulatoryStatement ?? cell.datapointId,
          reportedValue: cell.value,
          unit: cell.unit,
          dimensionMember: cell.dimensionMember,
        })),
    }));
}

function omitted(
  datapoints: readonly DatapointEvaluation[],
  claims: readonly OmissionClaimInput[],
): OmittedDisclosure[] {
  const records: OmittedDisclosure[] = [];
  for (const datapoint of datapoints) {
    if (!datapoint.inReportingScope || datapoint.omissionStatus !== "VALID") {
      continue;
    }
    const claim = claims.find(
      (item) => item.datapointId === datapoint.datapointId && (item.rowId ?? null) === datapoint.rowId,
    );
    const definition = registryDatapoint(datapoint.datapointId);
    records.push({
      datapointId: datapoint.datapointId,
      label: definition?.regulatoryStatement ?? datapoint.datapointId,
      paragraph: definition?.paragraph ?? "",
      rowId: datapoint.rowId,
      reason: claim?.reason ?? null,
      reassessedForPeriod: claim?.reassessedForPeriod === true,
      conditionsAssessed: claim?.conditionsAssessed === true,
      attestation: "STRUCTURAL_UNDERTAKING_ATTESTATION",
      independentLegalApproval: false,
    });
  }
  return records.sort(
    (left, right) =>
      orderOf(left.datapointId) - orderOf(right.datapointId) ||
      (left.rowId ?? "").localeCompare(right.rowId ?? ""),
  );
}

function compareIssues(
  left: { code: string; datapointId: string | null; message: string },
  right: { code: string; datapointId: string | null; message: string },
): number {
  return (
    left.code.localeCompare(right.code) ||
    (left.datapointId ?? "").localeCompare(right.datapointId ?? "") ||
    left.message.localeCompare(right.message)
  );
}
