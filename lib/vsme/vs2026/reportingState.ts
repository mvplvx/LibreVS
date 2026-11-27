import type { AuthenticatedContext } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/auth";

import { isVS2026EditorEnabled } from "./editorAvailability";
import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { evaluateVS2026ReportingState, type DatapointEvaluation, type ReportEvaluation } from "./evaluation";
import { getReportingConfiguration, type ReportingConfigurationDb } from "./reportingConfiguration";
import { loadVS2026EvaluationInput } from "./reportingDataLoader";
import { unverifiedVs2026FieldIds } from "./reportProvenance";
import {
  comparativeBasisFromStored,
  reportingStandardFromOption,
  VS2026_COMPARATIVE_BASIS,
  type ComparativeBasis,
  type ReportingStandardIdentity,
} from "./reportingStandard";
import { editorDisclosures, registryDatapoint } from "./scalarEligibility";

export type ReviewReadiness =
  | "NOT_CONFIGURED"
  | "IN_PROGRESS"
  | "NEEDS_ASSESSMENT"
  | "NEEDS_CORRECTION"
  | "READY_FOR_REVIEW"
  | "UNSUPPORTED"
  | "INVALID_REPORTING_STATE";

export type ReviewIssueCode =
  | "REQUIRED_FACT_MISSING"
  | "CONDITION_UNASSESSED"
  | "INVALID_REPORTED_VALUE"
  | "OMISSION_INCOMPLETE"
  | "UNSUPPORTED_REPORTABLE_FACT"
  | "DATA_INTEGRITY_CONFLICT"
  | "LEGACY_VALUE_PROVENANCE"
  | "UNRECOGNISED_SUPPLEMENTARY_INFORMATION"
  | "REPORT_FINALISATION_PENDING";

export type ReviewSeverity =
  | "blocking"
  | "quality"
  | "warning"
  | "optional"
  | "unsupported"
  | "finalisation";

export type ReviewIssue = {
  readonly code: ReviewIssueCode;
  readonly severity: ReviewSeverity;
  readonly disclosureId: string;
  readonly disclosureTitle: string;
  readonly datapointId: string | null;
  readonly message: string;
  readonly href: string;
};

export type DisclosureReview = {
  readonly id: string;
  readonly title: string;
  readonly requiredMissing: number;
  readonly unassessed: number;
  readonly invalid: number;
};

export type ReportingReview = {
  readonly readiness: ReviewReadiness;
  readonly complianceClaim: "NOT_EVALUATED";
  readonly conformityStatement: "NOT_PREPARED";
  readonly comparativeBasis: ComparativeBasis;
  readonly employeeCategory: "EMPLOYEES_LE_10" | "EMPLOYEES_GT_10" | null;
  readonly employeeCategoryLabel: string;
  readonly issues: readonly ReviewIssue[];
  readonly disclosures: readonly DisclosureReview[];
  readonly structuralOmissions: number;
  readonly limitations: readonly string[];
};

export type VS2026ReportingState =
  | {
      readonly ok: true;
      readonly reportingPeriodId: string;
      readonly year: number | null;
      readonly companyName: string | null;
      readonly standard: ReportingStandardIdentity;
      readonly reportingOption: "OPTION_A" | "OPTION_B" | null;
      readonly review: ReportingReview;
    }
  | {
      readonly ok: false;
      readonly code: "EDITOR_DISABLED" | "UNAUTHENTICATED" | "NOT_FOUND" | "DATABASE_FAILURE";
      readonly message: string;
    };

const TOPIC_LIST = "B2_SUSTAINABILITY_ISSUES_ADDRESSED";
const COMPLIANCE_STATEMENT = "B1_EXPLICIT_COMPLIANCE_STATEMENT";
const COMBINED_EMISSIONS_TOTAL = "B3_SCOPE1_SCOPE2_LOCATION_TOTAL";
const SCOPE3_GROUP = "B3_SCOPE3_SIGNIFICANT_CATEGORIES";

const LIMITATIONS = [
  "The conformity statement under B1 paragraph 27(a) is not prepared here. Review readiness does not create it and is not a legal certification.",
  "A structurally complete paragraph 22 omission is the undertaking's attestation. It is not an independent legal approval.",
  "Paragraph 18 references to unchanged information in an earlier report are not supported. A missing value is not treated as unchanged.",
  "Comparative figures are not carried forward from another period.",
] as const;

