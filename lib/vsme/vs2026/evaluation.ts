/**
 * Pure VS 2026 regulatory evaluation for the isolated B1–B11 registry.
 * No database, network, or UI access. The running scope engine is not an input.
 * The same input returns the same result. The input is not modified.
 *
 * Paragraph 15 of Annex I treats an omitted if-applicable disclosure as not
 * applicable. This function still keeps an unassessed condition explicit and
 * blocks review until an assessment is stored. That block is an internal
 * data-quality control, not an extra legal obligation.
 *
 * A compliance claim is never produced. Option B cannot be completed while
 * C1–C9 are absent from the registry.
 */

import {
  classifyEmployeeSize,
  type EmployeeSizeRejection,
} from "./employeeSize";
import {
  COMPREHENSIVE_DISCLOSURES,
  resolveModuleSelection,
  type ModuleResolution,
  type ModuleSelectionRejection,
  type ReportingModule,
  type ReportingOption,
} from "./moduleSelection";
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
  annexIIFor,
  disclosureDatapoints,
} from "./registry";
import type {
  ApplicabilityCondition,
  InformationClass,
  Vs2026Datapoint,
  Vs2026Disclosure,
  Vs2026RepeatingGroup,
} from "./registry/types";
import type { EmployeeCategory, RequirementType } from "./types";

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

const DATAPOINTS: readonly Vs2026Datapoint[] = DISCLOSURES.flatMap((disclosure) => [
  ...disclosureDatapoints(disclosure, true),
]);

const DATAPOINT_BY_ID = new Map<string, Vs2026Datapoint>();
for (const datapoint of DATAPOINTS) {
  if (DATAPOINT_BY_ID.has(datapoint.id)) {
    throw new Error(`Duplicate VS 2026 datapoint id: ${datapoint.id}`);
  }
  DATAPOINT_BY_ID.set(datapoint.id, datapoint);
}

const GROUPS: readonly Vs2026RepeatingGroup[] = DISCLOSURES.flatMap(
  (disclosure) => [...disclosure.repeatingGroups],
);

const GROUP_BY_ID = new Map<string, Vs2026RepeatingGroup>(
  GROUPS.map((group) => [group.id, group]),
);

/** Existence facts that are themselves the B2 condition, not facts gated by it. */
const SELF_DESCRIBING_EXISTENCE = new Set([
  "B2_HAS_PRACTICES",
  "B2_HAS_POLICIES",
  "B2_HAS_FUTURE_INITIATIVES",
]);

const NUMERIC_VALUE_KINDS = new Set([
  "NUMBER",
  "MONETARY",
  "QUANTITY",
  "DIMENSIONED_QUANTITY",
  "REPEATING_QUANTITY",
  "REPEATING_DIMENSIONED_QUANTITY",
  "PROPORTION",
  "PERCENTAGE",
  "COUNT",
  "WORKFORCE_COUNT",
  "ACCIDENT_RATE",
  "HOURS_WORKED",
  "HOURS_AVERAGE",
]);

export type FactLiteral =
  | { readonly kind: "TEXT"; readonly text: string }
  | { readonly kind: "NUMBER"; readonly value: number }
  | { readonly kind: "BOOLEAN"; readonly value: boolean }
  | { readonly kind: "ENUMERATION"; readonly memberId: string }
  | { readonly kind: "REFERENCES"; readonly datapointIds: readonly string[] }
  | { readonly kind: "SITE_REFERENCE"; readonly siteRowId: string };

export type FactPresence =
  | { readonly kind: "MISSING" }
  | { readonly kind: "EMPTY" }
  | { readonly kind: "INVALID" }
  | { readonly kind: "PRESENT"; readonly literal: FactLiteral };

export type FactInput = {
  readonly datapointId: string;
  readonly presence: FactPresence;
};

export type RepeatingRowInput = {
  readonly rowId: string;
  readonly groupId: string;
  readonly cells: readonly FactInput[];
};

export type OmissionClaimInput = {
  readonly datapointId: string;
  readonly rowId?: string;
  readonly reason?: "22(a)" | "22(b)" | "22(c)" | "22(d)";
  readonly reassessedForPeriod: boolean;
  readonly conditionsAssessed: boolean;
};

/**
 * Used only for conditions that have no preparation enumeration in the registry.
 * A preparation enumeration remains authoritative for its own condition.
 */
export type ExplicitApplicabilityInput = {
  readonly condition: ApplicabilityCondition["kind"];
  readonly state: "APPLICABLE" | "NOT_APPLICABLE" | "UNASSESSED";
};

export type ReportingConfigurationInput =
  | { readonly status: "NOT_CONFIGURED" }
  | {
      readonly status: "CONFIGURED";
      readonly reportingOption: ReportingOption;
      readonly additionalComprehensiveDisclosures?: readonly string[];
    };

export type EmployeeSizeEvaluationInput =
  | { readonly status: "NOT_PROVIDED" }
  | {
      readonly status: "MEASURED";
      readonly reportingPeriodId: string;
      readonly employeeMeasure: number | null;
      readonly measureKind: string;
    };

export type EvaluationInput = {
  readonly configuration: ReportingConfigurationInput;
  readonly employeeSize: EmployeeSizeEvaluationInput;
  readonly facts?: readonly FactInput[];
  readonly repeatingRows?: readonly RepeatingRowInput[];
  readonly omissions?: readonly OmissionClaimInput[];
  readonly applicabilityAssessments?: readonly ExplicitApplicabilityInput[];
};

export type ScopeStatus = "IN_SCOPE" | "OUT_OF_SCOPE" | "NOT_CONFIGURED";

export type ApplicabilityEvaluation =
  | "ALWAYS"
  | "CONDITION_MET"
  | "CONDITION_NOT_MET"
  | "CONDITION_UNASSESSED"
  | "LEGALLY_RESTRICTED"
  | "NOT_A_REGULATORY_CONDITION";

export type LegalApplicability =
  | "APPLICABLE"
  | "NOT_APPLICABLE"
  | "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15"
  | "UNASSESSED"
  | "LEGALLY_RESTRICTED"
  | "NOT_A_CONDITION";

export type EmployeeSizeTreatment = "NONE" | "VOLUNTARY" | "UNRESOLVED";

export type OmissionStatus = "NONE" | "UNVERIFIED" | "VALID" | "INVALID";

export type ValueStatus =
  | "MISSING"
  | "PRESENT"
  | "REPORTED_ZERO"
  | "REPORTED_FALSE"
  | "EMPTY"
  | "INVALID";

