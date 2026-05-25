"use client";

import { useMemo, useState } from "react";
import type { ExportAuditResult, ExportBlockingField } from "@/lib/vsme/export/exportAudit";

export const VSME_FOCUS_FIELD_STORAGE_KEY = "librevs:vsme:focusField";

type ExportAuditPanelProps = {
  audit: ExportAuditResult | null;
  isLoading?: boolean;
  error?: string | null;
  developerMode?: boolean;
  onNavigateToField?: (fieldId: string) => void;
  /** When set, stores field id and navigates away (e.g. export-review → /vsme). */
  onNavigateAwayToField?: (fieldId: string) => void;
};

function groupBySection(
  fields: ExportBlockingField[]
): Map<string, ExportBlockingField[]> {
  const map = new Map<string, ExportBlockingField[]>();
  for (const field of fields) {
    const list = map.get(field.section) ?? [];
    list.push(field);
    map.set(field.section, list);
  }
  return map;
}

function nextRequiredField(
  audit: ExportAuditResult | null
): ExportBlockingField | null {
  if (!audit || audit.blockingFields.length === 0) {
    return null;
  }
  const sorted = [...audit.blockingFields].sort((a, b) => {
    const sectionCmp = a.section.localeCompare(b.section);
    if (sectionCmp !== 0) {
      return sectionCmp;
    }
    return a.label.localeCompare(b.label);
  });
  return sorted[0] ?? null;
}

function BlockingFieldRow({
  field,
  onNavigate,
  developerMode = false,
}: {
  field: ExportBlockingField;
  onNavigate?: (fieldId: string) => void;
  developerMode?: boolean;
}) {
  return (
    <li className="rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button
          type="button"
          className="text-left font-medium text-slate-900 hover:text-blue-800 hover:underline disabled:cursor-default disabled:no-underline"
          onClick={() => onNavigate?.(field.fieldId)}
          disabled={!onNavigate}
        >
          {field.label}
        </button>
        {developerMode ? (
          <span className="font-mono text-[10px] text-slate-400">{field.fieldId}</span>
        ) : null}
      </div>
      {field.subsection ? (
        <p className="mt-0.5 text-xs text-slate-500">{field.subsection}</p>
      ) : null}
      <dl className="mt-2 space-y-1 text-xs text-slate-600">
        <div>
          <dt className="inline font-medium text-slate-700">Why: </dt>
          <dd className="inline">{field.requiredReasonLabel}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-700">Action: </dt>
          <dd className="inline">{field.resolutionAction}</dd>
        </div>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700">
            Module {field.module}
          </span>
          <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            {field.materiality === "material" ? "Material field" : "Excluded from reporting"}
          </span>
          {field.efragReference ? (
            <a
              href={field.efragReference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-blue-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              EFRAG §{field.efragReference.paragraph}
            </a>
          ) : null}
        </div>
      </dl>
    </li>
  );
}

export function ExportAuditPanel({
  audit,
  isLoading = false,
  error = null,
  developerMode = false,
  onNavigateToField,
  onNavigateAwayToField,
}: ExportAuditPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const grouped = useMemo(
    () => (audit ? groupBySection(audit.blockingFields) : new Map()),
    [audit]
  );

  const nextField = useMemo(() => nextRequiredField(audit), [audit]);

  if (audit?.exportReady) {
    return null;
  }

  const handleNavigate = (fieldId: string) => {
    if (onNavigateToField) {
      onNavigateToField(fieldId);
      return;
    }
    if (onNavigateAwayToField) {
      onNavigateAwayToField(fieldId);
      return;
    }
    try {
      sessionStorage.setItem(VSME_FOCUS_FIELD_STORAGE_KEY, fieldId);
    } catch {
      /* ignore */
    }
    window.location.href = "/vsme";
  };

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40 text-slate-900">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-medium text-amber-950">
            Why is export blocked?
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">
            {isLoading
              ? "Loading export audit…"
              : audit
                ? `${audit.totalBlockingFields} missing required field${
                    audit.totalBlockingFields === 1 ? "" : "s"
                  } · ${audit.summary.completedRequiredFields}/${audit.summary.totalRequiredFields} required complete`
                : "No audit data"}
          </p>
        </div>
        <span className="text-xs text-amber-800">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded ? (
        <div className="border-t border-amber-200/80 px-4 pb-4">
          {error ? (
            <p className="mt-3 text-sm text-red-800">{error}</p>
          ) : null}

          {nextField ? (
            <div className="mt-3 rounded-md border border-amber-300/80 bg-white/70 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Next required disclosure
              </p>
              <p className="mt-1 text-sm text-slate-800">{nextField.label}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                Section {nextField.section}
                {nextField.subsection ? ` · ${nextField.subsection}` : ""}
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-blue-800 hover:underline"
                onClick={() => handleNavigate(nextField.fieldId)}
              >
                Go to field →
              </button>
            </div>
          ) : null}

          {audit && audit.missingSections.length > 0 ? (
            <p className="mt-3 text-xs text-amber-900">
              <span className="font-medium">Incomplete sections: </span>
              {audit.missingSections.join(", ")}
            </p>
          ) : null}

          {audit && audit.sectionSummaries.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                Section export readiness
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {audit.sectionSummaries.map((s) => (
                  <li
                    key={s.section}
                    className="rounded-md border border-amber-200/60 bg-white/60 px-2 py-1 text-[10px] text-amber-950"
                  >
                    <span className="font-semibold">{s.section}</span>
                    <span className="text-amber-800">
                      {" "}
                      · {s.missingRequiredFields} missing
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {audit && audit.blockingFields.length > 0 ? (
            <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
              {[...grouped.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([section, fields]) => (
                  <div key={section}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Section {section}
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {fields.map((field: ExportBlockingField) => (
                        <BlockingFieldRow
                          key={field.fieldId}
                          field={field}
                          onNavigate={handleNavigate}
                          developerMode={developerMode}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ) : audit && !isLoading ? (
            <p className="mt-3 text-sm text-slate-600">
              Export is blocked but no missing required fields were returned from
              validation. Review export validation for structural issues.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
