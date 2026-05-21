"use client";

import type { VsmeFieldValue, VsmeMateriality, VsmeUiSection } from "./types";
import { sectionProgressFromValues, workflowLabelText } from "./fieldUtils";
import { SubsectionRenderer } from "./SubsectionRenderer";

type SectionRendererProps = {
  section: VsmeUiSection;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  exportBlockingIds: Set<string>;
  savingFieldId: string | null;
  materialitySavingFieldId: string | null;
  bySection?: Record<string, { reported: number; total: number }>;
  expanded: boolean;
  onToggle: () => void;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
};

export function SectionRenderer({
  section,
  values,
  materialityByFieldId,
  exportBlockingIds,
  savingFieldId,
  materialitySavingFieldId,
  bySection,
  expanded,
  onToggle,
  onMaterialityChange,
  onChange,
  onSave,
}: SectionRendererProps) {
  if (!section.applicability.visible) {
    return null;
  }

  const { reported, total } = sectionProgressFromValues(
    section,
    values,
    bySection
  );
  const pct = total === 0 ? 0 : Math.round((reported / total) * 100);
  const inScope = section.applicability.moduleInReportingScope;

  return (
    <section
      id={`section-${section.code}`}
      className="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div>
          <p className="font-medium text-slate-900">
            {section.code} — {section.title}
            {inScope ? (
              <span className="ml-2 text-xs font-normal text-slate-600">
                In reporting scope
              </span>
            ) : (
              <span className="ml-2 text-xs font-normal text-slate-500">
                Optional scope (C module)
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {workflowLabelText(section.applicability.workflowLabel)} · Module{" "}
            {section.applicability.module}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-slate-700">
            {reported} / {total}
          </p>
          <p className="text-xs text-slate-500">{pct}% required-to-fill</p>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-6 border-t border-slate-100 px-4 py-4">
          {section.subsections.map((subsection) => (
            <SubsectionRenderer
              key={subsection.id}
              subsection={subsection}
              values={values}
              materialityByFieldId={materialityByFieldId}
              exportBlockingIds={exportBlockingIds}
              savingFieldId={savingFieldId}
              materialitySavingFieldId={materialitySavingFieldId}
              onMaterialityChange={onMaterialityChange}
              onChange={onChange}
              onSave={onSave}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
