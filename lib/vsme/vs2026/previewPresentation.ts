import type {
  ApplicabilityEvaluation,
  CompletionStatus,
  DatapointEvaluation,
  EmployeeSizeTreatment,
  ExportInclusion,
  LegalApplicability,
  OmissionStatus,
  ReportEvaluation,
  ValueStatus,
} from "./evaluation";
import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import type { LoadedRepeatingRow } from "./reportingDataLoader";
import {
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
  disclosureDatapoints,
} from "./registry";
import type { Vs2026Datapoint, Vs2026Disclosure } from "./registry/types";
import type { RequirementType } from "./types";

const DISCLOSURES: readonly Vs2026Disclosure[] = [
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
];

const DATAPOINTS: ReadonlyMap<string, Vs2026Datapoint> = new Map(
  DISCLOSURES.flatMap((disclosure) =>
    disclosureDatapoints(disclosure, true).map((datapoint) => [datapoint.id, datapoint] as const),
  ),
);

const REASON_TEXT: Readonly<Record<string, string>> = {
  ALWAYS: "The registry treats this item as always in the disclosure.",
  CONDITION_MET: "The condition recorded for this item is met.",
  CONDITION_NOT_MET: "The condition recorded for this item is not met.",
  CONDITION_UNASSESSED: "The condition has not been assessed.",
  NOT_CONFIGURED: "No reporting option is stored for this period.",
  OUT_OF_SCOPE: "This item is outside the stored reporting option.",
  CONFIGURATION_REJECTED: "The stored reporting configuration could not be used.",
  INFORMATION_CLASS_NOT_COMPLETION_TARGET: "This item is not a completion fact.",
  CALCULATION_NOT_IMPLEMENTED: "No calculation is performed in this preview.",
  MISSING_IS_NOT_ZERO: "A missing value is not treated as zero.",
  OMISSION_DOES_NOT_APPLY: "An omission does not apply because the item is not applicable.",
  PARAGRAPH_43_CONJUNCTION_UNRESOLVED: "The related conviction and fine condition is unresolved.",
  INTERNAL_DATA_QUALITY_REQUIREMENT: "An unassessed condition blocks review. This is a data-quality control.",
  PARAGRAPH_15_ASSUMED_NOT_APPLICABLE: "Paragraph 15 would treat an omitted if-applicable disclosure as not applicable. The condition is still unassessed here.",
  B1_27B_LIST_INCOMPLETE: "The omitted-disclosure list does not yet match the claim.",
  EMPLOYEE_SIZE_MEASURE_REJECTED: "The explicit employee-size measure was rejected.",
  EMPLOYEE_SIZE_NOT_PROVIDED: "No explicit employee-size measure is stored.",
  EMPLOYEE_SIZE_RELIEF_VOLUNTARY: "The explicit measure is 10 employees or fewer, so this item is voluntary.",
  IDENTIFIED_RELATIONSHIP_HAS_NO_ROW: "An identified relationship has no stored row.",
  EMPTY_REPEATING_GROUP_PERMITTED: "This repeating group may be empty.",
  REPEATING_CARDINALITY_OPEN: "The number of rows is not capped at five.",
  SITE_REFERENCE_NOT_IN_B1_INVENTORY: "The site reference does not name a B1 site in this period.",
  DERIVED_FROM_REPORTING_CONFIGURATION: "The reporting option is taken from the stored configuration.",
  CONFIGURATION_VALUE_CONFLICT: "A stored option value differs from the reporting configuration.",
  OMISSION_REASON_MISSING: "The omission has no recognised paragraph 22 reason.",
  CONDITIONS_NOT_ASSESSED: "The omission conditions have not been assessed.",
  OMISSION_NOT_REASSESSED: "The omission has not been reassessed for this period.",
  DUPLICATE_LOGICAL_FACT: "Two stored values share the same datapoint and dimension.",
  SELF_DESCRIBING_CONDITION: "The disclosure itself records whether the condition exists.",
  GUIDANCE_OUTSIDE_ANNEX_I: "This text is guidance outside the Annex I datapoint.",
  LEGAL_RESTRICTION_NOT_PARAGRAPH_22: "A legal restriction is recorded separately from paragraph 22.",
  CONDITION_MEMBER_UNRESOLVED: "The stored condition member is unresolved.",
  UNKNOWN_CONDITION_MEMBER: "The stored condition member is not recognised.",
};

