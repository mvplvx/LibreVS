import type { VsmeMateriality, VsmeUiField, VsmeUiSection } from "./types";

export function workflowLabelText(label: string): string {
  return label.replace(/_/g, " ");
}

/** requiredToFill = moduleInReportingScope × materiality (material only). */
export function isFieldRequiredToFill(
  field: VsmeUiField,
  materiality?: VsmeMateriality
): boolean {
  if (!field.applicability.visible) {
    return false;
  }
  const m = materiality ?? field.applicability.materiality;
  return field.applicability.moduleInReportingScope && m === "material";
}

export function isFieldFilled(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function sectionFieldList(section: VsmeUiSection) {
  return section.subsections.flatMap((subsection) => subsection.fields);
}

export function sectionProgressFromValues(
  section: VsmeUiSection,
  values: Record<string, { value: string }>,
  bySection?: Record<string, { reported: number; total: number }>
): { reported: number; total: number } {
  const apiCounts = bySection?.[section.code];
  if (apiCounts) {
    return apiCounts;
  }
  const fields = sectionFieldList(section).filter((f) =>
    isFieldRequiredToFill(f)
  );
  const total = fields.length;
  const reported = fields.filter((f) =>
    isFieldFilled(values[f.fieldId]?.value)
  ).length;
  return { reported, total };
}