export type CompletionStatus =
  | "OUT_OF_SCOPE"
  | "NOT_APPLICABLE"
  | "BLOCKED_UNASSESSED"
  | "VOLUNTARY_MISSING"
  | "REQUIRED_MISSING"
  | "OMISSION_UNVERIFIED"
  | "OMITTED"
  | "COMPLETE"
  | "NOT_A_COMPLETION_TARGET"
  | "LEGALLY_RESTRICTED"
  | "NOT_YET_EVALUATED";

export type ExportInclusion = "EXCLUDE" | "INCLUDE" | "INCLUDE_WITH_OMISSION";

export type OutputRole =
  | "REQUIRED_REPORTED_FACT"
  | "REPORTED_VOLUNTARY_FACT"
  | "VOLUNTARY_ABSENT"
  | "VALID_OMISSION"
  | "NOT_APPLICABLE"
  | "MISSING_REQUIRED"
  | "UNASSESSED_CONDITION"
  | "PREPARATION_ONLY"
  | "SUPPLEMENTARY"
  | "DIGITAL_ONLY"
  | "CALCULATED"
  | "OUT_OF_SCOPE"
  | "NOT_YET_EVALUATED"
  | "LEGAL_RESTRICTION"
  | "EMPTY_REPEATING_GROUP";

export type AnnexIIEvaluation =
  | "NOT_LISTED"
  | "MEMBER"
  | "NOT_MEMBER"
  | "UNKNOWN_REFERENCE"
  | "NOT_EVALUATED";

export type DatapointEvaluation = {
  readonly datapointId: string;
  readonly rowId: string | null;
  readonly disclosureId: string;
  readonly inReportingScope: boolean;
  readonly scope: ScopeStatus;
  readonly requirementType: RequirementType;
  readonly applicability: ApplicabilityEvaluation;
  readonly legalApplicability: LegalApplicability;
  readonly employeeSizeTreatment: EmployeeSizeTreatment;
  readonly omissionStatus: OmissionStatus;
  readonly valueStatus: ValueStatus;
  readonly recordedValue: string | null;
  readonly completionStatus: CompletionStatus;
  readonly exportInclusion: ExportInclusion;
  readonly blocksExport: boolean;
  readonly outputRole: OutputRole;
  readonly informationClass: InformationClass | "UNCLASSIFIED";
  readonly annexII: AnnexIIEvaluation;
  readonly reasons: readonly string[];
};

export type UnsupportedDisclosure = {
  readonly disclosureId: string;
  readonly scope: "IN_SCOPE" | "ADDITIONAL_COMPREHENSIVE";
  readonly completionStatus: "NOT_YET_EVALUATED";
  readonly reason: "COMPREHENSIVE_REGISTRY_NOT_IMPLEMENTED";
};

export type ReportReadiness = {
  readonly missingConfiguration: boolean;
  readonly outstandingRequired: boolean;
  readonly unassessedConditions: boolean;
  readonly unresolvedOmissions: boolean;
  readonly unsupportedRequirements: boolean;
  /** Review readiness is not a compliance claim. */
  readonly readyForReview: boolean;
};

export type ReportEvaluation = {
  readonly configurationStatus: "NOT_CONFIGURED" | "CONFIGURED" | "REJECTED";
  readonly configurationRejection: ModuleSelectionRejection | null;
  readonly reportingOption: ReportingOption | null;
  readonly additionalComprehensiveDisclosures: readonly string[];
  readonly modules: readonly ReportingModule[];
  readonly fullComprehensiveExpected: boolean;
  readonly completionAssessment: "NOT_EVALUATED";
  readonly complianceClaim: "NOT_EVALUATED";
  readonly employeeCategory: EmployeeCategory | null;
  readonly employeeSizeRejection: EmployeeSizeRejection | null;
  readonly readiness: ReportReadiness;
  readonly unsupportedDisclosures: readonly UnsupportedDisclosure[];
  readonly datapoints: readonly DatapointEvaluation[];
  readonly ignoredFactIds: readonly string[];
  readonly ignoredGroupIds: readonly string[];
};

type ConditionOutcome = {
  readonly applicability: ApplicabilityEvaluation;
  readonly reasons: readonly string[];
};

type OmissionOutcome = {
  readonly status: OmissionStatus;
  readonly reasons: readonly string[];
};

type SizeResolution = {
  readonly category: EmployeeCategory | null;
  readonly rejection: EmployeeSizeRejection | null;
};

export function evaluateVS2026ReportingState(input: EvaluationInput): ReportEvaluation {
  const facts = input.facts ?? [];
  const repeatingRows = input.repeatingRows ?? [];
  const omissions = input.omissions ?? [];
  const applicabilityAssessments = input.applicabilityAssessments ?? [];

  const scalars = new Map<string, FactInput>();
  const ignoredFactIds: string[] = [];
  for (const fact of facts) {
    if (!DATAPOINT_BY_ID.has(fact.datapointId)) {
      ignoredFactIds.push(fact.datapointId);
      continue;
    }
    scalars.set(fact.datapointId, fact);
  }

  const rowsByGroup = new Map<string, RepeatingRowInput[]>();
  const ignoredGroupIds: string[] = [];
  for (const row of repeatingRows) {
    if (!GROUP_BY_ID.has(row.groupId)) {
      ignoredGroupIds.push(row.groupId);
      continue;
    }
    const existing = rowsByGroup.get(row.groupId);
    if (existing) {
      existing.push(row);
    } else {
      rowsByGroup.set(row.groupId, [row]);
    }
  }

  const configuration = resolveConfiguration(input.configuration);
  const size = resolveSize(input.employeeSize);
  const paragraph22Points = readParagraph22Points();

  const context: EvaluationContext = {
    scalars,
    rowsByGroup,
    omissions,
    applicabilityAssessments,
    configuration,
    size,
    paragraph22Points,
  };

  const datapoints: DatapointEvaluation[] = [];
  for (const datapoint of DATAPOINTS) {
    if (datapoint.repeatingGroupId) {
      continue;
    }
    datapoints.push(evaluateDatapoint(context, datapoint, null, false));
  }

  for (const group of GROUPS) {
    const rows = [...(rowsByGroup.get(group.id) ?? [])].sort((left, right) =>
      left.rowId.localeCompare(right.rowId),
    );
    if (rows.length === 0) {
      for (const component of group.components) {
        datapoints.push(evaluateDatapoint(context, component, null, true));
      }
      continue;
    }
    for (const row of rows) {
      for (const component of group.components) {
        datapoints.push(evaluateDatapoint(context, component, row, false));
      }
    }
  }

  datapoints.sort((left, right) => {
    const byId = left.datapointId.localeCompare(right.datapointId);
    if (byId !== 0) {
      return byId;
    }
    return (left.rowId ?? "").localeCompare(right.rowId ?? "");
  });

  const unsupportedDisclosures = unsupportedFor(configuration);
  const readiness = readinessFor(
    configuration,
    datapoints,
    unsupportedDisclosures.length > 0,
  );

  return Object.freeze({
    configurationStatus: configuration.status,
    configurationRejection: configuration.rejection,
    reportingOption: configuration.resolution?.reportingOption ?? null,
    additionalComprehensiveDisclosures: Object.freeze([
      ...(configuration.resolution?.additionalComprehensiveDisclosures ?? []),
    ]),
    modules: Object.freeze([...(configuration.resolution?.modules ?? [])]),
    fullComprehensiveExpected: configuration.resolution?.fullComprehensiveExpected ?? false,
    completionAssessment: "NOT_EVALUATED",
    complianceClaim: "NOT_EVALUATED",
    employeeCategory: size.category,
    employeeSizeRejection: size.rejection,
    readiness,
    unsupportedDisclosures: Object.freeze(unsupportedDisclosures),
    datapoints: Object.freeze(datapoints),
    ignoredFactIds: Object.freeze([...ignoredFactIds].sort()),
    ignoredGroupIds: Object.freeze([...new Set(ignoredGroupIds)].sort()),
  });
}