export function aggregateReportingReadiness(input: {
  standard: ReportingStandardIdentity;
  report: ReportEvaluation | null;
  comparativeBasis: ComparativeBasis;
  supplementaryRowCounts: Readonly<Record<string, number>>;
  integrityIssues: readonly { code: string; datapointId: string | null }[];
  provenanceConflicts?: readonly { datapointId: string }[];
}): ReportingReview {
  if (input.standard.kind === "UNCONFIGURED") {
    return emptyReview("NOT_CONFIGURED", input.comparativeBasis);
  }
  if (input.standard.kind === "INVALID") {
    return emptyReview("INVALID_REPORTING_STATE", input.comparativeBasis);
  }
  if (input.standard.option === "OPTION_B") {
    return {
      ...emptyReview("UNSUPPORTED", input.comparativeBasis),
      issues: [
        issue({
          code: "UNSUPPORTED_REPORTABLE_FACT",
          severity: "unsupported",
          disclosureId: "OPTION_B",
          disclosureTitle: "Option B — Basic and Comprehensive",
          datapointId: null,
          message:
            "Option B is stored. Comprehensive disclosures are not evaluated, so this period is not a complete Basic Module review.",
          href: "#vs2026-review",
        }),
      ],
    };
  }
  if (!input.report || input.report.reportingOption !== "OPTION_A") {
    const review = emptyReview("INVALID_REPORTING_STATE", input.comparativeBasis);
    if (input.integrityIssues.length === 0) {
      return review;
    }
    return {
      ...review,
      issues: input.integrityIssues.map((item) =>
        issue({
          code: "DATA_INTEGRITY_CONFLICT",
          severity: "blocking",
          disclosureId: disclosureIdFor(item.datapointId),
          disclosureTitle: titleFor(new Map(), disclosureIdFor(item.datapointId)),
          datapointId: item.datapointId,
          message: `Stored data conflicts (${item.code}) and was not used as a VS 2026 fact.`,
          href: hrefFor(disclosureIdFor(item.datapointId), item.datapointId),
        }),
      ),
    };
  }

  const titles = new Map(editorDisclosures().map((disclosure) => [disclosure.id, disclosure.title]));
  const issues: ReviewIssue[] = [];
  for (const item of input.integrityIssues) {
    issues.push(
      issue({
        code: "DATA_INTEGRITY_CONFLICT",
        severity: "blocking",
        disclosureId: disclosureIdFor(item.datapointId),
        disclosureTitle: titleFor(titles, disclosureIdFor(item.datapointId)),
        datapointId: item.datapointId,
        message: `Stored data conflicts (${item.code}) and was not used as a VS 2026 fact.`,
        href: hrefFor(disclosureIdFor(item.datapointId), item.datapointId),
      }),
    );
  }
  for (const item of input.provenanceConflicts ?? []) {
    issues.push(provenanceIssue(titles, item.datapointId));
  }

  let structuralOmissions = 0;
  for (const datapoint of input.report.datapoints) {
    const classified = classifyDatapoint(datapoint, titles);
    if (classified === "structural-omission") {
      structuralOmissions += 1;
    } else if (classified) {
      issues.push(classified);
    }
  }

  for (const unsupported of input.report.unsupportedDisclosures) {
    issues.push(
      issue({
        code: "UNSUPPORTED_REPORTABLE_FACT",
        severity: "unsupported",
        disclosureId: unsupported.disclosureId,
        disclosureTitle: unsupported.disclosureId,
        datapointId: null,
        message:
          "This Comprehensive disclosure is selected and is not evaluated. The Basic Module review is not complete.",
        href: "#vs2026-review",
      }),
    );
  }

  for (const [groupId, count] of Object.entries(input.supplementaryRowCounts)) {
    if (count <= 0 || !input.report.ignoredGroupIds.includes(groupId)) {
      continue;
    }
    issues.push(
      issue({
        code: "UNRECOGNISED_SUPPLEMENTARY_INFORMATION",
        severity: "warning",
        disclosureId: "B3",
        disclosureTitle: titleFor(titles, "B3"),
        datapointId: null,
        message: `${count} Scope 3 ${count === 1 ? "row is" : "rows are"} stored. Scope 3 categories are supplementary and are not evaluated as Basic Module requirements. The values are kept for a later inclusion decision.`,
        href: "#vs2026-B3",
      }),
    );
  }

  issues.push(...comparativeIssues(input.comparativeBasis));
  const readiness = readinessFrom(issues);
  return {
    readiness,
    complianceClaim: "NOT_EVALUATED",
    conformityStatement: "NOT_PREPARED",
    comparativeBasis: input.comparativeBasis,
    employeeCategory: input.report.employeeCategory,
    employeeCategoryLabel: employeeCategoryLabel(input.report.employeeCategory),
    issues,
    disclosures: disclosureOverview(input.report.datapoints, titles),
    structuralOmissions,
    limitations: [...LIMITATIONS],
  };
}

