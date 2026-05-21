import type { VsmeModule } from "./vsme.types";

/** C module mandatory reporting scope from this employee count (inclusive). */
export const COMPREHENSIVE_EMPLOYEE_THRESHOLD = 500;

export const COMPREHENSIVE_EMPLOYEE_MAX = 1000;

export function isModuleCInReportingScope(employeeCount: number): boolean {
  return employeeCount >= COMPREHENSIVE_EMPLOYEE_THRESHOLD;
}

export function isModuleInReportingScope(
  module: VsmeModule,
  employeeCount: number
): boolean {
  if (module === "B") {
    return true;
  }
  return isModuleCInReportingScope(employeeCount);
}
