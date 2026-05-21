import type { VsmeMateriality } from "./materiality";

export type UiSectionVisibilityFieldInput = {
  materiality: VsmeMateriality;
  moduleInReportingScope: boolean;
  hasData: boolean;
};

/**
 * UX-only section visibility: show when any field is material, has stored data,
 * or is in module reporting scope. Field-level applicability is unchanged.
 */
export function isUiSectionVisible(
  fields: UiSectionVisibilityFieldInput[]
): boolean {
  return fields.some(
    (field) =>
      field.materiality === "material" ||
      field.hasData ||
      field.moduleInReportingScope
  );
}