export async function getVS2026ReportingState(input: {
  reportingPeriodId: string;
  request: Request;
  db: ReportingConfigurationDb;
  isEnabled?: (env: NodeJS.ProcessEnv) => boolean;
  resolveIdentity?: (request: Request) => Promise<AuthenticatedContext | null>;
}): Promise<VS2026ReportingState> {
  const enabled = input.isEnabled ?? isVS2026EditorEnabled;
  if (!enabled(process.env)) {
    return { ok: false, code: "EDITOR_DISABLED", message: "The VS 2026 editor is not enabled." };
  }
  const resolveIdentity = input.resolveIdentity ?? requireAuthenticatedUser;
  const identity = await resolveIdentity(input.request);
  if (!identity || identity.organizationId.trim() === "") {
    return { ok: false, code: "UNAUTHENTICATED", message: "Sign-in is required." };
  }
  const reportingPeriodId = input.reportingPeriodId.trim();
  if (reportingPeriodId === "") {
    return { ok: false, code: "NOT_FOUND", message: "Reporting period not found." };
  }
  const access = { reportingPeriodId, organizationId: identity.organizationId };
  let configuration;
  try {
    configuration = await getReportingConfiguration(access, input.db);
  } catch {
    return { ok: false, code: "DATABASE_FAILURE", message: "The reporting state could not be loaded." };
  }
  if (!configuration.ok) {
    if (configuration.reason === "STORED_CONFIGURATION_INVALID") {
      return stateShell({
        reportingPeriodId,
        year: null,
        companyName: null,
        standard: { kind: "INVALID" },
        reportingOption: null,
        review: emptyReview("INVALID_REPORTING_STATE", "UNKNOWN"),
      });
    }
    return { ok: false, code: "NOT_FOUND", message: "Reporting period not found." };
  }

  const period = await input.db.reportingPeriod.findFirst({
    where: { id: reportingPeriodId, company: { organizationId: identity.organizationId } },
    select: { year: true, company: { select: { name: true } } },
  });
  if (!period) {
    return { ok: false, code: "NOT_FOUND", message: "Reporting period not found." };
  }
  const storedOption =
    configuration.configuration.status === "CONFIGURED"
      ? configuration.configuration.reportingOption
      : null;
  const standard = reportingStandardFromOption(storedOption);
  if (standard.kind !== "VS2026" || standard.option !== "OPTION_A") {
    return stateShell({
      reportingPeriodId,
      year: period.year,
      companyName: period.company.name,
      standard,
      reportingOption: standard.kind === "VS2026" ? standard.option : null,
      review: aggregateReportingReadiness({
        standard,
        report: null,
        comparativeBasis: "UNKNOWN",
        supplementaryRowCounts: {},
        integrityIssues: [],
      }),
    });
  }

  const loaded = await loadVS2026EvaluationInput(access, input.db);
  if (!loaded.ok) {
    return stateShell({
      reportingPeriodId,
      year: period.year,
      companyName: period.company.name,
      standard,
      reportingOption: "OPTION_A",
      review: aggregateReportingReadiness({
        standard,
        report: null,
        comparativeBasis: "UNKNOWN",
        supplementaryRowCounts: {},
        integrityIssues: loaded.issues.map((item) => ({
          code: item.code,
          datapointId: item.datapointId,
        })),
      }),
    });
  }

  const storedScalars = await input.db.sustainabilityDataPoint.findMany({
    where: { reportingPeriodId },
    select: {
      fieldId: true,
      value: true,
      legacyFieldId: true,
      migratedFieldId: true,
      migrationStatus: true,
      reportingOrigin: true,
    },
    orderBy: { fieldId: "asc" },
  });
  const basisRow = storedScalars.find((row) => row.fieldId === VS2026_COMPARATIVE_BASIS) ?? null;
  const basisValue = basisRow?.value.trim() ?? "";
  const comparativeBasis = comparativeBasisFromStored(basisValue);
  const integrityIssues =
    basisRow && basisValue !== "" && comparativeBasis === "UNKNOWN"
      ? [{ code: "MALFORMED_VALUE", datapointId: VS2026_COMPARATIVE_BASIS }]
      : [];
  const supplementaryRowCounts: Record<string, number> = {};
  for (const row of loaded.loaded.rows) {
    if (row.groupId === SCOPE3_GROUP) {
      supplementaryRowCounts[row.groupId] = (supplementaryRowCounts[row.groupId] ?? 0) + 1;
    }
  }
  const report = evaluateVS2026ReportingState(loaded.loaded.input);
  return stateShell({
    reportingPeriodId,
    year: period.year,
    companyName: period.company.name,
    standard,
    reportingOption: "OPTION_A",
    review: aggregateReportingReadiness({
      standard,
      report,
      comparativeBasis,
      supplementaryRowCounts,
      integrityIssues,
      provenanceConflicts: unverifiedVs2026FieldIds(storedScalars).map((fieldId) => ({
        datapointId: fieldId,
      })),
    }),
  });
}

