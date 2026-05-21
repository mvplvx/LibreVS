"use client";

import type { VsmeMateriality, VsmeUiField } from "./types";
import { isFieldRequiredToFill, workflowLabelText } from "./fieldUtils";

type FieldRendererProps = {
  field: VsmeUiField;
  value: string;
  unit: string | null;
  materiality: VsmeMateriality;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  materialitySaving: boolean;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
  saving: boolean;
  isExportBlocking: boolean;
};

export function FieldRenderer({
  field,
  value,
  unit,
  materiality,
  onMaterialityChange,
  materialitySaving,
  onChange,
  onSave,
  saving,
  isExportBlocking,
}: FieldRendererProps) {
  if (!field.applicability.visible) {
    return null;
  }

  const requiredToFill = isFieldRequiredToFill(field, materiality);
  const displayUnit = unit ?? field.unit ?? "";
  const inputId = `vsme-field-${field.fieldId}`;
  const isNonMaterial = materiality === "non_material";

  const handleBlur = () => {
    if (!isNonMaterial && value.trim().length > 0) {
      onSave(field.fieldId, value, displayUnit || null);
    }
  };

  const borderClass = isExportBlocking
    ? "border-amber-400 ring-1 ring-amber-200"
    : isNonMaterial
      ? "border-slate-200 bg-slate-50 opacity-90"
      : "border-slate-200";

  return (
    <div
      className={`rounded-md border bg-white p-4 ${borderClass}`}
      data-field-id={field.fieldId}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-900">
          {field.label}
          {requiredToFill ? (
            <span className="ml-1 text-red-600" title="Required to fill">
              *
            </span>
          ) : (
            <span className="ml-2 text-xs font-normal text-slate-400">
              (not required to fill)
            </span>
          )}
        </label>
        <span className="text-xs text-slate-500">
          {workflowLabelText(field.applicability.workflowLabel)} · Module{" "}
          {field.applicability.module}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-600">Materiality:</span>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name={`materiality-${field.fieldId}`}
            checked={materiality === "material"}
            disabled={materialitySaving}
            onChange={() => onMaterialityChange(field.fieldId, "material")}
          />
          Material
        </label>
        <label className="inline-flex items-center gap-1">
          <input
            type="radio"
            name={`materiality-${field.fieldId}`}
            checked={materiality === "non_material"}
            disabled={materialitySaving}
            onChange={() => onMaterialityChange(field.fieldId, "non_material")}
          />
          Non-material
        </label>
        {materialitySaving ? (
          <span className="text-slate-400">Updating…</span>
        ) : null}
      </div>

      {field.description ? (
        <p className="mb-2 text-xs text-slate-600">{field.description}</p>
      ) : null}

      {isNonMaterial ? (
        <p className="text-xs text-slate-500 italic">
          Excluded from mandatory completion and export. Value optional.
        </p>
      ) : null}

      {field.type === "boolean" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={inputId}
            type="checkbox"
            checked={value === "true"}
            disabled={saving || isNonMaterial}
            onChange={(e) => {
              const next = e.target.checked ? "true" : "false";
              onChange(field.fieldId, next, null);
            }}
            onBlur={handleBlur}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span>Yes</span>
        </label>
      ) : field.type === "number" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            value={value}
            disabled={saving || isNonMaterial}
            onChange={(e) =>
              onChange(field.fieldId, e.target.value, displayUnit || null)
            }
            onBlur={handleBlur}
            className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          {displayUnit ? (
            <span className="text-xs text-slate-500">{displayUnit}</span>
          ) : null}
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={saving || isNonMaterial}
          onChange={(e) =>
            onChange(field.fieldId, e.target.value, displayUnit || null)
          }
          onBlur={handleBlur}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      )}

      <p className="mt-2 font-mono text-[10px] text-slate-400">{field.fieldId}</p>
      {saving ? <p className="mt-1 text-xs text-slate-500">Saving…</p> : null}
      {isExportBlocking ? (
        <p className="mt-1 text-xs text-amber-700">
          Required field missing — blocks export
        </p>
      ) : null}
    </div>
  );
}
