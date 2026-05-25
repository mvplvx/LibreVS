"use client";

import { useMemo, useState } from "react";
import type { FieldSaveState } from "./fieldSaveState";
import type { VsmeFieldValue, VsmeMateriality, VsmeUiSubsection } from "./types";
import { getFieldMaterialityState } from "./fieldMaterialityState";
import { FieldRenderer } from "./FieldRenderer";
import {
  fieldVisibleInViewMode,
  type ReportingViewMode,
} from "./vsmeReportingViewMode";
import {
  buildFieldLayoutItems,
  disclosureGroupHeading,
} from "@/lib/vsme/ui/fieldLayout";
import {
  c7GateDefaultOpen,
  findC6GateFieldId,
  isC7IncidentTreeField,
  isFieldVisibleInDisclosureTree,
} from "@/lib/vsme/ui/disclosureConditionals";
import type { EuReportingCurrency } from "@/lib/vsme/currency";

type SubsectionRendererProps = {
  subsection: VsmeUiSubsection;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  exportBlockingIds: Set<string>;
  materialitySavingFieldId: string | null;
  saveStateByFieldId: Record<string, FieldSaveState>;
  viewMode: ReportingViewMode;
  reportingCurrency: EuReportingCurrency;
  developerMode: boolean;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
  onRetrySave: (fieldId: string) => void;
  valueInputsDisabled?: boolean;
  materialityDisabled?: boolean;
  showExportBlockingHints?: boolean;
};

function C7IncidentsGate({
  open,
  onChange,
}: {
  open: boolean;
  onChange: (open: boolean) => void;
}) {
  return (
    <div className="mb-3 rounded-md border border-violet-200 bg-violet-50/60 p-3">
      <p className="text-sm font-medium text-slate-900">
        Does the undertaking have confirmed severe human rights incidents in its
        own workforce? (paragraph 62)
      </p>
      <div className="mt-2 flex gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="c7-incidents-gate"
            checked={open}
            onChange={() => onChange(true)}
          />
          Yes
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="c7-incidents-gate"
            checked={!open}
            onChange={() => onChange(false)}
          />
          No
        </label>
      </div>
    </div>
  );
}

export function SubsectionRenderer({
  subsection,
  values,
  materialityByFieldId,
  exportBlockingIds,
  materialitySavingFieldId,
  saveStateByFieldId,
  viewMode,
  reportingCurrency,
  developerMode,
  onMaterialityChange,
  onChange,
  onSave,
  onRetrySave,
  valueInputsDisabled = false,
  materialityDisabled = false,
  showExportBlockingHints = true,
}: SubsectionRendererProps) {
  const allFieldIds = useMemo(
    () => subsection.fields.map((f) => f.fieldId),
    [subsection.fields]
  );

  const c6GateFieldId = useMemo(
    () => findC6GateFieldId(allFieldIds),
    [allFieldIds]
  );

  const showC7Gate = subsection.id === "incidents_own_workforce";
  const [c7GateOpen, setC7GateOpen] = useState(() =>
    c7GateDefaultOpen(values, allFieldIds)
  );

  const visibleFields = useMemo(() => {
    return subsection.fields.filter((f) => {
      if (!f.applicability.visible) {
        return false;
      }
      if (
        !fieldVisibleInViewMode(f, materialityByFieldId, values, viewMode)
      ) {
        return false;
      }
      return isFieldVisibleInDisclosureTree(f.fieldId, values, {
        gateFieldId: c6GateFieldId,
        c7GateOpen: showC7Gate ? c7GateOpen : true,
        allFieldIds,
      });
    });
  }, [
    subsection.fields,
    materialityByFieldId,
    values,
    viewMode,
    c6GateFieldId,
    c7GateOpen,
    showC7Gate,
    allFieldIds,
  ]);

  const layoutItems = useMemo(
    () => buildFieldLayoutItems(visibleFields),
    [visibleFields]
  );

  const renderField = (field: (typeof visibleFields)[0]) => {
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
          showExportBlockingHints && exportBlockingIds.has(field.fieldId)
        }
        isMaterialityUndecidedBlocking={
          showExportBlockingHints && undecidedBlocking
        }
        valueInputsDisabled={valueInputsDisabled}
        materialityDisabled={materialityDisabled}
        reportingCurrency={reportingCurrency}
        developerMode={developerMode}
      />
    );
  };

  if (visibleFields.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-500 italic">
        No fields in this subsection for the current view.
      </p>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {showC7Gate ? (
        <C7IncidentsGate open={c7GateOpen} onChange={setC7GateOpen} />
      ) : null}

      {layoutItems.map((item, index) => {
        if (item.type === "disclosure") {
          const ref = item.fields[0]?.efragReference;
          return (
            <section
              key={`disclosure-${item.paragraph}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
            >
              <header className="mb-3 border-b border-slate-200/80 pb-2">
                <h4 className="text-sm font-semibold text-slate-800">
                  {disclosureGroupHeading(item.paragraph)}
                </h4>
                {ref ? (
                  <p className="mt-0.5 text-xs text-slate-500">{ref.section}</p>
                ) : null}
              </header>
              <div className="grid gap-3">{item.fields.map(renderField)}</div>
            </section>
          );
        }

        if (item.type === "entity") {
          return (
            <section
              key={item.slot.key}
              className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm"
            >
              <h4 className="mb-3 text-sm font-semibold text-slate-800">
                {item.slot.title}
              </h4>
              <div className="grid gap-3">{item.fields.map(renderField)}</div>
            </section>
          );
        }

        return renderField(item.field);
      })}
    </div>
  );
}