function stateShell(input: {
  reportingPeriodId: string;
  year: number | null;
  companyName: string | null;
  standard: ReportingStandardIdentity;
  reportingOption: "OPTION_A" | "OPTION_B" | null;
  review: ReportingReview;
}): VS2026ReportingState {
  return { ok: true, ...input };
}

function emptyReview(readiness: ReviewReadiness, comparativeBasis: ComparativeBasis): ReportingReview {
  return {
    readiness,
    complianceClaim: "NOT_EVALUATED",
    conformityStatement: "NOT_PREPARED",
    comparativeBasis,
    employeeCategory: null,
    employeeCategoryLabel: "Not determined",
    issues: [],
    disclosures: editorDisclosures().map((disclosure) => ({
      id: disclosure.id,
      title: disclosure.title,
      requiredMissing: 0,
      unassessed: 0,
      invalid: 0,
    })),
    structuralOmissions: 0,
    limitations: [...LIMITATIONS],
  };
}

function classifyDatapoint(
  datapoint: DatapointEvaluation,
  titles: ReadonlyMap<string, string>,
): ReviewIssue | "structural-omission" | null {
  if (!datapoint.inReportingScope || datapoint.scope === "OUT_OF_SCOPE") {
    return null;
  }
  if (datapoint.omissionStatus === "VALID") {
    return "structural-omission";
  }
  if (datapoint.datapointId === TOPIC_LIST && datapoint.completionStatus === "REQUIRED_MISSING") {
    return issue({
      code: "UNRECOGNISED_SUPPLEMENTARY_INFORMATION",
      severity: "optional",
      disclosureId: datapoint.disclosureId,
      disclosureTitle: titleFor(titles, datapoint.disclosureId),
      datapointId: datapoint.datapointId,
      message:
        "Appendix B topic selection is not available. Paragraph 29 is reported through the existence answers. The topic list is not a closed requirement and does not block review.",
      href: hrefFor(datapoint.disclosureId, datapoint.datapointId),
    });
  }
  if (datapoint.datapointId === COMPLIANCE_STATEMENT && datapoint.completionStatus === "REQUIRED_MISSING") {
    return issue({
      code: "REPORT_FINALISATION_PENDING",
      severity: "finalisation",
      disclosureId: datapoint.disclosureId,
      disclosureTitle: titleFor(titles, datapoint.disclosureId),
      datapointId: datapoint.datapointId,
      message:
        "The paragraph 27(a) conformity statement is prepared when the report is finalised. It is not created from this review.",
      href: hrefFor(datapoint.disclosureId, datapoint.datapointId),
    });
  }
  if (datapoint.datapointId === COMBINED_EMISSIONS_TOTAL) {
    return null;
  }
  if (
    datapoint.outputRole === "DIGITAL_ONLY" ||
    datapoint.informationClass === "DIGITAL_FACT" ||
    datapoint.informationClass === "PREPARATION_DATA" ||
    datapoint.outputRole === "PREPARATION_ONLY" ||
    datapoint.completionStatus === "NOT_A_COMPLETION_TARGET" ||
    datapoint.completionStatus === "VOLUNTARY_MISSING"
  ) {
    return null;
  }
  const href = hrefFor(datapoint.disclosureId, datapoint.rowId ? null : datapoint.datapointId);
  const label = registryDatapoint(datapoint.datapointId)?.regulatoryStatement ?? datapoint.datapointId;
  const base = {
    disclosureId: datapoint.disclosureId,
    disclosureTitle: titleFor(titles, datapoint.disclosureId),
    datapointId: datapoint.datapointId,
    href,
  };
  if (datapoint.valueStatus === "INVALID") {
    return issue({
      ...base,
      code: "INVALID_REPORTED_VALUE",
      severity: "blocking",
      message: `${label} has a value that fails validation.`,
    });
  }
  if (datapoint.reasons.some((reason) => reason.startsWith("DUPLICATE") || reason === "CONFIGURATION_VALUE_CONFLICT")) {
    return issue({
      ...base,
      code: "DATA_INTEGRITY_CONFLICT",
      severity: "blocking",
      message: `${label} conflicts with another stored value.`,
    });
  }
  if (
    datapoint.completionStatus === "OMISSION_UNVERIFIED" ||
    (datapoint.completionStatus === "REQUIRED_MISSING" &&
      datapoint.reasons.some(
        (reason) => reason.startsWith("OMISSION_") || reason === "B1_27B_LIST_INCOMPLETE",
      ))
  ) {
    return issue({
      ...base,
      code: "OMISSION_INCOMPLETE",
      severity: "blocking",
      message: `${label} has an incomplete paragraph 22 omission. A complete claim is still only an attestation.`,
    });
  }
  if (datapoint.completionStatus === "BLOCKED_UNASSESSED") {
    return issue({
      ...base,
      code: "CONDITION_UNASSESSED",
      severity: "quality",
      message: datapoint.reasons.includes("EMPLOYEE_SIZE_NOT_PROVIDED")
        ? `${label} cannot be classified until the employee-size measure is entered. This is an internal check, not a new legal obligation.`
        : `${label} depends on a condition that has not been assessed. Annex I can treat an omitted conditional disclosure as not applicable. LibreVS asks for an explicit assessment before review.`,
    });
  }
  if (datapoint.completionStatus === "REQUIRED_MISSING") {
    return issue({
      ...base,
      code: "REQUIRED_FACT_MISSING",
      severity: "blocking",
      message: `${label} is required for this reporting scope and has no value.`,
    });
  }
  return null;
}

