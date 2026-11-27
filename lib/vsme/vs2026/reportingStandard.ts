/**
 * VS 2026 is the only active reporting standard.
 * schemaVersion is a stored label and is not a second standard.
 * A null option means the user has not chosen Option A or Option B.
 */

export const VS2026_COMPARATIVE_BASIS = "VS2026_COMPARATIVE_BASIS";

/** Written only by the VS 2026 editor. Any other origin is not a VS 2026 fact. */
export const VS2026_REPORTING_ORIGIN = "VS2026_EDITOR";

export const RETIRED_REPORTING_MESSAGE =
  "This reporting route is retired. LibreVS uses VS 2026 for reporting.";

export type ComparativeBasis = "UNKNOWN" | "FIRST_YEAR" | "SUBSEQUENT";

export type ReportingStandardIdentity =
  | { readonly kind: "UNCONFIGURED" }
  | { readonly kind: "VS2026"; readonly option: "OPTION_A" | "OPTION_B" }
  | { readonly kind: "INVALID" };

export function reportingStandardFromOption(option: string | null): ReportingStandardIdentity {
  if (option === null) {
    return { kind: "UNCONFIGURED" };
  }
  if (option === "OPTION_A" || option === "OPTION_B") {
    return { kind: "VS2026", option };
  }
  return { kind: "INVALID" };
}

/** Legacy workspace writes are retired for every period, including an unconfigured one. */
export function legacyWorkspaceRefusal(option: string | null): string {
  void option;
  return RETIRED_REPORTING_MESSAGE;
}

/** Legacy export generation is retired for every period. */
export function legacyExportRefusal(option: string | null): string {
  void option;
  return RETIRED_REPORTING_MESSAGE;
}

export function comparativeBasisFromStored(value: string | null | undefined): ComparativeBasis {
  if (value === "FIRST_YEAR" || value === "SUBSEQUENT") {
    return value;
  }
  return "UNKNOWN";
}