type ResolvedConfiguration = {
  readonly status: "NOT_CONFIGURED" | "CONFIGURED" | "REJECTED";
  readonly rejection: ModuleSelectionRejection | null;
  readonly resolution: ModuleResolution | null;
};

type EvaluationContext = {
  readonly scalars: ReadonlyMap<string, FactInput>;
  readonly rowsByGroup: ReadonlyMap<string, readonly RepeatingRowInput[]>;
  readonly omissions: readonly OmissionClaimInput[];
  readonly applicabilityAssessments: readonly ExplicitApplicabilityInput[];
  readonly configuration: ResolvedConfiguration;
  readonly size: SizeResolution;
  readonly paragraph22Points: ReadonlySet<string>;
};

function resolveConfiguration(input: ReportingConfigurationInput): ResolvedConfiguration {
  if (input.status === "NOT_CONFIGURED") {
    return { status: "NOT_CONFIGURED", rejection: null, resolution: null };
  }
  const result = resolveModuleSelection({
    reportingOption: input.reportingOption,
    additionalComprehensiveDisclosures: input.additionalComprehensiveDisclosures ?? [],
  });
  if (!result.ok) {
    return { status: "REJECTED", rejection: result.reason, resolution: null };
  }
  return { status: "CONFIGURED", rejection: null, resolution: result.resolution };
}

function resolveSize(input: EmployeeSizeEvaluationInput): SizeResolution {
  if (input.status === "NOT_PROVIDED") {
    return { category: null, rejection: null };
  }
  const classified = classifyEmployeeSize({
    reportingPeriodId: input.reportingPeriodId,
    employeeMeasure: input.employeeMeasure,
    measureKind: input.measureKind,
  });
  if (!classified.ok) {
    return { category: null, rejection: classified.reason };
  }
  return { category: classified.category, rejection: null };
}

function readParagraph22Points(): Set<string> {
  const omitted = DATAPOINT_BY_ID.get("B1_OMITTED_DISCLOSURES");
  return new Set((omitted?.omission?.reasons ?? []).map((reason) => reason.point));
}

function unsupportedFor(configuration: ResolvedConfiguration): UnsupportedDisclosure[] {
  const resolution = configuration.resolution;
  if (!resolution) {
    return [];
  }
  if (resolution.reportingOption === "OPTION_B") {
    return COMPREHENSIVE_DISCLOSURES.map((disclosureId) =>
      Object.freeze({
        disclosureId,
        scope: "IN_SCOPE" as const,
        completionStatus: "NOT_YET_EVALUATED" as const,
        reason: "COMPREHENSIVE_REGISTRY_NOT_IMPLEMENTED" as const,
      }),
    );
  }
  return resolution.additionalComprehensiveDisclosures.map((disclosureId) =>
    Object.freeze({
      disclosureId,
      scope: "ADDITIONAL_COMPREHENSIVE" as const,
      completionStatus: "NOT_YET_EVALUATED" as const,
      reason: "COMPREHENSIVE_REGISTRY_NOT_IMPLEMENTED" as const,
    }),
  );
}

function readinessFor(
  configuration: ResolvedConfiguration,
  datapoints: readonly DatapointEvaluation[],
  unsupported: boolean,
): ReportReadiness {
  const missingConfiguration = configuration.status !== "CONFIGURED";
  const outstandingRequired = datapoints.some(
    (datapoint) => datapoint.completionStatus === "REQUIRED_MISSING",
  );
  const unassessedConditions = datapoints.some(
    (datapoint) => datapoint.completionStatus === "BLOCKED_UNASSESSED",
  );
  const unresolvedOmissions = datapoints.some(
    (datapoint) => datapoint.completionStatus === "OMISSION_UNVERIFIED",
  );
  const unsupportedRequirements = unsupported;
  const readyForReview =
    !missingConfiguration &&
    !outstandingRequired &&
    !unassessedConditions &&
    !unresolvedOmissions &&
    !unsupportedRequirements;
  return Object.freeze({
    missingConfiguration,
    outstandingRequired,
    unassessedConditions,
    unresolvedOmissions,
    unsupportedRequirements,
    readyForReview,
  });
}

