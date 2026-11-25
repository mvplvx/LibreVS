import type { EmployeeCategory } from "./types";

/**
 * The only measure kind accepted for the Annex I / Annex II split between
 * undertakings with 10 employees or fewer and undertakings with more than
 * 10 employees.
 *
 * Callers must pass this kind explicitly. A stored company workforce figure,
 * a headcount datapoint, the former Comprehensive gate, and the
 * protected-undertaking average in Directive (EU) 2026/470 are different
 * facts and are rejected.
 */
export const VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE =
  "VS2026_EMPLOYEE_PROPORTIONALITY" as const;

export type EmployeeSizeInput = {
  /** Reporting period the explicit measure belongs to. */
  reportingPeriodId: string;
  /**
   * Employee measure supplied for this proportionality test.
   * Null or omitted means the measure was not provided.
   */
  employeeMeasure: number | null | undefined;
  measureKind: string;
};

export type EmployeeSizeRejection =
  | "MISSING_REPORTING_PERIOD"
  | "MISSING_EMPLOYEE_MEASURE"
  | "NEGATIVE_EMPLOYEE_MEASURE"
  | "NON_FINITE_EMPLOYEE_MEASURE"
  | "MEASURE_NOT_EXPLICIT";

export type EmployeeSizeClassification =
  | {
      readonly ok: true;
      readonly category: EmployeeCategory;
      readonly reportingPeriodId: string;
      readonly employeeMeasure: number;
    }
  | {
      readonly ok: false;
      readonly reason: EmployeeSizeRejection;
    };

/**
 * Classify the explicit employee measure.
 * Ten employees or fewer is EMPLOYEES_LE_10. More than ten is EMPLOYEES_GT_10.
 * No other threshold is applied.
 */
export function classifyEmployeeSize(
  input: EmployeeSizeInput,
): EmployeeSizeClassification {
  if (input.measureKind !== VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE) {
    return { ok: false, reason: "MEASURE_NOT_EXPLICIT" };
  }

  if (
    typeof input.reportingPeriodId !== "string" ||
    input.reportingPeriodId.trim() === ""
  ) {
    return { ok: false, reason: "MISSING_REPORTING_PERIOD" };
  }

  if (input.employeeMeasure === null || input.employeeMeasure === undefined) {
    return { ok: false, reason: "MISSING_EMPLOYEE_MEASURE" };
  }

  if (typeof input.employeeMeasure !== "number") {
    return { ok: false, reason: "MISSING_EMPLOYEE_MEASURE" };
  }

  if (!Number.isFinite(input.employeeMeasure)) {
    return { ok: false, reason: "NON_FINITE_EMPLOYEE_MEASURE" };
  }

  if (input.employeeMeasure < 0) {
    return { ok: false, reason: "NEGATIVE_EMPLOYEE_MEASURE" };
  }

  const category: EmployeeCategory =
    input.employeeMeasure <= 10 ? "EMPLOYEES_LE_10" : "EMPLOYEES_GT_10";

  return {
    ok: true,
    category,
    reportingPeriodId: input.reportingPeriodId,
    employeeMeasure: input.employeeMeasure,
  };
}
