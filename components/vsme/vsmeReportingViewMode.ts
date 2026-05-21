import type { VsmeFieldValue, VsmeMateriality, VsmeUiField } from "./types";
import {
  getFieldMaterialityState,
  isFieldRequiredToFill,
} from "./fieldMaterialityState";
import { isFieldFilled } from "./fieldUtils";

export type ReportingViewMode =
  | "all"
  | "material"
  | "missing_required"
  | "excluded";

export const REPORTING_VIEW_MODE_OPTIONS: {
  id: ReportingViewMode;
  label: string;
  description: string;
}[] = [
  {
    id: "all",
    label: "All Fields",
    description: "Full EFRAG schema visibility",
  },
  {
    id: "material",
    label: "Material Only",
    description: "Fields marked for reporting",
  },
  {
    id: "missing_required",
    label: "Missing Required",
    description: "Incomplete required work and undecided decisions",
  },
  {
    id: "excluded",
    label: "Excluded (Non-Material)",
    description: "Explicitly excluded from reporting",
  },
];

export function reportingViewModeLabel(mode: ReportingViewMode): string {
  return (
    REPORTING_VIEW_MODE_OPTIONS.find((o) => o.id === mode)?.label ?? mode
  );
}

/** Visual filter only — does not change persistence or schema. */
export function fieldVisibleInViewMode(
  field: VsmeUiField,
  materialityByFieldId: Record<string, VsmeMateriality>,
  values: Record<string, VsmeFieldValue>,
  viewMode: ReportingViewMode
): boolean {
  if (!field.applicability.visible) {
    return false;
  }

  const state = getFieldMaterialityState(field.fieldId, materialityByFieldId);

  switch (viewMode) {
    case "all":
      return true;
    case "material":
      return state === "MATERIAL";
    case "excluded":
      return state === "NON_MATERIAL";
    case "missing_required": {
      if (state === "UNDECIDED" && field.applicability.moduleInReportingScope) {
        return true;
      }
      return (
        isFieldRequiredToFill(field, state) &&
        !isFieldFilled(values[field.fieldId]?.value)
      );
    }
    default:
      return true;
  }
}
