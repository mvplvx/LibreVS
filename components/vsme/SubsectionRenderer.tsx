"use client";

import type { FieldSaveState } from "./fieldSaveState";
import type { VsmeFieldValue, VsmeMateriality, VsmeUiSubsection } from "./types";
import { getFieldMaterialityState } from "./fieldMaterialityState";
import { FieldRenderer } from "./FieldRenderer";
import {
  fieldVisibleInViewMode,
  type ReportingViewMode,
} from "./vsmeReportingViewMode";

type SubsectionRendererProps = {
  subsection: VsmeUiSubsection;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  exportBlockingIds: Set<string>;
  materialitySavingFieldId: string | null;
  saveStateByFieldId: Record<string, FieldSaveState>;
  viewMode: ReportingViewMode;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
  onRetrySave: (fieldId: string) => void;
  valueInputsDisabled?: boolean;
  materialityDisabled?: boolean;
  showExportBlockingHints?: boolean;
};

export function SubsectionRenderer({
  subsection,
  values,
  materialityByFieldId,
  exportBlockingIds,
  materialitySavingFieldId,
  saveStateByFieldId,
  viewMode,
  onMaterialityChange,
  onChange,
  onSave,
  onRetrySave,
  valueInputsDisabled = false,
  materialityDisabled = false,
  showExportBlockingHints = true,
}: SubsectionRendererProps) {
  const visibleFields = subsection.fields.filter(
    (f) =>
      f.applicability.visible &&
      fieldVisibleInViewMode(f, materialityByFieldId, values, viewMode)
  );

  if (visibleFields.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-500 italic">
        No fields in this subsection for the current view.
      </p>
    );
  }

  return (
    <div className="grid gap-3 pt-2">
      {visibleFields.map((field) => {
        const stored = values[field.fieldId];
        const materialityState = getFieldMaterialityState(
          field.fieldId,
          materialityByFieldId
        );
        const undecidedBlocking =
          materialityState === "UNDECIDED" &&
          field.applicability.moduleInReportingScope;
        return (
          <FieldRenderer
            key={field.fieldId}
            field={field}
            value={stored?.value ?? (field.type === "boolean" ? "false" : "")}
            unit={stored?.unit ?? field.unit ?? null}
            dbMaterialityByFieldId={materialityByFieldId}
            onMaterialityChange={onMaterialityChange}
            materialitySaving={materialitySavingFieldId === field.fieldId}
            onChange={onChange}
            onSave={onSave}
            saveState={saveStateByFieldId[field.fieldId] ?? "idle"}
            onRetrySave={() => onRetrySave(field.fieldId)}
            isExportBlocking={
              showExportBlockingHints &&
              exportBlockingIds.has(field.fieldId)
            }
            isMaterialityUndecidedBlocking={
              showExportBlockingHints && undecidedBlocking
            }
            valueInputsDisabled={valueInputsDisabled}
            materialityDisabled={materialityDisabled}
          />
        );
      })}
    </div>
  );
}