function comparativeIssues(basis: ComparativeBasis): ReviewIssue[] {
  if (basis === "UNKNOWN") {
    return [
      issue({
        code: "CONDITION_UNASSESSED",
        severity: "quality",
        disclosureId: "B1",
        disclosureTitle: titleFor(new Map(), "B1"),
        datapointId: VS2026_COMPARATIVE_BASIS,
        message:
          "State whether this is the undertaking's first VS 2026 reporting year or a subsequent year. A new period in this database is not treated as a first year.",
        href: "#vs2026-comparative",
      }),
    ];
  }
  if (basis === "SUBSEQUENT") {
    return [
      issue({
        code: "UNSUPPORTED_REPORTABLE_FACT",
        severity: "unsupported",
        disclosureId: "B1",
        disclosureTitle: titleFor(new Map(), "B1"),
        datapointId: VS2026_COMPARATIVE_BASIS,
        message:
          "Comparative information is required from the second reporting year, with an exception for metrics disclosed for the first time. That comparison is not available, so this review is not complete.",
        href: "#vs2026-comparative",
      }),
    ];
  }
  return [
    issue({
      code: "UNRECOGNISED_SUPPLEMENTARY_INFORMATION",
      severity: "warning",
      disclosureId: "B1",
      disclosureTitle: titleFor(new Map(), "B1"),
      datapointId: VS2026_COMPARATIVE_BASIS,
      message:
        "First-year reporting does not require comparative figures. Paragraph 18 references to unchanged earlier datapoints are still not supported.",
      href: "#vs2026-comparative",
    }),
  ];
}

