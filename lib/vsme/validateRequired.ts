import { buildVsmeCompleteness } from "./completeness";
import type { VsmeMateriality } from "./materiality";

export function getMissingRequiredFieldIds(
  employeeCount: number,
  reportedFieldIds: string[],
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): string[] {
  return buildVsmeCompleteness(employeeCount, reportedFieldIds, materialityByFieldId)
    .missingRequiredFields;
}
