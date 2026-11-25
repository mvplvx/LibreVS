/**
 * Reporting-module selection for Annex I paragraphs 6, 7, 24, 25 and 27(a).
 *
 * Option A is the Basic Module. Option B is the Basic Module and the
 * Comprehensive Module. Paragraph 25 additional Comprehensive disclosures
 * stay on Option A and do not become Option B.
 *
 * Employee count is not an input. A disclosure in scope is not a statement
 * that every datapoint in it must be answered, and selection is not compliance.
 */

export const BASIC_DISCLOSURES = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B9",
  "B10",
  "B11",
] as const;

export const COMPREHENSIVE_DISCLOSURES = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
] as const;

export type BasicDisclosureId = (typeof BASIC_DISCLOSURES)[number];
export type ComprehensiveDisclosureId = (typeof COMPREHENSIVE_DISCLOSURES)[number];
export type DisclosureId = BasicDisclosureId | ComprehensiveDisclosureId;
export type ReportingModule = "BASIC" | "COMPREHENSIVE";
export type ReportingOption = "OPTION_A" | "OPTION_B";

const BASIC_SET = new Set<string>(BASIC_DISCLOSURES);
const COMPREHENSIVE_SET = new Set<string>(COMPREHENSIVE_DISCLOSURES);
function isReportingOption(value: string): value is ReportingOption {
  return value === "OPTION_A" || value === "OPTION_B";
}

export type ModuleSelectionRejection =
  | "MISSING_CONFIGURATION"
  | "MALFORMED_CONFIGURATION"
  | "UNKNOWN_REPORTING_OPTION"
  | "UNKNOWN_DISCLOSURE"
  | "BASIC_DISCLOSURE_NOT_ADDITIONAL"
  | "DUPLICATE_DISCLOSURE"
  | "ADDITIONAL_DISCLOSURE_NOT_ALLOWED_FOR_OPTION_B";

/**
 * Selected option, the disclosures in that reporting scope, and the two
 * assessments this phase deliberately does not perform.
 */
export type ModuleResolution = {
  readonly reportingOption: ReportingOption;
  readonly additionalComprehensiveDisclosures: readonly ComprehensiveDisclosureId[];
  readonly modules: readonly ReportingModule[];
  readonly disclosuresInScope: readonly DisclosureId[];
  readonly fullComprehensiveExpected: boolean;
  readonly completionAssessment: "NOT_EVALUATED";
  readonly complianceClaimEligibility: "NOT_EVALUATED";
};

export type ModuleSelectionResult =
  | { readonly ok: true; readonly resolution: ModuleResolution }
  | { readonly ok: false; readonly reason: ModuleSelectionRejection };

export type DisclosureScopeStatus =
  | { readonly status: "IN_SCOPE"; readonly additionalComprehensive: boolean }
  | { readonly status: "OUT_OF_SCOPE" }
  | { readonly status: "UNKNOWN_DISCLOSURE" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Modules required by the formal option. Paragraph 25 additions do not add COMPREHENSIVE. */
export function modulesForReportingOption(
  option: ReportingOption,
): readonly ReportingModule[] {
  if (option === "OPTION_A") {
    return ["BASIC"];
  }
  return ["BASIC", "COMPREHENSIVE"];
}

/**
 * Reject unknown options, unknown disclosure ids, Basic ids supplied as
 * additional Comprehensive disclosures, duplicates, and additional
 * Comprehensive ids on Option B. Omitted additional list means none.
 * Null input is missing. A present but unusable value is malformed.
 */
export function resolveModuleSelection(input: unknown): ModuleSelectionResult {
  if (input === null || input === undefined) {
    return { ok: false, reason: "MISSING_CONFIGURATION" };
  }
  if (!isRecord(input) || !("reportingOption" in input)) {
    return { ok: false, reason: "MALFORMED_CONFIGURATION" };
  }

  const reportingOption = input.reportingOption;
  if (typeof reportingOption !== "string") {
    return { ok: false, reason: "MALFORMED_CONFIGURATION" };
  }
  if (!isReportingOption(reportingOption)) {
    return { ok: false, reason: "UNKNOWN_REPORTING_OPTION" };
  }

  const additionalValue = input.additionalComprehensiveDisclosures;
  if (additionalValue === undefined) {
    return success(reportingOption, []);
  }
  if (!Array.isArray(additionalValue)) {
    return { ok: false, reason: "MALFORMED_CONFIGURATION" };
  }

  const additional: ComprehensiveDisclosureId[] = [];
  const seen = new Set<string>();
  for (const entry of additionalValue) {
    if (typeof entry !== "string" || entry.trim() === "") {
      return { ok: false, reason: "MALFORMED_CONFIGURATION" };
    }
    if (seen.has(entry)) {
      return { ok: false, reason: "DUPLICATE_DISCLOSURE" };
    }
    seen.add(entry);
    if (BASIC_SET.has(entry)) {
      return { ok: false, reason: "BASIC_DISCLOSURE_NOT_ADDITIONAL" };
    }
    if (!COMPREHENSIVE_SET.has(entry)) {
      return { ok: false, reason: "UNKNOWN_DISCLOSURE" };
    }
    additional.push(entry as ComprehensiveDisclosureId);
  }

  if (reportingOption === "OPTION_B" && additional.length > 0) {
    return {
      ok: false,
      reason: "ADDITIONAL_DISCLOSURE_NOT_ALLOWED_FOR_OPTION_B",
    };
  }

  return success(reportingOption, additional);
}

function success(
  reportingOption: ReportingOption,
  additional: readonly ComprehensiveDisclosureId[],
): ModuleSelectionResult {
  const modules = modulesForReportingOption(reportingOption);
  const disclosuresInScope: DisclosureId[] =
    reportingOption === "OPTION_A"
      ? [...BASIC_DISCLOSURES, ...additional]
      : [...BASIC_DISCLOSURES, ...COMPREHENSIVE_DISCLOSURES];

  return {
    ok: true,
    resolution: Object.freeze({
      reportingOption,
      additionalComprehensiveDisclosures: Object.freeze([...additional]),
      modules: Object.freeze([...modules]),
      disclosuresInScope: Object.freeze(disclosuresInScope),
      fullComprehensiveExpected: reportingOption === "OPTION_B",
      completionAssessment: "NOT_EVALUATED",
      complianceClaimEligibility: "NOT_EVALUATED",
    }),
  };
}

/** Scope membership for one disclosure. Unknown ids are not treated as out of scope. */
export function disclosureScopeStatus(
  resolution: ModuleResolution,
  disclosureId: string,
): DisclosureScopeStatus {
  if (!BASIC_SET.has(disclosureId) && !COMPREHENSIVE_SET.has(disclosureId)) {
    return { status: "UNKNOWN_DISCLOSURE" };
  }
  if (!resolution.disclosuresInScope.includes(disclosureId as DisclosureId)) {
    return { status: "OUT_OF_SCOPE" };
  }
  return {
    status: "IN_SCOPE",
    additionalComprehensive:
      resolution.additionalComprehensiveDisclosures.includes(
        disclosureId as ComprehensiveDisclosureId,
      ),
  };
}

export function expectsFullComprehensive(
  resolution: ModuleResolution,
): boolean {
  return resolution.fullComprehensiveExpected;
}
