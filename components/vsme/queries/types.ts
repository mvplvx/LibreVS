import type {
  VsmeCompleteness,
  VsmeCoverageMetrics,
  VsmeFieldValue,
  VsmeMateriality,
  VsmeReportingState,
  VsmeUiSchema,
} from "../types";

export type CompanyRecord = {
  id: string;
  name: string;
  employeeCount?: number | null;
  currency?: string | null;
};

export type ReportingPeriodRecord = {
  id: string;
  year: number;
  status: string;
  companyId: string;
  schemaVersion?: string;
};

export type StoredDataPoint = {
  fieldId: string;
  value: string;
  unit: string | null;
};

export type KpisPayload = {
  totalCoveragePercentage: number;
  inScopeCoveragePercentage: number;
  materialCoveragePercentage: number;
  requiredCoveragePercentage: number;
  /** @deprecated Use requiredCoveragePercentage */
  mandatoryCoveragePercentage?: number;
  fieldsReported: number;
  totalFields: number;
  exportReady: boolean;
  completeness: VsmeCompleteness;
  requiredFieldCount?: number;
  bySection: Record<string, { reported: number; total: number }>;
};

export type MaterialityResponse = {
  reportingPeriodId: string;
  byFieldId: Record<string, VsmeMateriality>;
};

export type DashboardPayload = {
  reportingPeriodId: string;
  year: number;
  status: string;
  companyId: string;
  schemaVersion: string;
  employeeCount: number;
  totalDataPoints: number;
  fieldsReported: number;
  totalFields: number;
  totalCoveragePercentage: number;
  inScopeCoveragePercentage: number;
  materialCoveragePercentage: number;
  requiredCoveragePercentage: number;
  mandatoryCoveragePercentage?: number;
  exportReady: boolean;
  completeness: VsmeCompleteness;
  reportingState: VsmeReportingState;
  requiredFieldCount?: number;
  bySection: Record<string, { reported: number; total: number }>;
  applicableSections: {
    sectionCode: string;
    module: string;
    moduleInReportingScope: boolean;
    workflowLabel: string;
  }[];
  values: {
    fieldId: string;
    path: string;
    label: string;
    value: string;
    unit: string | null;
    excelCell: string;
  }[];
};

export function mapFieldValuesToRecord(
  rows: StoredDataPoint[] | undefined
): Record<string, VsmeFieldValue> {
  const map: Record<string, VsmeFieldValue> = {};
  for (const row of rows ?? []) {
    map[row.fieldId] = { value: row.value, unit: row.unit };
  }
  return map;
}

export function mapKpisToCoverage(data: KpisPayload | undefined): VsmeCoverageMetrics | null {
  if (!data) {
    return null;
  }
  return {
    totalCoveragePercentage: data.totalCoveragePercentage,
    inScopeCoveragePercentage: data.inScopeCoveragePercentage,
    materialCoveragePercentage: data.materialCoveragePercentage,
    requiredCoveragePercentage:
      data.requiredCoveragePercentage ??
      data.mandatoryCoveragePercentage ??
      0,
    fieldsReported: data.fieldsReported,
    totalFields: data.totalFields,
    exportReady: data.exportReady,
    completeness: data.completeness,
    bySection: data.bySection ?? {},
  };
}

export function mapMaterialityToRecord(
  data: MaterialityResponse | undefined
): Record<string, VsmeMateriality> {
  return data?.byFieldId ?? {};
}

export type { VsmeUiSchema };