function evaluateDatapoint(
  context: EvaluationContext,
  datapoint: Vs2026Datapoint,
  row: RepeatingRowInput | null,
  emptyOpenGroup: boolean,
): DatapointEvaluation {
  const scope = scopeFor(context, datapoint.disclosure);
  const condition = resolveApplicability(context, datapoint, row);
  const legalApplicability = legalApplicabilityFor(datapoint, condition.applicability);
  const employeeSizeTreatment = sizeTreatmentFor(datapoint, context.size);
  const value = readValue(context, datapoint, row);
  const omission = resolveOmission(context, datapoint.id, row?.rowId ?? null);
  const annexII = annexFor(datapoint, context.size.category);
  const completionTarget = isCompletionTarget(datapoint);
  const reasons = [...condition.reasons];

  let completionStatus: CompletionStatus;
  let exportInclusion: ExportInclusion;
  let blocksExport: boolean;
  let outputRole: OutputRole;
  let omissionStatus: OmissionStatus = omission.status;

  if (!scope.inReportingScope) {
    completionStatus = "OUT_OF_SCOPE";
    exportInclusion = "EXCLUDE";
    blocksExport = false;
    outputRole = "OUT_OF_SCOPE";
    if (context.configuration.status === "REJECTED") {
      reasons.push("CONFIGURATION_REJECTED");
    } else if (scope.scope === "NOT_CONFIGURED") {
      reasons.push("NOT_CONFIGURED");
    } else {
      reasons.push("OUT_OF_SCOPE");
    }
  } else if (!completionTarget) {
    completionStatus = "NOT_A_COMPLETION_TARGET";
    exportInclusion = value.present ? "INCLUDE" : "EXCLUDE";
    blocksExport = false;
    outputRole = outputRoleForClass(datapoint);
    reasons.push("INFORMATION_CLASS_NOT_COMPLETION_TARGET");
    if (datapoint.informationClass === "CALCULATED_FACT") {
      reasons.push("CALCULATION_NOT_IMPLEMENTED");
      if (!value.present) {
        reasons.push("MISSING_IS_NOT_ZERO");
      }
    }
  } else if (condition.applicability === "LEGALLY_RESTRICTED") {
    completionStatus = "LEGALLY_RESTRICTED";
    exportInclusion = "EXCLUDE";
    blocksExport = false;
    outputRole = "LEGAL_RESTRICTION";
    omissionStatus = "NONE";
  } else if (condition.applicability === "CONDITION_NOT_MET") {
    completionStatus = "NOT_APPLICABLE";
    exportInclusion = "EXCLUDE";
    blocksExport = false;
    outputRole = "NOT_APPLICABLE";
    if (omission.status !== "NONE") {
      reasons.push("OMISSION_DOES_NOT_APPLY");
      omissionStatus = "NONE";
    }
    if (paragraph43Unresolved(context, datapoint.id)) {
      reasons.push("PARAGRAPH_43_CONJUNCTION_UNRESOLVED");
    }
  } else if (omission.status === "VALID") {
    completionStatus = "OMITTED";
    exportInclusion = "INCLUDE_WITH_OMISSION";
    blocksExport = false;
    outputRole = "VALID_OMISSION";
    reasons.push(...omission.reasons);
  } else if (omission.status === "UNVERIFIED") {
    completionStatus = "OMISSION_UNVERIFIED";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    reasons.push(...omission.reasons);
  } else if (omission.status === "INVALID") {
    completionStatus = "REQUIRED_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    reasons.push(...omission.reasons);
  } else if (condition.applicability === "CONDITION_UNASSESSED") {
    completionStatus = "BLOCKED_UNASSESSED";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "UNASSESSED_CONDITION";
    reasons.push("INTERNAL_DATA_QUALITY_REQUIREMENT");
    if (legalApplicability === "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15") {
      reasons.push("PARAGRAPH_15_ASSUMED_NOT_APPLICABLE");
    }
  } else if (listDisclosureIncomplete(context, datapoint)) {
    completionStatus = "REQUIRED_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    reasons.push("B1_27B_LIST_INCOMPLETE");
  } else if (
    employeeSizeTreatment === "UNRESOLVED" &&
    !value.present &&
    !emptyOpenGroup
  ) {
    completionStatus = "BLOCKED_UNASSESSED";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "UNASSESSED_CONDITION";
    reasons.push(
      context.size.rejection ? "EMPLOYEE_SIZE_MEASURE_REJECTED" : "EMPLOYEE_SIZE_NOT_PROVIDED",
    );
  } else if (emptyOpenGroup && valueRequiresIdentifiedRow(datapoint, condition.applicability)) {
    completionStatus = "REQUIRED_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    reasons.push("IDENTIFIED_RELATIONSHIP_HAS_NO_ROW");
  } else if (emptyOpenGroup) {
    completionStatus = "COMPLETE";
    exportInclusion = "EXCLUDE";
    blocksExport = false;
    outputRole = "EMPTY_REPEATING_GROUP";
    reasons.push("EMPTY_REPEATING_GROUP_PERMITTED", "REPEATING_CARDINALITY_OPEN");
  } else if (danglingSiteReference(context, datapoint, row, value)) {
    completionStatus = "REQUIRED_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    reasons.push("SITE_REFERENCE_NOT_IN_B1_INVENTORY");
  } else if (value.present) {
    completionStatus = "COMPLETE";
    exportInclusion = "INCLUDE";
    blocksExport = false;
    outputRole = voluntaryFact(datapoint, employeeSizeTreatment)
      ? "REPORTED_VOLUNTARY_FACT"
      : "REQUIRED_REPORTED_FACT";
    if (datapoint.id === "B1_MODULE_OPTION") {
      reasons.push("DERIVED_FROM_REPORTING_CONFIGURATION");
    }
    if (value.conflictingOption) {
      reasons.push("CONFIGURATION_VALUE_CONFLICT");
    }
    if (paragraph43Unresolved(context, datapoint.id)) {
      reasons.push("PARAGRAPH_43_CONJUNCTION_UNRESOLVED");
    }
  } else if (voluntaryFact(datapoint, employeeSizeTreatment)) {
    completionStatus = "VOLUNTARY_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = false;
    outputRole = "VOLUNTARY_ABSENT";
    if (employeeSizeTreatment === "VOLUNTARY") {
      reasons.push("EMPLOYEE_SIZE_RELIEF_VOLUNTARY");
    }
    if (numericFact(datapoint)) {
      reasons.push("MISSING_IS_NOT_ZERO");
    }
  } else {
    completionStatus = "REQUIRED_MISSING";
    exportInclusion = "EXCLUDE";
    blocksExport = true;
    outputRole = "MISSING_REQUIRED";
    if (paragraph43Unresolved(context, datapoint.id)) {
      reasons.push("PARAGRAPH_43_CONJUNCTION_UNRESOLVED");
    }
    if (numericFact(datapoint)) {
      reasons.push("MISSING_IS_NOT_ZERO");
    }
  }

  if (row && groupIsOpen(datapoint.repeatingGroupId)) {
    reasons.push("REPEATING_CARDINALITY_OPEN");
  }

  return Object.freeze({
    datapointId: datapoint.id,
    rowId: row?.rowId ?? null,
    disclosureId: datapoint.disclosure,
    inReportingScope: scope.inReportingScope,
    scope: scope.scope,
    requirementType: datapoint.requirementType,
    applicability: condition.applicability,
    legalApplicability,
    employeeSizeTreatment,
    omissionStatus,
    valueStatus: value.status,
    recordedValue: value.recorded,
    completionStatus,
    exportInclusion,
    blocksExport,
    outputRole,
    informationClass: datapoint.informationClass ?? "UNCLASSIFIED",
    annexII,
    reasons: Object.freeze(unique(reasons)),
  });
}

