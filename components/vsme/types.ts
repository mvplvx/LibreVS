/** Client types aligned with GET /api/vsme/ui-schema (no hardcoded VSME structure). */

export type VsmeMateriality = "material" | "non_material";

export type VsmeReportingState =
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "export_ready"
  | "exported";

export type VsmeCompleteness = {
  inScopeFieldIds: string[];
  materialFieldIds: string[];
  requiredFieldIds: string[];
  completedFieldIds: string[];
  missingRequiredFields: string[];
  missingMaterialFields: string[];
  exportBlockingFields: string[];
};

export type VsmeUiFieldApplicability = {
  module: string;
  applicabilityRule: string;
  visible: boolean;
  moduleInReportingScope: boolean;
  materiality: VsmeMateriality;
  requiredToFill: boolean;
  workflowLabel: string;
};

export type VsmeUiField = {
  fieldId: string;
  path: string;
  name: string;
  label: string;
  description: string;
  type: "number" | "string" | "boolean" | "enum";
  excelCell: string;
  xbrlNamedRange: string;
  excelSheet: string;
  unit?: string;
  efragParagraph?: string;
  applicability: VsmeUiFieldApplicability;
};

export type VsmeUiSubsection = {
  id: string;
  title: string;
  fields: VsmeUiField[];
};

export type VsmeUiSectionApplicability = {
  module: string;
  applicabilityRule: string;
  visible: boolean;
  moduleInReportingScope: boolean;
  workflowLabel: string;
};

export type VsmeUiSection = {
  id: string;
  code: string;
  title: string;
  schemaFidelity: string;
  applicability: VsmeUiSectionApplicability;
  subsections: VsmeUiSubsection[];
};

export type VsmeUiSchema = {
  schemaVersion: string;
  templateVersion: string;
  standard: string;
  alignment: string;
  employeeCount: number;
  moduleCInReportingScope: boolean;
  sections: VsmeUiSection[];
};

export type VsmeFieldValue = {
  value: string;
  unit: string | null;
};

export type VsmeCoverageMetrics = {
  totalCoveragePercentage: number;
  inScopeCoveragePercentage: number;
  materialCoveragePercentage: number;
  requiredCoveragePercentage: number;
  fieldsReported: number;
  totalFields: number;
  exportReady: boolean;
  completeness: VsmeCompleteness;
  bySection: Record<string, { reported: number; total: number }>;
};
