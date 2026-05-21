import type { VsmeFieldValue, VsmeMateriality, VsmeUiField, VsmeUiSection } from "./types";
import {
  getFieldMaterialityState,
  isFieldRequiredToFill,
} from "./fieldMaterialityState";
import { isFieldFilled, sectionFieldList } from "./fieldUtils";

export type VsmeModuleCode = "B" | "C";

export type ModuleWorkspaceMetrics = {
  module: VsmeModuleCode;
  completionPct: number;
  missingRequired: number;
  requiredTotal: number;
  materialFields: number;
  excludedFields: number;
  undecidedFields: number;
  visibleFieldCount: number;
  materialityDecisionPct: number;
};

export type SectionWorkspaceSummary = {
  completionPct: number;
  requiredMissing: number;
  requiredTotal: number;
  materialCount: number;
  excludedCount: number;
  undecidedCount: number;
  visibleFieldCount: number;
};

function visibleFieldsForSection(section: VsmeUiSection): VsmeUiField[] {
  return sectionFieldList(section).filter((f) => f.applicability.visible);
}

export function summarizeFields(
  fields: VsmeUiField[],
  materialityByFieldId: Record<string, VsmeMateriality>,
  values: Record<string, VsmeFieldValue>
): Omit<
  SectionWorkspaceSummary,
  "completionPct"
> & {
  requiredCompleted: number;
} {
  let requiredTotal = 0;
  let requiredCompleted = 0;
  let materialCount = 0;
  let excludedCount = 0;
  let undecidedCount = 0;

  for (const field of fields) {
    const state = getFieldMaterialityState(field.fieldId, materialityByFieldId);
    if (state === "MATERIAL") {
      materialCount += 1;
    } else if (state === "NON_MATERIAL") {
      excludedCount += 1;
    } else {
      undecidedCount += 1;
    }

    if (isFieldRequiredToFill(field, state)) {
      requiredTotal += 1;
      if (isFieldFilled(values[field.fieldId]?.value)) {
        requiredCompleted += 1;
      }
    }
  }

  const requiredMissing = requiredTotal - requiredCompleted;

  return {
    requiredTotal,
    requiredMissing,
    requiredCompleted,
    materialCount,
    excludedCount,
    undecidedCount,
    visibleFieldCount: fields.length,
  };
}

export function computeSectionSummary(
  section: VsmeUiSection,
  materialityByFieldId: Record<string, VsmeMateriality>,
  values: Record<string, VsmeFieldValue>
): SectionWorkspaceSummary {
  const fields = visibleFieldsForSection(section);
  const stats = summarizeFields(fields, materialityByFieldId, values);
  const completionPct =
    stats.requiredTotal === 0
      ? 100
      : Math.round((stats.requiredCompleted / stats.requiredTotal) * 100);

  return {
    completionPct,
    requiredMissing: stats.requiredMissing,
    requiredTotal: stats.requiredTotal,
    materialCount: stats.materialCount,
    excludedCount: stats.excludedCount,
    undecidedCount: stats.undecidedCount,
    visibleFieldCount: stats.visibleFieldCount,
  };
}

export function computeModuleMetrics(
  module: VsmeModuleCode,
  sections: VsmeUiSection[],
  materialityByFieldId: Record<string, VsmeMateriality>,
  values: Record<string, VsmeFieldValue>
): ModuleWorkspaceMetrics {
  const moduleSections = sections.filter(
    (s) => s.applicability.visible && s.applicability.module === module
  );
  const fields = moduleSections.flatMap((s) => visibleFieldsForSection(s));
  const stats = summarizeFields(fields, materialityByFieldId, values);

  const decided = stats.materialCount + stats.excludedCount;
  const materialityDecisionPct =
    fields.length === 0 ? 100 : Math.round((decided / fields.length) * 100);

  const completionPct =
    stats.requiredTotal === 0
      ? 100
      : Math.round((stats.requiredCompleted / stats.requiredTotal) * 100);

  return {
    module,
    completionPct,
    missingRequired: stats.requiredMissing,
    requiredTotal: stats.requiredTotal,
    materialFields: stats.materialCount,
    excludedFields: stats.excludedCount,
    undecidedFields: stats.undecidedCount,
    visibleFieldCount: fields.length,
    materialityDecisionPct,
  };
}

export function groupSectionsByModule(sections: VsmeUiSection[]): {
  basic: VsmeUiSection[];
  comprehensive: VsmeUiSection[];
} {
  const visible = sections.filter((s) => s.applicability.visible);
  return {
    basic: visible.filter((s) => s.applicability.module === "B"),
    comprehensive: visible.filter((s) => s.applicability.module === "C"),
  };
}
