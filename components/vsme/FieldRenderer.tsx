"use client";

import type { VsmeMateriality, VsmeUiField } from "./types";
import type { FieldMaterialityState } from "./fieldMaterialityState";
import {
  getFieldMaterialityState,
  isFieldRequiredToFill,
} from "./fieldMaterialityState";
import { FieldSaveIndicator } from "./FieldSaveIndicator";
import type { FieldSaveState } from "./fieldSaveState";
import { workflowLabelText } from "./fieldUtils";

type FieldRendererProps = {
  field: VsmeUiField;
  value: string;
  unit: string | null;
  dbMaterialityByFieldId: Record<string, VsmeMateriality>;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  materialitySaving: boolean;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
  saveState?: FieldSaveState;
  onRetrySave?: () => void;
  isExportBlocking: boolean;
  isMaterialityUndecidedBlocking?: boolean;
  valueInputsDisabled?: boolean;
  materialityDisabled?: boolean;
};

function cardShellClass(state: FieldMaterialityState, exportBlocking: boolean) {
  if (state === "UNDECIDED") {
    return "border-amber-400 bg-amber-50/40 ring-1 ring-amber-200";
  }
  if (state === "NON_MATERIAL") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  if (exportBlocking) {
    return "border-amber-400 bg-white ring-1 ring-amber-200";
  }
  return "border-emerald-300 bg-white ring-1 ring-emerald-100";
}

export function FieldRenderer({
  field,
  value,
  unit,
  dbMaterialityByFieldId,
  onMaterialityChange,
  materialitySaving,
  onChange,
  onSave,
  saveState = "idle",
  onRetrySave,
  isExportBlocking,
  isMaterialityUndecidedBlocking = false,
  valueInputsDisabled = false,
  materialityDisabled = false,
}: FieldRendererProps) {
  if (!field.applicability.visible) {
    return null;
  }

  const materialityState = getFieldMaterialityState(
    field.fieldId,
    dbMaterialityByFieldId
  );
  const requiredToFill = isFieldRequiredToFill(field, materialityState);
  const displayUnit = unit ?? field.unit ?? "";
  const inputId = `vsme-field-${field.fieldId}`;
  const inScope = field.applicability.moduleInReportingScope;
  const moduleCode = field.applicability.module;

  const canEnterData =
    materialityState === "MATERIAL" && !valueInputsDisabled;

  const handleBlur = () => {
    if (canEnterData && value.trim().length > 0) {
      onSave(field.fieldId, value, displayUnit || null);
    }
  };

  const materialityLocked = materialityDisabled || materialitySaving;
  const borderClass = cardShellClass(
    materialityState,
    isExportBlocking && materialityState === "MATERIAL"
  );

  return (
    <div
      className={`rounded-md border p-4 transition-colors ${borderClass}`}
      data-field-id={field.fieldId}
      data-materiality-state={materialityState}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{field.label}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            {field.fieldId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
              moduleCode === "C"
                ? "bg-violet-100 text-violet-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            Module {moduleCode}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              inScope
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {inScope ? "In scope" : "Out of scope"}
          </span>
          {requiredToFill ? (
            <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              Required
            </span>
          ) : null}
        </div>
      </header>

      <fieldset
        className="mb-3 rounded-md border border-slate-200 bg-white/80 p-3"
        disabled={materialityLocked}
      >
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Reporting decision
        </legend>
        <p className="mb-2 text-xs text-slate-500">
          Declare whether this datapoint is part of your report before entering
          data.
        </p>
        <div className="space-y-2">
          <label className="flex cursor-pointer gap-2 rounded-md border border-transparent px-2 py-2 hover:bg-slate-50 has-[:checked]:border-emerald-200 has-[:checked]:bg-emerald-50/50">
            <input
              type="radio"
              name={`materiality-${field.fieldId}`}
              checked={materialityState === "MATERIAL"}
              disabled={materialityLocked}
              onChange={() =>
                onMaterialityChange(field.fieldId, "material")
              }
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-900">Material</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                This data will be reported and is required if in scope
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-2 rounded-md border border-transparent px-2 py-2 hover:bg-slate-50 has-[:checked]:border-slate-300 has-[:checked]:bg-slate-100">
            <input
              type="radio"
              name={`materiality-${field.fieldId}`}
              checked={materialityState === "NON_MATERIAL"}
              disabled={materialityLocked}
              onChange={() =>
                onMaterialityChange(field.fieldId, "non_material")
              }
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-900">Non-material</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                This data will be explicitly excluded from reporting
              </span>
            </span>
          </label>
        </div>
        {materialitySaving ? (
          <p className="mt-2 text-xs text-slate-500">Saving decision…</p>
        ) : null}
      </fieldset>

      {materialityState === "UNDECIDED" ? (
        <div
          className="mb-2 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          <span className="font-semibold" aria-hidden>
            !
          </span>
          <p>
            Select reporting decision to continue. Data entry is blocked until
            you choose Material or Non-material.
          </p>
        </div>
      ) : null}

      {materialityState === "NON_MATERIAL" ? (
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Excluded from reporting
        </p>
      ) : null}

      {field.description && materialityState === "MATERIAL" ? (
        <p className="mb-2 text-xs text-slate-600">{field.description}</p>
      ) : null}

      {materialityState === "MATERIAL" ? (
        <>
          {field.type === "boolean" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                id={inputId}
                type="checkbox"
                checked={value === "true"}
                disabled={!canEnterData}
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
                disabled={!canEnterData}
                onChange={(e) =>
                  onChange(
                    field.fieldId,
                    e.target.value,
                    displayUnit || null
                  )
                }
                onBlur={handleBlur}
                className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
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
              disabled={!canEnterData}
              onChange={(e) =>
                onChange(field.fieldId, e.target.value, displayUnit || null)
              }
              onBlur={handleBlur}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
          )}
          <FieldSaveIndicator
            state={saveState}
            onRetry={saveState === "error" ? onRetrySave : undefined}
          />
          {isExportBlocking && !valueInputsDisabled ? (
            <p className="mt-1 text-xs text-amber-700">
              Required field missing — blocks export
            </p>
          ) : null}
        </>
      ) : null}

      <p className="mt-2 text-[10px] text-slate-400">
        {workflowLabelText(field.applicability.workflowLabel)}
      </p>

      {isMaterialityUndecidedBlocking ? (
        <p className="mt-1 text-xs text-amber-800">
          Reporting decision required — blocks export readiness
        </p>
      ) : null}
    </div>
  );
}
