import { getFieldIdsInModuleScope, getMandatoryFieldIdsForExport } from "./applicability";
import { getFieldMateriality } from "./materiality";
import type { VsmeMateriality } from "./materiality";
import { isV2FieldId } from "./runtime/dataTruthMode";
import { VSME_FIELD_IDS } from "./vsme.fieldRegistry";

export type VsmeCompleteness = {
  inScopeFieldIds: string[];
  materialFieldIds: string[];
  requiredFieldIds: string[];
  completedFieldIds: string[];
  missingRequiredFields: string[];
  missingMaterialFields: string[];
  exportBlockingFields: string[];
};

export function buildCompletedFieldIds(
  dataPoints: Array<{ fieldId: string; value: string }>
): string[] {
  const completed = new Set<string>();
  for (const dp of dataPoints) {
    if (isV2FieldId(dp.fieldId) && dp.value.trim().length > 0) {
      completed.add(dp.fieldId);
    }
  }
  return [...completed].sort();
}

export function coveragePercentage(
  completed: ReadonlySet<string>,
  targetIds: readonly string[]
): number {
  if (targetIds.length === 0) {
    return 0;
  }
  const done = targetIds.filter((id) => completed.has(id)).length;
  return Math.round((done / targetIds.length) * 100);
}

/**
 * Canonical completeness sets for a reporting period.
 *
 * - inScope: module reporting scope (employee count)
 * - material: materiality === "material" (registry-wide)
 * - required: inScope ∩ material (required to fill / export obligation)
 * - completed: v2 fields with non-empty stored values
 *
 * Derived:
 * - missingRequiredFields: required without completion
 * - missingMaterialFields: material without completion (includes optional-scope material)
 * - exportBlockingFields: same as missingRequiredFields (blocks exportReady)
 */
export function buildVsmeCompleteness(
  employeeCount: number,
  completedFieldIds: readonly string[],
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): VsmeCompleteness {
  const completed = new Set(completedFieldIds);

  const inScopeFieldIds = getFieldIdsInModuleScope(employeeCount).sort();
  const materialFieldIds = VSME_FIELD_IDS.filter(
    (fieldId) =>
      getFieldMateriality(fieldId, materialityByFieldId) === "material"
  ).sort();
  const requiredFieldIds = getMandatoryFieldIdsForExport(
    employeeCount,
    materialityByFieldId,
    completed
  ).sort();
  const completedSorted = [...completed].sort();

  const missingRequiredFields = requiredFieldIds.filter(
    (id) => !completed.has(id)
  );
  const missingMaterialFields = materialFieldIds.filter(
    (id) => !completed.has(id)
  );
  const exportBlockingFields = [...missingRequiredFields];

  return {
    inScopeFieldIds,
    materialFieldIds,
    requiredFieldIds,
    completedFieldIds: completedSorted,
    missingRequiredFields,
    missingMaterialFields,
    exportBlockingFields,
  };
}