const ISSUE_TEXT: Readonly<Record<string, string>> = {
  UNKNOWN_GROUP: "A stored row uses a group the registry does not recognise.",
  UNKNOWN_DATAPOINT: "A stored value uses a datapoint the registry does not recognise.",
  SCALAR_STORED_AS_REPEATING_CELL: "A scalar datapoint was stored as a repeating cell.",
  REPEATING_DATAPOINT_STORED_AS_SCALAR: "A repeating datapoint was stored as a scalar value.",
  GROUP_MISMATCH: "A cell does not belong to its row group.",
  PARENT_REQUIRED: "A row is missing its parent.",
  PARENT_NOT_ALLOWED: "A row has a parent it cannot have.",
  PARENT_NOT_SITE: "A site-based row does not name a B1 site.",
  PARENT_PERIOD_MISMATCH: "A parent row belongs to another reporting period.",
  PARENT_NOT_IN_PERIOD: "A parent row is not in this reporting period.",
  SITE_REFERENCE_CONFLICT: "A stored site reference disagrees with the parent site.",
  DUPLICATE_SINGLETON_ROW: "A group that allows one row has more than one row.",
  DUPLICATE_DIMENSION: "The same dimension member is stored twice.",
  DUPLICATE_OMISSION: "The same omission is stored twice.",
  DUPLICATE_EMPLOYEE_MEASURE: "More than one employee-size measure is stored.",
  MALFORMED_VALUE: "A stored value does not match the expected form.",
  LEGACY_CONFIGURATION_CONFLICT: "A stored module option disagrees with the reporting configuration.",
};

export type PreviewDatapoint = {
  readonly datapointId: string;
  readonly label: string;
  readonly reference: string;
  readonly dimensionMember: string | null;
  readonly rowId: string | null;
  readonly recordedValue: string | null;
  readonly recordedUnit: string | null;
  readonly requirementType: string;
  readonly applicability: string;
  readonly employeeSizeTreatment: string;
  readonly valueStatus: string;
  readonly completionStatus: string;
  readonly outputInclusion: string;
  readonly explanations: readonly string[];
};

export type PreviewDisclosure = {
  readonly id: string;
  readonly heading: string;
  readonly evaluatedFacts: number;
  readonly outstandingRequired: number;
  readonly unassessedConditions: number;
  readonly voluntary: number;
  readonly invalid: number;
  readonly datapoints: readonly PreviewDatapoint[];
};

export type PreviewRepeatingCell = {
  readonly datapointId: string;
  readonly label: string;
  readonly dimensionMember: string;
  readonly value: string;
  readonly unit: string | null;
};

export type PreviewRepeatingRow = {
  readonly rowId: string;
  readonly groupId: string;
  readonly groupLabel: string;
  readonly parentRowId: string | null;
  readonly parentLabel: string | null;
  readonly cells: readonly PreviewRepeatingCell[];
};

export type RegulatoryPreviewView = {
  readonly notice: "VS 2026 diagnostic preview — not a compliance assessment.";
  readonly reportingOptionLabel: string;
  readonly configurationStatus: ReportEvaluation["configurationStatus"];
  readonly configurationDetail: string | null;
  readonly employeeCategoryLabel: string;
  readonly employeeCategoryResolved: boolean;
  readonly employeeSizeDetail: string | null;
  readonly evaluatedDisclosureCount: number;
  readonly completionAssessment: "Not evaluated";
  readonly complianceClaim: "Not evaluated";
  readonly reviewFlag: {
    readonly readyForReview: boolean;
    readonly label: string;
  };
  readonly optionBNotice: string | null;
  readonly additionalComprehensive: readonly {
    readonly disclosureId: string;
    readonly label: string;
  }[];
  readonly summary: {
    readonly reported: number;
    readonly reportedZero: number;
    readonly reportedFalse: number;
    readonly missingEssential: number;
    readonly voluntary: number;
    readonly notApplicable: number;
    readonly unassessed: number;
    readonly structurallyOmitted: number;
    readonly unverifiedOmissions: number;
    readonly unsupported: number;
    readonly invalid: number;
  };
  readonly disclosures: readonly PreviewDisclosure[];
  readonly repeatingRows: readonly PreviewRepeatingRow[];
  readonly diagnostics: readonly string[];
};

