import { isModuleInReportingScope } from "./moduleScope";
import type { VsmeModule } from "./vsme.types";

export type VsmeMateriality = "material" | "non_material";

export const DEFAULT_MATERIALITY: VsmeMateriality = "material";

export function parseMateriality(value: string | null | undefined): VsmeMateriality {
  return value === "non_material" ? "non_material" : "material";
}

export function buildMaterialityMap(
  rows: Array<{ fieldId: string; materiality: string }>
): Record<string, VsmeMateriality> {
  const map: Record<string, VsmeMateriality> = {};
  for (const row of rows) {
    map[row.fieldId] = parseMateriality(row.materiality);
  }
  return map;
}

export function getFieldMateriality(
  fieldId: string,
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): VsmeMateriality {
  return materialityByFieldId[fieldId] ?? DEFAULT_MATERIALITY;
}

/** module reporting scope × materiality (not employee rules alone). */
export function isRequiredToFill(
  module: VsmeModule,
  employeeCount: number,
  materiality: VsmeMateriality = DEFAULT_MATERIALITY
): boolean {
  return (
    isModuleInReportingScope(module, employeeCount) &&
    materiality === "material"
  );
}
