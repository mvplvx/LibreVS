import type { VsmeFieldDef, VsmeSectionDef, VsmeSubsectionDef } from "./vsme.types";

export function buildFieldPath(
  section: VsmeSectionDef,
  subsection: VsmeSubsectionDef,
  field: VsmeFieldDef
): string {
  return `${section.id}.${subsection.id}.${field.name}`;
}

export function buildFieldId(
  section: VsmeSectionDef,
  subsection: VsmeSubsectionDef,
  field: VsmeFieldDef
): string {
  return `${section.code}_${subsection.id}_${field.name}`
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
}