export function explainPersistedIssue(code: string): string {
  return ISSUE_TEXT[code] ?? "Stored reporting data could not be evaluated.";
}

export function buildRegulatoryPreviewView(
  report: ReportEvaluation,
  loaded: {
    readonly rows: readonly LoadedRepeatingRow[];
    readonly excludedFieldIds: readonly string[];
  },
): RegulatoryPreviewView {
  const disclosures = DISCLOSURES.map((disclosure) =>
    disclosureSection(disclosure, report.datapoints),
  );
  const ignored = [
    ...report.ignoredFactIds.map(
      (id) => `Ignored fact: ${id}. This value was not evaluated and is not complete.`,
    ),
    ...report.ignoredGroupIds.map(
      (id) => `Ignored group: ${id}. Rows in this group were not evaluated.`,
    ),
  ];
  const excluded = loaded.excludedFieldIds
    .filter((id) => id !== VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE)
    .map((id) => `Stored field ${id} is outside the VS 2026 registry and was not evaluated.`);
  const reviewBlockedByDiagnostics =
    report.ignoredFactIds.length > 0 ||
    report.ignoredGroupIds.length > 0 ||
    report.employeeSizeRejection !== null ||
    report.unsupportedDisclosures.length > 0;

  return {
    notice: "VS 2026 diagnostic preview — not a compliance assessment.",
    reportingOptionLabel: reportingOptionLabel(report),
    configurationStatus: report.configurationStatus,
    configurationDetail: configurationDetail(report),
    employeeCategoryLabel: employeeCategoryLabel(report),
    employeeCategoryResolved: report.employeeCategory !== null,
    employeeSizeDetail: employeeSizeDetail(report),
    evaluatedDisclosureCount: disclosures.filter((item) => item.evaluatedFacts > 0).length,
    completionAssessment: "Not evaluated",
    complianceClaim: "Not evaluated",
    reviewFlag: {
      readyForReview: report.readiness.readyForReview,
      label: reviewLabel(report.readiness.readyForReview, reviewBlockedByDiagnostics),
    },
    optionBNotice:
      report.reportingOption === "OPTION_B"
        ? "Comprehensive evaluation is not yet implemented. This preview does not claim completion or compliance."
        : null,
    additionalComprehensive: report.unsupportedDisclosures.map((item) => ({
      disclosureId: item.disclosureId,
      label:
        item.scope === "ADDITIONAL_COMPREHENSIVE"
          ? `${item.disclosureId} is additional Comprehensive information. Its evaluation is not implemented, and the report remains Option A.`
          : `${item.disclosureId} is in the Comprehensive Module. Its evaluation is not implemented.`,
    })),
    summary: summarise(report),
    disclosures,
    repeatingRows: loaded.rows.map((row) => repeatingRow(row, loaded.rows)),
    diagnostics: [...ignored, ...excluded],
  };
}

function summarise(report: ReportEvaluation): RegulatoryPreviewView["summary"] {
  const items = report.datapoints;
  return {
    reported: items.filter((item) => item.valueStatus === "PRESENT").length,
    reportedZero: items.filter((item) => item.valueStatus === "REPORTED_ZERO").length,
    reportedFalse: items.filter((item) => item.valueStatus === "REPORTED_FALSE").length,
    missingEssential: items.filter(
      (item) => item.requirementType === "ESSENTIAL" && item.completionStatus === "REQUIRED_MISSING",
    ).length,
    voluntary: items.filter(
      (item) => item.completionStatus === "VOLUNTARY_MISSING" || item.requirementType === "VOLUNTARY",
    ).length,
    notApplicable: items.filter((item) => item.completionStatus === "NOT_APPLICABLE").length,
    unassessed: items.filter((item) => item.completionStatus === "BLOCKED_UNASSESSED").length,
    structurallyOmitted: items.filter((item) => item.omissionStatus === "VALID").length,
    unverifiedOmissions: items.filter((item) => item.omissionStatus === "UNVERIFIED").length,
    unsupported: report.unsupportedDisclosures.length,
    invalid: items.filter((item) => item.valueStatus === "INVALID").length + report.ignoredFactIds.length,
  };
}

