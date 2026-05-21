import type { VsmeMateriality } from "./types";
import type { VsmeUiField } from "./types";

/** Explicit per-field reporting decision (UI layer). */
export type FieldMaterialityState =
  | "UNDECIDED"
  | "MATERIAL"
  | "NON_MATERIAL";

export function getFieldMaterialityState(
  fieldId: string,
  dbMaterialityByFieldId: Record<string, VsmeMateriality>
): FieldMaterialityState {
  const stored = dbMaterialityByFieldId[fieldId];
  if (stored === "material") {
    return "MATERIAL";
  }
  if (stored === "non_material") {
    return "NON_MATERIAL";
  }
  return "UNDECIDED";
}

export function fieldMaterialityStateToApi(
  state: FieldMaterialityState
): VsmeMateriality | null {
  if (state === "MATERIAL") {
    return "material";
  }
  if (state === "NON_MATERIAL") {
    return "non_material";
  }
  return null;
}

/** Required for reporting = in module scope and explicitly material. */
export function isFieldRequiredToFill(
  field: VsmeUiField,
  state: FieldMaterialityState
): boolean {
  if (!field.applicability.visible) {
    return false;
  }
  return (
    field.applicability.moduleInReportingScope && state === "MATERIAL"
  );
}

export function countUndecidedVisibleFields(
  fields: VsmeUiField[],
  dbMaterialityByFieldId: Record<string, VsmeMateriality>
): number {
  return fields.filter(
    (f) =>
      f.applicability.visible &&
      getFieldMaterialityState(f.fieldId, dbMaterialityByFieldId) ===
        "UNDECIDED"
  ).length;
}
