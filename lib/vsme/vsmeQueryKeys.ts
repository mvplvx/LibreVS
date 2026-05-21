/**
 * VSME React Query key factory.
 * apiGet/apiPost = transport only; hooks in components/vsme/queries own cache keys.
 */
export const vsmeKeys = {
  all: ["vsme"] as const,

  companies: () => [...vsmeKeys.all, "companies"] as const,

  reportingPeriods: () => [...vsmeKeys.all, "reporting-periods"] as const,

  reportingPeriod: (id: string) =>
    [...vsmeKeys.all, "reporting-period", id] as const,

  dashboard: (reportingPeriodId: string) =>
    [...vsmeKeys.all, "dashboard", reportingPeriodId] as const,

  uiSchema: (employeeCount: number, reportingPeriodId: string) =>
    [...vsmeKeys.all, "ui-schema", employeeCount, reportingPeriodId] as const,

  fieldValues: (reportingPeriodId: string) =>
    [...vsmeKeys.all, "field-values", reportingPeriodId] as const,

  coverage: (reportingPeriodId: string) =>
    [...vsmeKeys.all, "coverage", reportingPeriodId] as const,

  materiality: (reportingPeriodId: string) =>
    [...vsmeKeys.all, "materiality", reportingPeriodId] as const,
};