function disclosureSection(
  disclosure: Vs2026Disclosure,
  datapoints: readonly DatapointEvaluation[],
): PreviewDisclosure {
  const items = datapoints.filter((item) => item.disclosureId === disclosure.id);
  return {
    id: disclosure.id,
    heading: `${disclosure.id} — ${disclosure.title}`,
    evaluatedFacts: items.length,
    outstandingRequired: items.filter((item) => item.completionStatus === "REQUIRED_MISSING").length,
    unassessedConditions: items.filter((item) => item.completionStatus === "BLOCKED_UNASSESSED").length,
    voluntary: items.filter(
      (item) => item.employeeSizeTreatment === "VOLUNTARY" || item.completionStatus === "VOLUNTARY_MISSING",
    ).length,
    invalid: items.filter((item) => item.valueStatus === "INVALID").length,
    datapoints: items.map(presentDatapoint),
  };
}

function presentDatapoint(item: DatapointEvaluation): PreviewDatapoint {
  const definition = DATAPOINTS.get(item.datapointId);
  return {
    datapointId: item.datapointId,
    label: definition?.regulatoryStatement ?? item.datapointId,
    reference: definition ? `Paragraph ${definition.paragraph}` : "No registry reference",
    dimensionMember: item.dimensionMember,
    rowId: item.rowId,
    recordedValue: item.recordedValue,
    recordedUnit: item.recordedUnit,
    requirementType: requirementLabel(item.requirementType),
    applicability: applicabilityLabel(item.applicability, item.legalApplicability),
    employeeSizeTreatment: employeeTreatmentLabel(item.employeeSizeTreatment),
    valueStatus: valueLabel(item.valueStatus),
    completionStatus: completionLabel(item.completionStatus, item.omissionStatus),
    outputInclusion: inclusionLabel(item.exportInclusion),
    explanations: item.reasons.map((reason) => REASON_TEXT[reason] ?? reason),
  };
}

function repeatingRow(
  row: LoadedRepeatingRow,
  rows: readonly LoadedRepeatingRow[],
): PreviewRepeatingRow {
  const parent = row.parentRowId ? rows.find((item) => item.rowId === row.parentRowId) : undefined;
  const parentIdentifier = parent?.cells.find((cell) => cell.datapointId === "B1_SITE_IDENTIFIER");
  return {
    rowId: row.rowId,
    groupId: row.groupId,
    groupLabel: groupLabel(row.groupId),
    parentRowId: row.parentRowId,
    parentLabel: parentIdentifier?.value ?? null,
    cells: row.cells.map((cell) => ({
      datapointId: cell.datapointId,
      label: DATAPOINTS.get(cell.datapointId)?.regulatoryStatement ?? cell.datapointId,
      dimensionMember: cell.dimensionMember,
      value: cell.value,
      unit: cell.unit,
    })),
  };
}

function groupLabel(groupId: string): string {
  for (const disclosure of DISCLOSURES) {
    const group = disclosure.repeatingGroups.find((item) => item.id === groupId);
    if (group) {
      return group.regulatoryStatement;
    }
  }
  return DATAPOINTS.get(groupId)?.regulatoryStatement ?? groupId;
}

function reportingOptionLabel(report: ReportEvaluation): string {
  if (report.configurationStatus === "NOT_CONFIGURED") {
    return "Reporting option not configured";
  }
  if (report.configurationStatus === "REJECTED" || report.reportingOption === null) {
    return "Stored reporting configuration is invalid";
  }
  if (report.reportingOption === "OPTION_A") {
    return "Option A — Basic Module";
  }
  return "Option B — Basic Module and Comprehensive Module";
}

function configurationDetail(report: ReportEvaluation): string | null {
  if (report.configurationStatus === "NOT_CONFIGURED") {
    return "No reporting option is stored. This period is not treated as Option A.";
  }
  if (report.configurationStatus === "REJECTED") {
    return "The stored configuration was rejected. Option A was not assumed.";
  }
  return null;
}

function employeeCategoryLabel(report: ReportEvaluation): string {
  if (report.employeeCategory === "EMPLOYEES_LE_10") {
    return "10 employees or fewer";
  }
  if (report.employeeCategory === "EMPLOYEES_GT_10") {
    return "More than 10 employees";
  }
  return "Employee-size category not determined";
}

