import { VSME_SCHEMA } from "./vsme.schema";
import { buildFieldId, buildFieldPath } from "./buildFieldPath";

export type VsmeUiField = {
  fieldId: string;
  path: string;
  name: string;
  label: string;
  type: "number" | "string" | "boolean";
  excelCell: string;
  unit?: string;
};

export type VsmeUiSubsection = {
  id: string;
  title: string;
  fields: VsmeUiField[];
};

export type VsmeUiSection = {
  id: string;
  code: string;
  title: string;
  block: "B" | "C";
  mandatory: boolean;
  subsections: VsmeUiSubsection[];
};

export type VsmeUiSchema = {
  version: string;
  standard: string;
  alignment: string;
  sections: VsmeUiSection[];
};

function humanizeSegment(segment: string): string {
  return segment
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** UI structure generated from canonical VSME schema (no hardcoded forms). */
export function buildVsmeUiSchema(): VsmeUiSchema {
  const sections: VsmeUiSection[] = VSME_SCHEMA.sections.map((section) => ({
    id: section.id,
    code: section.code,
    title: section.title,
    block: section.block,
    mandatory: section.mandatory,
    subsections: section.subsections.map((subsection) => ({
      id: subsection.id,
      title: subsection.title,
      fields: subsection.fields.map((field) => {
        const fieldId = buildFieldId(section, subsection, field);
        const path = buildFieldPath(section, subsection, field);
        return {
          fieldId,
          path,
          name: field.name,
          label: field.label || humanizeSegment(field.name),
          type: field.type,
          excelCell: field.excelCell,
          unit: field.unit,
        };
      }),
    })),
  }));

  return {
    version: VSME_SCHEMA.version,
    standard: VSME_SCHEMA.standard,
    alignment: VSME_SCHEMA.alignment,
    sections,
  };
}

export const VSME_UI_SCHEMA = buildVsmeUiSchema();
