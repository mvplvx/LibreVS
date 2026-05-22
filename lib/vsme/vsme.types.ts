export type VsmeFieldType = "number" | "string" | "boolean";

/** B = basic module (all in-scope SMEs). C = comprehensive module (full parity in schema). */
export type VsmeModule = "B" | "C";

/**
 * Registry metadata for which module owns a section (not materiality).
 * - always: B module — always in reporting scope
 * - if_employee_count_gt_500: C module — obligation when employee count ≥ threshold
 */
export type VsmeApplicabilityRule =
  | "always"
  | "if_employee_count_gt_500"
  | "voluntary";

export type VsmeExcelSheet =
  | "General"
  | "Environmental"
  | "Social"
  | "Governance";

/** Read-only EFRAG paragraph traceability (UI/documentation only). */
export type EfragReference = {
  paragraph: string;
  section: string;
  url: string;
};

export type VsmeFieldDef = {
  name: string;
  type: VsmeFieldType;
  /** EFRAG Digital Template: `{Sheet}!{XbrlNamedRange}` */
  excelCell: string;
  /** XBRL taxonomy element / Excel named range (EFRAG v1.1.0). */
  xbrlNamedRange: string;
  excelSheet: VsmeExcelSheet;
  label: string;
  description: string;
  /** VSME standard paragraph reference, e.g. "29", "24(e)(v)". */
  efragParagraph?: string;
  /** Structured EFRAG traceability for UI (optional; may be derived from efragParagraph). */
  efragReference?: EfragReference;
  unit?: string;
};

export type VsmeSubsectionDef = {
  id: string;
  title: string;
  fields: VsmeFieldDef[];
};

export type VsmeSectionDef = {
  id: string;
  code: string;
  title: string;
  module: VsmeModule;
  /** B1–C9 are fully implemented; applicability only affects workflow/export. */
  schemaFidelity: "full";
  applicabilityRule: VsmeApplicabilityRule;
  subsections: VsmeSubsectionDef[];
};

export type VsmeSchema = {
  version: string;
  standard: "VSME";
  alignment: "EFRAG";
  /** EFRAG VSME Digital Template version for excelCell named ranges. */
  templateVersion: string;
  sections: VsmeSectionDef[];
};

export type VsmeWorkflowLabel =
  | "in_scope"
  | "c_module_optional_scope"
  | "c_module_mandatory_scope";
