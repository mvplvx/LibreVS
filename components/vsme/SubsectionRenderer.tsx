"use client";

import type { VsmeFieldValue, VsmeMateriality, VsmeUiSubsection } from "./types";
import { FieldRenderer } from "./FieldRenderer";

type SubsectionRendererProps = {
  subsection: VsmeUiSubsection;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  exportBlockingIds: Set<string>;
  savingFieldId: string | null;
  materialitySavingFieldId: string | null;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
};

export function SubsectionRenderer({
  subsection,
  values,
  materialityByFieldId,
  exportBlockingIds,
  savingFieldId,
  materialitySavingFieldId,
  onMaterialityChange,
  onChange,
  onSave,
}: SubsectionRendererProps) {
  const visibleFields = subsection.fields.filter((f) => f.applicability.visible);
  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-700">{subsection.title}</h4>
      <div className="grid gap-3">
        {visibleFields.map((field) => {
          const stored = values[field.fieldId];
          const materiality =
            materialityByFieldId[field.fieldId] ??
            field.applicability.materiality;
          return (
            <FieldRenderer
              key={field.fieldId}
              field={field}
              value={stored?.value ?? (field.type === "boolean" ? "false" : "")}
              unit={stored?.unit ?? field.unit ?? null}
              materiality={materiality}
              onMaterialityChange={onMaterialityChange}
              materialitySaving={materialitySavingFieldId === field.fieldId}
              onChange={onChange}
              onSave={onSave}
              saving={savingFieldId === field.fieldId}
              isExportBlocking={exportBlockingIds.has(field.fieldId)}
            />
          );
        })}
      </div>
    </div>
  );
}
