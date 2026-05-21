"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FieldSaveState } from "./fieldSaveState";
import type { VsmeFieldValue, VsmeMateriality, VsmeUiSection } from "./types";
import { SectionSummaryHeader } from "./SectionSummaryHeader";
import { SubsectionRenderer } from "./SubsectionRenderer";
import { workflowLabelText } from "./fieldUtils";
import type { ReportingViewMode } from "./vsmeReportingViewMode";
import { fieldVisibleInViewMode } from "./vsmeReportingViewMode";
import { computeSectionSummary } from "./vsmeWorkspaceMetrics";

type SectionRendererProps = {
  section: VsmeUiSection;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  exportBlockingIds: Set<string>;
  materialitySavingFieldId: string | null;
  saveStateByFieldId: Record<string, FieldSaveState>;
  bySection?: Record<string, { reported: number; total: number }>;
  expanded: boolean;
  viewMode: ReportingViewMode;
  onToggle: () => void;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
  onChange: (fieldId: string, value: string, unit: string | null) => void;
  onSave: (fieldId: string, value: string, unit: string | null) => void;
  onRetrySave: (fieldId: string) => void;
  valueInputsDisabled?: boolean;
  materialityDisabled?: boolean;
  showExportBlockingHints?: boolean;
};

export function SectionRenderer({
  section,
  values,
  materialityByFieldId,
  exportBlockingIds,
  materialitySavingFieldId,
  saveStateByFieldId,
  expanded,
  viewMode,
  onToggle,
  onMaterialityChange,
  onChange,
  onSave,
  onRetrySave,
  valueInputsDisabled = false,
  materialityDisabled = false,
  showExportBlockingHints = true,
}: SectionRendererProps) {
  if (!section.applicability.visible) {
    return null;
  }

  const summary = useMemo(
    () => computeSectionSummary(section, materialityByFieldId, values),
    [section, materialityByFieldId, values]
  );

  const inScope = section.applicability.moduleInReportingScope;

  const subsectionsWithVisibleFields = useMemo(() => {
    return section.subsections
      .map((sub) => ({
        subsection: sub,
        hasVisible: sub.fields.some((f) =>
          fieldVisibleInViewMode(f, materialityByFieldId, values, viewMode)
        ),
      }))
      .filter((x) => x.subsection.fields.some((f) => f.applicability.visible));
  }, [section.subsections, materialityByFieldId, values, viewMode]);

  const firstSubsectionId = subsectionsWithVisibleFields[0]?.subsection.id ?? null;

  const [mountedSubsectionIds, setMountedSubsectionIds] = useState<Set<string>>(
    () => (firstSubsectionId ? new Set([firstSubsectionId]) : new Set())
  );

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const first =
      subsectionsWithVisibleFields.find((x) => x.hasVisible)?.subsection.id ??
      subsectionsWithVisibleFields[0]?.subsection.id;
    if (first) {
      setMountedSubsectionIds((prev) => (prev.has(first) ? prev : new Set([first])));
    }
  }, [expanded, section.id, viewMode, subsectionsWithVisibleFields]);

  const mountSubsection = useCallback((id: string) => {
    setMountedSubsectionIds((prev) => {
      if (prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  return (
    <section
      id={`section-${section.code}`}
      className="scroll-mt-32 rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <SectionSummaryHeader
        section={section}
        summary={summary}
        inScope={inScope}
      />

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
      >
        <span>
          {workflowLabelText(section.applicability.workflowLabel)} ·{" "}
          {expanded ? "Collapse section" : "Expand section"}
        </span>
        <span className="font-medium text-slate-600">
          {summary.requiredMissing > 0
            ? `${summary.requiredMissing} required missing`
            : "Section loaded"}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-4 px-4 py-4">
          {subsectionsWithVisibleFields.length === 0 ? (
            <p className="text-sm text-slate-500">
              No fields match the current reporting view. Switch to All Fields or
              Excluded to review other decisions.
            </p>
          ) : (
            subsectionsWithVisibleFields.map(({ subsection, hasVisible }) => {
              const isSubMounted = mountedSubsectionIds.has(subsection.id);
              return (
                <div
                  key={subsection.id}
                  className="rounded-md border border-slate-100"
                >
                  <button
                    type="button"
                    onClick={() => mountSubsection(subsection.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    aria-expanded={isSubMounted}
                  >
                    <span>{subsection.title}</span>
                    <span className="text-xs font-normal text-slate-500">
                      {isSubMounted ? "Hide" : "Show"} fields
                      {!hasVisible && viewMode !== "all" ? " (empty in view)" : ""}
                    </span>
                  </button>
                  {isSubMounted ? (
                    <div className="border-t border-slate-50 px-3 pb-3">
                      <SubsectionRenderer
                        subsection={subsection}
                        values={values}
                        materialityByFieldId={materialityByFieldId}
                        exportBlockingIds={exportBlockingIds}
                        materialitySavingFieldId={materialitySavingFieldId}
                        saveStateByFieldId={saveStateByFieldId}
                        viewMode={viewMode}
                        onMaterialityChange={onMaterialityChange}
                        onChange={onChange}
                        onSave={onSave}
                        onRetrySave={onRetrySave}
                        valueInputsDisabled={valueInputsDisabled}
                        materialityDisabled={materialityDisabled}
                        showExportBlockingHints={showExportBlockingHints}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
