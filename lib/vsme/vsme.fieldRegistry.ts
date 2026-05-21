import { VSME_SCHEMA } from "./vsme.schema";
import { buildFieldId, buildFieldPath } from "./buildFieldPath";
import type { VsmeFieldDef, VsmeSectionDef, VsmeSubsectionDef } from "./vsme.types";

export type VsmeRegistryEntry = {
  fieldId: string;
  path: string;
  type: VsmeFieldDef["type"];
  excelCell: string;
  label: string;
  unit?: string;
  sectionId: string;
  sectionCode: string;
  subsectionId: string;
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
          label: field.label,
          unit: field.unit,
          sectionId: section.id,
          sectionCode: section.code,
          subsectionId: subsection.id,
        };
      }
    }
  }

  return registry;
}

/** Canonical FIELD_ID → dot-path registry (single source of truth for DB + export). */
export const VSME_FIELD_REGISTRY = buildRegistry();

/** Flat map: FIELD_ID → path string (audit/export contract). */
export const VSME_FIELD_PATH_MAP: Record<string, string> = Object.fromEntries(
  Object.values(VSME_FIELD_REGISTRY).map((entry) => [entry.fieldId, entry.path])
);

export const VSME_FIELD_IDS = Object.keys(VSME_FIELD_REGISTRY) as string[];

export const VSME_FIELD_COUNT = VSME_FIELD_IDS.length;

export function getRegistryEntry(
  fieldId: string
): VsmeRegistryEntry | undefined {
  return VSME_FIELD_REGISTRY[fieldId];
}