function scopeFor(
  context: EvaluationContext,
  disclosureId: string,
): { readonly scope: ScopeStatus; readonly inReportingScope: boolean } {
  const resolution = context.configuration.resolution;
  if (context.configuration.status === "NOT_CONFIGURED") {
    return { scope: "NOT_CONFIGURED", inReportingScope: false };
  }
  if (!resolution) {
    return { scope: "OUT_OF_SCOPE", inReportingScope: false };
  }
  if (!resolution.disclosuresInScope.includes(disclosureId as "B1")) {
    return { scope: "OUT_OF_SCOPE", inReportingScope: false };
  }
  return { scope: "IN_SCOPE", inReportingScope: true };
}

function isCompletionTarget(datapoint: Vs2026Datapoint): boolean {
  if (datapoint.role === "PREPARATION_GUIDANCE") {
    return false;
  }
  if (datapoint.applicability.kind === "GUIDANCE_OUTSIDE_ANNEX_I") {
    return false;
  }
  switch (datapoint.informationClass) {
    case "PREPARATION_DATA":
    case "SUPPLEMENTARY":
    case "DIGITAL_FACT":
    case "CALCULATED_FACT":
      return false;
    case "REGULATORY_FACT":
      return true;
    default:
      return (
        datapoint.role === "REGULATORY_DATAPOINT" ||
        datapoint.role === "DERIVED_FROM_REPORTING_CONFIGURATION"
      );
  }
}

function outputRoleForClass(datapoint: Vs2026Datapoint): OutputRole {
  switch (datapoint.informationClass) {
    case "PREPARATION_DATA":
      return "PREPARATION_ONLY";
    case "SUPPLEMENTARY":
      return "SUPPLEMENTARY";
    case "DIGITAL_FACT":
      return "DIGITAL_ONLY";
    case "CALCULATED_FACT":
      return "CALCULATED";
    default:
      return datapoint.role === "PREPARATION_GUIDANCE" ? "PREPARATION_ONLY" : "SUPPLEMENTARY";
  }
}

function voluntaryFact(
  datapoint: Vs2026Datapoint,
  treatment: EmployeeSizeTreatment,
): boolean {
  return datapoint.requirementType === "VOLUNTARY" || treatment === "VOLUNTARY";
}

function sizeTreatmentFor(
  datapoint: Vs2026Datapoint,
  size: SizeResolution,
): EmployeeSizeTreatment {
  if (!datapoint.employeeSizeRule.voluntaryForEmployeesLe10) {
    return "NONE";
  }
  if (size.category === "EMPLOYEES_LE_10") {
    return "VOLUNTARY";
  }
  if (size.category === "EMPLOYEES_GT_10") {
    return "NONE";
  }
  return "UNRESOLVED";
}

function legalApplicabilityFor(
  datapoint: Vs2026Datapoint,
  applicability: ApplicabilityEvaluation,
): LegalApplicability {
  switch (applicability) {
    case "ALWAYS":
    case "CONDITION_MET":
      return "APPLICABLE";
    case "CONDITION_NOT_MET":
      return "NOT_APPLICABLE";
    case "LEGALLY_RESTRICTED":
      return "LEGALLY_RESTRICTED";
    case "NOT_A_REGULATORY_CONDITION":
      return "NOT_A_CONDITION";
    case "CONDITION_UNASSESSED":
      return datapoint.requirementType === "IF_APPLICABLE"
        ? "ASSUMED_NOT_APPLICABLE_PARAGRAPH_15"
        : "UNASSESSED";
    default: {
      const exhaustive: never = applicability;
      return exhaustive;
    }
  }
}

function annexFor(
  datapoint: Vs2026Datapoint,
  category: EmployeeCategory | null,
): AnnexIIEvaluation {
  if (!datapoint.annexII.listed) {
    return "NOT_LISTED";
  }
  if (!category) {
    return "NOT_EVALUATED";
  }
  const membership = annexIIFor(datapoint.annexII, category);
  if (membership.status === "NOT_LISTED") {
    return "NOT_LISTED";
  }
  return membership.status;
}

type ReadValue = {
  readonly status: ValueStatus;
  readonly recorded: string | null;
  readonly present: boolean;
  readonly conflictingOption: boolean;
  readonly siteRowId: string | null;
};

function readValue(
  context: EvaluationContext,
  datapoint: Vs2026Datapoint,
  row: RepeatingRowInput | null,
): ReadValue {
  if (datapoint.id === "B1_MODULE_OPTION" && context.configuration.resolution) {
    const option = context.configuration.resolution.reportingOption;
    const supplied = factFor(context, datapoint.id, row);
    const suppliedMember =
      supplied?.presence.kind === "PRESENT" && supplied.presence.literal.kind === "ENUMERATION"
        ? supplied.presence.literal.memberId
        : null;
    return {
      status: "PRESENT",
      recorded: option,
      present: true,
      conflictingOption: suppliedMember !== null && suppliedMember !== option,
      siteRowId: null,
    };
  }

  const fact = factFor(context, datapoint.id, row);
  const status = valueStatusOf(fact);
  return {
    status,
    recorded: recordedValueOf(fact, status),
    present: status === "PRESENT" || status === "REPORTED_ZERO" || status === "REPORTED_FALSE",
    conflictingOption: false,
    siteRowId: siteRowIdOf(fact),
  };
}

function factFor(
  context: EvaluationContext,
  datapointId: string,
  row: RepeatingRowInput | null,
): FactInput | undefined {
  if (row) {
    return row.cells.find((cell) => cell.datapointId === datapointId);
  }
  return context.scalars.get(datapointId);
}