function readinessFrom(issues: readonly ReviewIssue[]): ReviewReadiness {
  const correction = issues.some(
    (item) =>
      item.severity === "blocking" &&
      (item.code === "INVALID_REPORTED_VALUE" ||
        item.code === "OMISSION_INCOMPLETE" ||
        item.code === "DATA_INTEGRITY_CONFLICT" ||
        item.code === "LEGACY_VALUE_PROVENANCE"),
  );
  if (correction) {
    return "NEEDS_CORRECTION";
  }
  if (issues.some((item) => item.code === "REQUIRED_FACT_MISSING")) {
    return "IN_PROGRESS";
  }
  if (issues.some((item) => item.severity === "quality")) {
    return "NEEDS_ASSESSMENT";
  }
  if (issues.some((item) => item.severity === "unsupported")) {
    return "UNSUPPORTED";
  }
  return "READY_FOR_REVIEW";
}

function disclosureOverview(
  datapoints: readonly DatapointEvaluation[],
  titles: ReadonlyMap<string, string>,
): DisclosureReview[] {
  return editorDisclosures().map((disclosure) => {
    const rows = datapoints.filter((item) => item.disclosureId === disclosure.id && item.inReportingScope);
    return {
      id: disclosure.id,
      title: titles.get(disclosure.id) ?? disclosure.title,
      requiredMissing: rows.filter((item) => item.completionStatus === "REQUIRED_MISSING").length,
      unassessed: rows.filter((item) => item.completionStatus === "BLOCKED_UNASSESSED").length,
      invalid: rows.filter((item) => item.valueStatus === "INVALID" || item.completionStatus === "OMISSION_UNVERIFIED").length,
    };
  });
}

function disclosureIdFor(datapointId: string | null): string {
  if (
    !datapointId ||
    datapointId === VS2026_COMPARATIVE_BASIS ||
    datapointId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE
  ) {
    return "B1";
  }
  return registryDatapoint(datapointId)?.disclosure ?? datapointId.slice(0, 2);
}

function titleFor(titles: ReadonlyMap<string, string>, disclosureId: string): string {
  return titles.get(disclosureId) ?? editorDisclosures().find((item) => item.id === disclosureId)?.title ?? disclosureId;
}

function provenanceIssue(titles: ReadonlyMap<string, string>, datapointId: string): ReviewIssue {
  return issue({
    code: "LEGACY_VALUE_PROVENANCE",
    severity: "blocking",
    disclosureId: disclosureIdFor(datapointId),
    disclosureTitle: titleFor(titles, disclosureIdFor(datapointId)),
    datapointId,
    message:
      "This stored value has no verified VS 2026 origin. It is not a reported VS 2026 fact. Re-save it in the VS 2026 editor, or use a clean VS 2026 period. Historical values are not imported.",
    href: hrefFor(disclosureIdFor(datapointId), datapointId),
  });
}

function hrefFor(disclosureId: string, datapointId: string | null): string {
  if (datapointId === VS2026_COMPARATIVE_BASIS) {
    return "#vs2026-comparative";
  }
  if (datapointId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE) {
    return "#vs2026-employee-measure";
  }
  if (datapointId && registryDatapoint(datapointId)) {
    return `#vs2026-${datapointId}`;
  }
  return `#vs2026-${disclosureId}`;
}

function employeeCategoryLabel(category: "EMPLOYEES_LE_10" | "EMPLOYEES_GT_10" | null): string {
  if (category === "EMPLOYEES_LE_10") {
    return "10 employees or fewer";
  }
  if (category === "EMPLOYEES_GT_10") {
    return "More than 10 employees";
  }
  return "Not determined";
}

function issue(value: ReviewIssue): ReviewIssue {
  return value;
}
