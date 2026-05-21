export type VsmeFieldType = "number" | "string" | "boolean";

export type VsmeFieldDef = {
  /** Leaf name within subsection (e.g. "renewable") */
  name: string;
  type: VsmeFieldType;
  /** EFRAG Excel cell reference (canonical mapping anchor) */
  excelCell: string;
  label: string;
  unit?: string;
  description?: string;
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
  /** B = mandatory SME; C = conditional (501–1000 employees) */
  block: "B" | "C";
  mandatory: boolean;
  subsections: VsmeSubsectionDef[];
};

export type VsmeSchema = {
  version: string;
  standard: "VSME";
  alignment: "EFRAG";
  sections: VsmeSectionDef[];
};
