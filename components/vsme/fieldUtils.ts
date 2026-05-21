import type { VsmeMateriality, VsmeUiSection } from "./types";
import {
  getFieldMaterialityState,
  isFieldRequiredToFill,
} from "./fieldMaterialityState";

export { isFieldRequiredToFill } from "./fieldMaterialityState";

export function workflowLabelText(label: string): string {
  return label.replace(/_/g, " ");
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
  bySection?: Record<string, { reported: number; total: number }>,
  dbMaterialityByFieldId?: Record<string, VsmeMateriality>
): { reported: number; total: number } {
  const apiCounts = bySection?.[section.code];
  if (apiCounts) {
    return apiCounts;
  }
  const fields = sectionFieldList(section).filter((f) =>
    dbMaterialityByFieldId
      ? isFieldRequiredToFill(
          f,
          getFieldMaterialityState(f.fieldId, dbMaterialityByFieldId)
        )
      : f.applicability.requiredToFill
  );
  const total = fields.length;
  const reported = fields.filter((f) =>
    isFieldFilled(values[f.fieldId]?.value)
  ).length;
  return { reported, total };
}