function valueStatusOf(fact: FactInput | undefined): ValueStatus {
  if (!fact || fact.presence.kind === "MISSING") {
    return "MISSING";
  }
  if (fact.presence.kind === "EMPTY") {
    return "EMPTY";
  }
  if (fact.presence.kind === "INVALID") {
    return "INVALID";
  }
  const literal = fact.presence.literal;
  switch (literal.kind) {
    case "NUMBER":
      if (!Number.isFinite(literal.value)) {
        return "INVALID";
      }
      return literal.value === 0 ? "REPORTED_ZERO" : "PRESENT";
    case "BOOLEAN":
      return literal.value ? "PRESENT" : "REPORTED_FALSE";
    case "TEXT":
      return literal.text.trim() === "" ? "EMPTY" : "PRESENT";
    case "ENUMERATION":
      return literal.memberId.trim() === "" ? "EMPTY" : "PRESENT";
    case "REFERENCES":
      return literal.datapointIds.length === 0 ? "EMPTY" : "PRESENT";
    case "SITE_REFERENCE":
      return literal.siteRowId.trim() === "" ? "EMPTY" : "PRESENT";
    default: {
      const exhaustive: never = literal;
      return exhaustive;
    }
  }
}

function recordedValueOf(fact: FactInput | undefined, status: ValueStatus): string | null {
  if (!fact || fact.presence.kind !== "PRESENT") {
    return null;
  }
  if (status === "EMPTY" || status === "INVALID" || status === "MISSING") {
    return null;
  }
  const literal = fact.presence.literal;
  switch (literal.kind) {
    case "NUMBER":
      return String(literal.value);
    case "BOOLEAN":
      return literal.value ? "true" : "false";
    case "TEXT":
      return literal.text;
    case "ENUMERATION":
      return literal.memberId;
    case "REFERENCES":
      return [...literal.datapointIds].sort().join(",");
    case "SITE_REFERENCE":
      return literal.siteRowId;
    default: {
      const exhaustive: never = literal;
      return exhaustive;
    }
  }
}

function siteRowIdOf(fact: FactInput | undefined): string | null {
  if (!fact || fact.presence.kind !== "PRESENT") {
    return null;
  }
  const literal = fact.presence.literal;
  if (literal.kind === "SITE_REFERENCE" && literal.siteRowId.trim() !== "") {
    return literal.siteRowId;
  }
  return null;
}

function numericFact(datapoint: Vs2026Datapoint): boolean {
  return NUMERIC_VALUE_KINDS.has(datapoint.value.kind);
}

function resolveOmission(
  context: EvaluationContext,
  datapointId: string,
  rowId: string | null,
): OmissionOutcome {
  const claim = context.omissions.find(
    (candidate) => candidate.datapointId === datapointId && (candidate.rowId ?? null) === rowId,
  );
  if (!claim) {
    return { status: "NONE", reasons: [] };
  }
  const reasonAccepted = claim.reason !== undefined && context.paragraph22Points.has(claim.reason);
  const listed = omittedIds(context).has(datapointId);
  if (!reasonAccepted || !listed) {
    const reasons: string[] = [];
    if (!reasonAccepted) {
      reasons.push("OMISSION_REASON_MISSING");
    }
    if (!listed) {
      reasons.push("B1_27B_LIST_INCOMPLETE");
    }
    return { status: "INVALID", reasons };
  }
  if (!claim.conditionsAssessed || !claim.reassessedForPeriod) {
    const reasons = ["OMISSION_REQUIRES_VALIDATION"];
    if (!claim.conditionsAssessed) {
      reasons.push("CONDITIONS_NOT_ASSESSED");
    }
    if (!claim.reassessedForPeriod) {
      reasons.push("OMISSION_NOT_REASSESSED");
    }
    return { status: "UNVERIFIED", reasons };
  }
  return { status: "VALID", reasons: ["OMISSION_VALID"] };
}

function omittedIds(context: EvaluationContext): Set<string> {
  const fact = context.scalars.get("B1_OMITTED_DISCLOSURES");
  const ids = new Set<string>();
  if (fact?.presence.kind === "PRESENT" && fact.presence.literal.kind === "REFERENCES") {
    for (const datapointId of fact.presence.literal.datapointIds) {
      ids.add(datapointId);
    }
  }
  return ids;
}

function listDisclosureIncomplete(context: EvaluationContext, datapoint: Vs2026Datapoint): boolean {
  if (datapoint.id !== "B1_OMITTED_DISCLOSURES" || context.omissions.length === 0) {
    return false;
  }
  const listed = omittedIds(context);
  return context.omissions.some((claim) => !listed.has(claim.datapointId));
}

function valueRequiresIdentifiedRow(
  datapoint: Vs2026Datapoint,
  applicability: ApplicabilityEvaluation,
): boolean {
  if (applicability !== "CONDITION_MET") {
    return false;
  }
  return (
    datapoint.applicability.kind === "WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA" ||
    datapoint.applicability.kind === "WHEN_SITE_IS_IN_WATER_STRESS"
  );
}

function danglingSiteReference(
  context: EvaluationContext,
  datapoint: Vs2026Datapoint,
  row: RepeatingRowInput | null,
  value: ReadValue,
): boolean {
  if (!row || !value.present || value.siteRowId === null) {
    return false;
  }
  if (datapoint.value.kind !== "SITE_REFERENCE") {
    return false;
  }
  const sites = context.rowsByGroup.get("B1_SITE") ?? [];
  return !sites.some((site) => site.rowId === value.siteRowId);
}

function groupIsOpen(groupId: string | undefined): boolean {
  if (!groupId) {
    return false;
  }
  const group = GROUP_BY_ID.get(groupId);
  return group?.cardinality === "ZERO_OR_MORE" && group.maximum === null;
}

function paragraph43Unresolved(context: EvaluationContext, datapointId: string): boolean {
  if (datapointId !== "B11_CONVICTIONS_COUNT" && datapointId !== "B11_FINES_AMOUNT") {
    return false;
  }
  const member = enumMember(context, "B11_CONVICTIONS_AND_FINES_ASSESSMENT", null);
  return member === "CONVICTIONS_OCCURRED" || member === "FINES_OCCURRED";
}

