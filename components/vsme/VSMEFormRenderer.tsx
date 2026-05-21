"use client";

/** Presentational only — parents use React Query hooks; no apiGet/apiPost here. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  VsmeCoverageMetrics,
  VsmeFieldValue,
  VsmeMateriality,
  VsmeUiSchema,
} from "./types";
import { SectionRenderer } from "./SectionRenderer";
import { VsmeProgressHeader } from "./VsmeProgressHeader";

type VSMEFormRendererProps = {
  schema: VsmeUiSchema;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  coverage: VsmeCoverageMetrics | null;
  fieldCount: number;
  savingFieldId: string | null;
  materialitySavingFieldId: string | null;
  saveError: string | null;
  onFieldChange: (fieldId: string, value: string, unit: string | null) => void;
  onFieldSave: (fieldId: string, value: string, unit: string | null) => void;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
};

export function VSMEFormRenderer({
  schema,
  values,
  materialityByFieldId,
  coverage,
  fieldCount,
  savingFieldId,
  materialitySavingFieldId,
  saveError,
  onFieldChange,
  onFieldSave,
  onMaterialityChange,
}: VSMEFormRendererProps) {
  const sections = useMemo(
    () => schema.sections.filter((s) => s.applicability.visible),
    [schema.sections]
  );

  const visibleSectionCodes = useMemo(
    () => sections.map((s) => s.code),
    [sections]
  );

  const defaultActiveCode = visibleSectionCodes[0] ?? null;

  /**
   * Lazy mount: only section codes in this set get a SectionRenderer (full field tree).
   * Default active section is the first visible one; others mount on nav expand or header toggle.
   */
  const [mountedCodes, setMountedCodes] = useState<Set<string>>(() =>
    defaultActiveCode ? new Set([defaultActiveCode]) : new Set()
  );

  useEffect(() => {
    setMountedCodes((prev) => {
      const pruned = [...prev].filter((code) => visibleSectionCodes.includes(code));
      if (pruned.length > 0) {
        const next = new Set(pruned);
        return next.size === prev.size && [...next].every((c) => prev.has(c))
          ? prev
          : next;
      }
      return defaultActiveCode ? new Set([defaultActiveCode]) : new Set();
    });
  }, [visibleSectionCodes, defaultActiveCode]);

  const mountedSections = useMemo(
    () => sections.filter((s) => mountedCodes.has(s.code)),
    [sections, mountedCodes]
  );

  const exportBlockingIds = useMemo(
    () => new Set(coverage?.completeness.exportBlockingFields ?? []),
    [coverage?.completeness.exportBlockingFields]
  );

  const mountSection = useCallback((code: string) => {
    setMountedCodes((prev) => {
      if (prev.has(code)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  }, []);

  const unmountSection = useCallback((code: string) => {
    setMountedCodes((prev) => {
      if (!prev.has(code)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }, []);

  const scrollToSection = useCallback(
    (code: string) => {
      mountSection(code);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document
            .getElementById(`section-${code}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [mountSection]
  );

  return (
    <div className="space-y-6">
      <VsmeProgressHeader
        schema={schema}
        coverage={coverage}
        fieldCount={fieldCount}
      />

      {saveError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {saveError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <nav className="lg:col-span-3">
          <div className="sticky top-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Sections
            </p>
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto text-sm">
              {sections.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-slate-500">
                  No sections in scope for this period
                </li>
              ) : (
                sections.map((section) => {
                  const counts = coverage?.bySection?.[section.code];
                  const isMounted = mountedCodes.has(section.code);
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(section.code)}
                        className={`w-full rounded px-2 py-1.5 text-left hover:bg-slate-50 ${
                          isMounted ? "bg-slate-50" : ""
                        }`}
                        aria-expanded={isMounted}
                        aria-current={isMounted ? "true" : undefined}
                      >
                        <span className="font-medium">{section.code}</span>
                        {counts ? (
                          <span className="ml-1 text-xs text-slate-500">
                            {counts.reported}/{counts.total}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </nav>

        <div className="space-y-4 lg:col-span-9">
          {mountedSections.length === 0 ? (
            <p className="text-sm text-slate-500">
              Select a section from the list to load fields.
            </p>
          ) : (
            mountedSections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                values={values}
                materialityByFieldId={materialityByFieldId}
                exportBlockingIds={exportBlockingIds}
                savingFieldId={savingFieldId}
                materialitySavingFieldId={materialitySavingFieldId}
                bySection={coverage?.bySection}
                expanded
                onToggle={() => unmountSection(section.code)}
                onMaterialityChange={onMaterialityChange}
                onChange={onFieldChange}
                onSave={onFieldSave}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
