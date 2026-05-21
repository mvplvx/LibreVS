import { VSME_SCHEMA } from "./vsme.schema";
import { buildFieldId, buildFieldPath } from "./buildFieldPath";
import type { VsmeApplicabilityRule, VsmeFieldDef, VsmeModule } from "./vsme.types";

/** Static canonical field metadata (employee-count rules applied at request time). */
export type VsmeRegistryEntry = {
  fieldId: string;
  path: string;
  type: VsmeFieldDef["type"];
  excelCell: string;
  xbrlNamedRange: string;
  excelSheet: VsmeFieldDef["excelSheet"];
  label: string;
  description: string;
  efragParagraph?: string;
  unit?: string;
  sectionId: string;
  sectionCode: string;
  subsectionId: string;
  module: VsmeModule;
  applicabilityRule: VsmeApplicabilityRule;
};

function buildRegistry(): Record<string, VsmeRegistryEntry> {
  const registry: Record<string, VsmeRegistryEntry> = {};

  for (const section of VSME_SCHEMA.sections) {
    for (const subsection of section.subsections) {
      for (const field of subsection.fields) {
        const fieldId = buildFieldId(section, subsection, field);
        const path = buildFieldPath(section, subsection, field);

        if (registry[fieldId]) {
          throw new Error(`Duplicate VSME fieldId: ${fieldId}`);
        }

        registry[fieldId] = {
          fieldId,
          path,
          type: field.type,
          excelCell: field.excelCell,
          xbrlNamedRange: field.xbrlNamedRange,
          excelSheet: field.excelSheet,
          label: field.label,
          description: field.description,
          efragParagraph: field.efragParagraph,
          unit: field.unit,
          sectionId: section.id,
          sectionCode: section.code,
          subsectionId: subsection.id,
          module: section.module,
          applicabilityRule: section.applicabilityRule,
        };
      }
    }
  }

  return registry;
}

export const VSME_FIELD_REGISTRY: Record<string, VsmeRegistryEntry> =
  buildRegistry();

export const VSME_FIELD_PATH_MAP: Record<string, string> = Object.fromEntries(
  Object.values(VSME_FIELD_REGISTRY).map((entry) => [entry.fieldId, entry.path])
);

export const VSME_FIELD_IDS: readonly string[] = Object.freeze(
  Object.keys(VSME_FIELD_REGISTRY)
);

export const VSME_FIELD_COUNT = VSME_FIELD_IDS.length;

export const VSME_B_FIELD_COUNT = VSME_FIELD_IDS.filter(
  (id) => VSME_FIELD_REGISTRY[id]?.module === "B"
).length;

export const VSME_C_FIELD_COUNT = VSME_FIELD_IDS.filter(
  (id) => VSME_FIELD_REGISTRY[id]?.module === "C"
).length;

export function getRegistryEntry(
  fieldId: string
): VsmeRegistryEntry | undefined {
  return VSME_FIELD_REGISTRY[fieldId];
}

export function isRegisteredFieldId(fieldId: string): boolean {
  return fieldId in VSME_FIELD_REGISTRY;
}