function employeeSizeDetail(report: ReportEvaluation): string | null {
  if (!report.employeeSizeRejection) {
    return report.employeeCategory
      ? "The category comes from the explicit proportionality measure for this period."
      : "No explicit proportionality measure is stored for this period.";
  }
  if (report.employeeSizeRejection === "NEGATIVE_EMPLOYEE_MEASURE") {
    return "The stored proportionality measure is negative and was not classified.";
  }
  if (report.employeeSizeRejection === "NON_FINITE_EMPLOYEE_MEASURE") {
    return "The stored proportionality measure is not a usable number and was not classified.";
  }
  if (report.employeeSizeRejection === "MEASURE_NOT_EXPLICIT") {
    return "The stored measure is not the explicit proportionality measure and was not classified.";
  }
  return "The explicit proportionality measure could not be classified.";
}

function reviewLabel(readyForReview: boolean, blockedByDiagnostics: boolean): string {
  if (!readyForReview) {
    return "Internal review flag: not ready. This flag is not a compliance result.";
  }
  if (blockedByDiagnostics) {
    return "Internal review flag: ready for review, but some records were excluded or are unsupported. This is not an authoritative assessment and it is not a compliance result.";
  }
  return "Internal review flag: ready for review. This flag is not a compliance result.";
}

function requirementLabel(value: RequirementType): string {
  switch (value) {
    case "ESSENTIAL":
      return "Essential";
    case "IF_APPLICABLE":
      return "If applicable";
    case "VOLUNTARY":
      return "Voluntary";
    case "SECTOR_CONSIDERATION":
      return "Sector consideration";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

function applicabilityLabel(
  applicability: ApplicabilityEvaluation,
  legal: LegalApplicability,
): string {
  switch (applicability) {
    case "ALWAYS":
      return "Always applicable";
    case "CONDITION_MET":
      return "Applicable";
    case "CONDITION_NOT_MET":
      return "Not applicable";
    case "CONDITION_UNASSESSED":
      return legal === "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15"
        ? "Awaiting applicability assessment. Paragraph 15 is not applied as a completed assessment."
        : "Awaiting applicability assessment";
    case "LEGALLY_RESTRICTED":
      return "Legally restricted";
    case "NOT_A_REGULATORY_CONDITION":
      return "Not a regulatory condition";
    default: {
      const exhaustive: never = applicability;
      return exhaustive;
    }
  }
}

function employeeTreatmentLabel(value: EmployeeSizeTreatment): string {
  switch (value) {
    case "NONE":
      return "No employee-size relief";
    case "VOLUNTARY":
      return "Voluntary for 10 employees or fewer";
    case "UNRESOLVED":
      return "Employee-size treatment unresolved";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

function valueLabel(value: ValueStatus): string {
  switch (value) {
    case "PRESENT":
      return "Reported";
    case "REPORTED_ZERO":
      return "Reported zero";
    case "REPORTED_FALSE":
      return "Reported false";
    case "MISSING":
      return "Missing";
    case "EMPTY":
      return "Empty";
    case "INVALID":
      return "Invalid";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

function completionLabel(value: CompletionStatus, omission: OmissionStatus): string {
  if (omission === "VALID") {
    return "Structurally omitted — not an independent legal approval";
  }
  if (omission === "UNVERIFIED") {
    return "Omission requiring verification";
  }
  switch (value) {
    case "COMPLETE":
      return "Recorded";
    case "REQUIRED_MISSING":
      return "Required and missing";
    case "VOLUNTARY_MISSING":
      return "Voluntary";
    case "NOT_APPLICABLE":
      return "Not applicable";
    case "BLOCKED_UNASSESSED":
      return "Awaiting applicability assessment";
    case "OUT_OF_SCOPE":
      return "Out of scope";
    case "OMISSION_UNVERIFIED":
      return "Omission requiring verification";
    case "OMITTED":
      return "Structurally omitted — not an independent legal approval";
    case "NOT_A_COMPLETION_TARGET":
      return "Not a completion item";
    case "LEGALLY_RESTRICTED":
      return "Legally restricted";
    case "NOT_YET_EVALUATED":
      return "Unsupported";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

function inclusionLabel(value: ExportInclusion): string {
  switch (value) {
    case "INCLUDE":
      return "Included in a future report output";
    case "INCLUDE_WITH_OMISSION":
      return "Included only with the omission statement";
    case "EXCLUDE":
      return "Not included in report output";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}