function resolveApplicability(
  context: EvaluationContext,
  datapoint: Vs2026Datapoint,
  row: RepeatingRowInput | null,
): ConditionOutcome {
  const kind = datapoint.applicability.kind;
  if (
    kind === "WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST" &&
    SELF_DESCRIBING_EXISTENCE.has(datapoint.id)
  ) {
    return outcome("ALWAYS", ["SELF_DESCRIBING_CONDITION"]);
  }

  switch (kind) {
    case "ALWAYS":
      return outcome("ALWAYS", ["ALWAYS"]);
    case "GUIDANCE_OUTSIDE_ANNEX_I":
      return outcome("NOT_A_REGULATORY_CONDITION", ["GUIDANCE_OUTSIDE_ANNEX_I"]);
    case "WHEN_PARAGRAPH_22_OMISSION_IS_USED":
      return context.omissions.length > 0
        ? outcome("CONDITION_MET", ["CONDITION_MET"])
        : outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
    case "WHEN_REPORTING_BASIS_IS_CONSOLIDATED":
      return memberCondition(context, "B1_REPORTING_BASIS", ["CONSOLIDATED"], ["INDIVIDUAL"]);
    case "WHEN_CERTIFICATION_OR_LABEL_OBTAINED":
      return explicitOrPresence(
        context,
        kind,
        "B1_SUSTAINABILITY_CERTIFICATIONS",
      );
    case "WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST":
      return practicesCondition(context);
    case "WHEN_POLICIES_EXIST":
      return booleanCondition(context, "B2_HAS_POLICIES");
    case "WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED":
      return memberCondition(
        context,
        "B3_ENERGY_BREAKDOWN_INFORMATION",
        ["CAN_OBTAIN"],
        ["CANNOT_OBTAIN"],
      );
    case "WHEN_SCOPE3_IS_DISCLOSED":
      return presenceCondition(context, "B3_GROSS_SCOPE3_TCO2E");
    case "WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES":
      return memberCondition(
        context,
        "B4_REPORTING_CONDITION",
        ["LEGAL_REPORTING_REQUIREMENT", "EMS_VOLUNTARY_REPORTING", "BOTH"],
        ["NEITHER"],
      );
    case "WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED":
      return pollutantMethod(context, "DIRECT_POLLUTANT_REPORTING");
    case "WHEN_PUBLIC_DOCUMENT_REFERENCE_IS_SELECTED":
      return pollutantMethod(context, "PUBLIC_DOCUMENT_REFERENCE");
    case "WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA":
      return biodiversityCondition(context, row);
    case "WHEN_SITE_IS_OUTSIDE_AND_NOT_ADJACENT":
      return explicitOnly(context, kind);
    case "WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST":
      return memberCondition(
        context,
        "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
        ["PROCESSES_EXIST"],
        ["NO_SUCH_PROCESSES_IDENTIFIED"],
      );
    case "WHEN_SITE_IS_IN_WATER_STRESS":
      return waterStressCondition(context, row);
    case "WHEN_CIRCULAR_ECONOMY_PRINCIPLES_ARE_APPLIED":
      return memberCondition(
        context,
        "B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES",
        ["YES"],
        ["NO"],
      );
    case "WHEN_SIGNIFICANT_MATERIAL_FLOWS":
      return memberCondition(
        context,
        "B7_SIGNIFICANT_MATERIAL_FLOWS",
        ["SIGNIFICANT_FLOWS"],
        ["NO_SIGNIFICANT_FLOWS_IDENTIFIED"],
      );
    case "WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY":
      return memberCondition(
        context,
        "B8_MULTI_COUNTRY_OPERATIONS",
        ["OPERATES_IN_MORE_THAN_ONE_COUNTRY"],
        ["DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY"],
      );
    case "WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED":
      return memberCondition(
        context,
        "B9_FATALITY_LEGAL_RESTRICTION",
        ["NO_RESTRICTION_IDENTIFIED"],
        [],
        [],
        ["RESTRICTION_AFFECTS_DISCLOSURE"],
      );
    case "WHEN_APPLICABLE_MINIMUM_REMUNERATION_IS_IDENTIFIED":
      return memberCondition(
        context,
        "B10_MINIMUM_WAGE_DETERMINATION",
        ["STATUTORY_MINIMUM_WAGE", "COLLECTIVELY_AGREED_MINIMUM_REMUNERATION"],
        ["NO_APPLICABLE_MINIMUM_IDENTIFIED"],
        ["DETERMINATION_UNRESOLVED"],
      );
    case "WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED":
      return memberCondition(
        context,
        "B10_GENDER_PAY_GAP_LEGAL_OBLIGATION",
        ["LEGALLY_REQUIRED_TO_REPORT"],
        ["NO_IDENTIFIED_REPORTING_REQUIREMENT"],
      );
    case "WHEN_RELEVANT_CONVICTIONS_OCCURRED":
      return memberCondition(
        context,
        "B11_CONVICTIONS_AND_FINES_ASSESSMENT",
        ["CONVICTIONS_OCCURRED", "BOTH_OCCURRED"],
        ["FINES_OCCURRED", "NEITHER_AFTER_ASSESSMENT"],
      );
    case "WHEN_RELEVANT_FINES_INCURRED":
      return memberCondition(
        context,
        "B11_CONVICTIONS_AND_FINES_ASSESSMENT",
        ["FINES_OCCURRED", "BOTH_OCCURRED"],
        ["CONVICTIONS_OCCURRED", "NEITHER_AFTER_ASSESSMENT"],
      );
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function practicesCondition(context: EvaluationContext): ConditionOutcome {
  const ids = ["B2_HAS_PRACTICES", "B2_HAS_POLICIES", "B2_HAS_FUTURE_INITIATIVES"];
  let anyTrue = false;
  let anyMissing = false;
  for (const datapointId of ids) {
    const value = booleanValue(context, datapointId);
    if (value === null) {
      anyMissing = true;
    } else if (value) {
      anyTrue = true;
    }
  }
  if (anyTrue) {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (anyMissing) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
}

function booleanCondition(context: EvaluationContext, datapointId: string): ConditionOutcome {
  const value = booleanValue(context, datapointId);
  if (value === null) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  return value
    ? outcome("CONDITION_MET", ["CONDITION_MET"])
    : outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
}

function presenceCondition(context: EvaluationContext, datapointId: string): ConditionOutcome {
  const status = valueStatusOf(context.scalars.get(datapointId));
  if (status === "PRESENT" || status === "REPORTED_ZERO") {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (status === "MISSING") {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
}

function explicitOrPresence(
  context: EvaluationContext,
  kind: ApplicabilityCondition["kind"],
  datapointId: string,
): ConditionOutcome {
  const explicit = explicitState(context, kind);
  if (explicit) {
    return fromExplicit(explicit);
  }
  return presenceCondition(context, datapointId);
}

function explicitOnly(
  context: EvaluationContext,
  kind: ApplicabilityCondition["kind"],
): ConditionOutcome {
  const explicit = explicitState(context, kind);
  if (!explicit || explicit === "UNASSESSED") {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  return fromExplicit(explicit);
}

function explicitState(
  context: EvaluationContext,
  kind: ApplicabilityCondition["kind"],
): ExplicitApplicabilityInput["state"] | null {
  const assessment = context.applicabilityAssessments.find((item) => item.condition === kind);
  return assessment?.state ?? null;
}

function fromExplicit(state: ExplicitApplicabilityInput["state"]): ConditionOutcome {
  if (state === "APPLICABLE") {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (state === "NOT_APPLICABLE") {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
}

function pollutantMethod(
  context: EvaluationContext,
  selected: "DIRECT_POLLUTANT_REPORTING" | "PUBLIC_DOCUMENT_REFERENCE",
): ConditionOutcome {
  const condition = memberCondition(
    context,
    "B4_REPORTING_CONDITION",
    ["LEGAL_REPORTING_REQUIREMENT", "EMS_VOLUNTARY_REPORTING", "BOTH"],
    ["NEITHER"],
  );
  if (condition.applicability !== "CONDITION_MET") {
    return condition;
  }
  const method = enumMember(context, "B4_DISCLOSURE_METHOD", null);
  if (method === null) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  if (method === selected) {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (method === "DIRECT_POLLUTANT_REPORTING" || method === "PUBLIC_DOCUMENT_REFERENCE") {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  return outcome("CONDITION_UNASSESSED", ["UNKNOWN_CONDITION_MEMBER"]);
}

function biodiversityCondition(
  context: EvaluationContext,
  row: RepeatingRowInput | null,
): ConditionOutcome {
  if (row) {
    const siteRowId = referencedSite(row, "B5_RELATIONSHIP_SITE_REFERENCE");
    if (!siteRowId) {
      return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
    }
    return biodiversityMember(context, siteRowId);
  }
  const sites = context.rowsByGroup.get("B1_SITE") ?? [];
  if (sites.length === 0) {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET", "NO_SITES_IN_INVENTORY"]);
  }
  let identified = false;
  for (const site of sites) {
    const member = biodiversityMember(context, site.rowId);
    if (member.applicability === "CONDITION_UNASSESSED") {
      return member;
    }
    if (member.applicability === "CONDITION_MET") {
      identified = true;
    }
  }
  return identified
    ? outcome("CONDITION_MET", ["CONDITION_MET"])
    : outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
}

function biodiversityMember(context: EvaluationContext, siteRowId: string): ConditionOutcome {
  const rows = context.rowsByGroup.get("B5_SITE_ASSESSMENT") ?? [];
  const assessment = rows.find(
    (candidate) => referencedSite(candidate, "B5_ASSESSED_SITE_REFERENCE") === siteRowId,
  );
  if (!assessment) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  const member = enumMember(context, "B5_SITE_BSA_ASSESSMENT", assessment);
  if (member === "RELATIONSHIP_IDENTIFIED") {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (member === "NO_IDENTIFIED_RELATIONSHIP") {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  if (member === null) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  return outcome("CONDITION_UNASSESSED", ["UNKNOWN_CONDITION_MEMBER"]);
}

function waterStressCondition(
  context: EvaluationContext,
  row: RepeatingRowInput | null,
): ConditionOutcome {
  const processes = memberCondition(
    context,
    "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
    ["PROCESSES_EXIST"],
    ["NO_SUCH_PROCESSES_IDENTIFIED"],
  );
  if (processes.applicability !== "CONDITION_MET") {
    return processes;
  }
  if (!row) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  const member = enumMember(context, "B6_WATER_STRESS_ASSESSMENT", row);
  if (member === "IN_WATER_STRESS") {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (member === "NOT_IN_WATER_STRESS") {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  if (member === null) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  return outcome("CONDITION_UNASSESSED", ["UNKNOWN_CONDITION_MEMBER"]);
}

function memberCondition(
  context: EvaluationContext,
  controllerId: string,
  met: readonly string[],
  notMet: readonly string[],
  unresolved: readonly string[] = [],
  restricted: readonly string[] = [],
): ConditionOutcome {
  const member = enumMember(context, controllerId, null);
  if (member === null) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED"]);
  }
  if (unresolved.includes(member)) {
    return outcome("CONDITION_UNASSESSED", ["CONDITION_UNASSESSED", "CONDITION_MEMBER_UNRESOLVED"]);
  }
  if (restricted.includes(member)) {
    return outcome("LEGALLY_RESTRICTED", ["LEGAL_RESTRICTION_NOT_PARAGRAPH_22"]);
  }
  if (met.includes(member)) {
    return outcome("CONDITION_MET", ["CONDITION_MET"]);
  }
  if (notMet.includes(member)) {
    return outcome("CONDITION_NOT_MET", ["CONDITION_NOT_MET"]);
  }
  return outcome("CONDITION_UNASSESSED", ["UNKNOWN_CONDITION_MEMBER"]);
}

function enumMember(
  context: EvaluationContext,
  datapointId: string,
  row: RepeatingRowInput | null,
): string | null {
  const fact = factFor(context, datapointId, row);
  if (!fact || fact.presence.kind !== "PRESENT" || fact.presence.literal.kind !== "ENUMERATION") {
    return null;
  }
  const memberId = fact.presence.literal.memberId.trim();
  return memberId === "" ? null : memberId;
}

function booleanValue(context: EvaluationContext, datapointId: string): boolean | null {
  const fact = context.scalars.get(datapointId);
  if (!fact || fact.presence.kind !== "PRESENT" || fact.presence.literal.kind !== "BOOLEAN") {
    return null;
  }
  return fact.presence.literal.value;
}

function referencedSite(row: RepeatingRowInput, datapointId: string): string | null {
  const fact = row.cells.find((cell) => cell.datapointId === datapointId);
  if (!fact || fact.presence.kind !== "PRESENT") {
    return null;
  }
  const literal = fact.presence.literal;
  if (literal.kind === "SITE_REFERENCE" && literal.siteRowId.trim() !== "") {
    return literal.siteRowId;
  }
  if (literal.kind === "TEXT" && literal.text.trim() !== "") {
    return literal.text.trim();
  }
  return null;
}

function outcome(
  applicability: ApplicabilityEvaluation,
  reasons: readonly string[],
): ConditionOutcome {
  return { applicability, reasons };
}

function unique(reasons: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const reason of reasons) {
    if (seen.has(reason)) {
      continue;
    }
    seen.add(reason);
    result.push(reason);
  }
  return result;
}
