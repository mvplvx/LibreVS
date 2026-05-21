"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ExportIntegrityIndicator } from "@/components/vsme/ExportIntegrityIndicator";
import { REPORTING_STATE_LABELS } from "@/components/vsme/reportingStateUi";
import { VsmeWorkspaceSelectors } from "@/components/vsme/VsmeWorkspaceSelectors";
import {
  useExportSnapshots,
  useFinalizeExportSnapshot,
} from "@/hooks/useExportSnapshots";
import { useExportValidation } from "@/hooks/useExportValidation";
import { useVsmeWorkspace } from "@/components/vsme/queries";

export default function ExportReviewPage() {
  const workspace = useVsmeWorkspace();
  const {
    companies,
    company,
    employeeCount,
    periods,
    periodId,
    setCompanyId,
    setPeriodId,
    isLoading: workspaceLoading,
    error: workspaceError,
  } = workspace;

  const exportQuery = useExportValidation(periodId);
  const snapshotsQuery = useExportSnapshots(periodId);
  const finalizeMutation = useFinalizeExportSnapshot(periodId);
  const validation = exportQuery.validation;
  const preview = exportQuery.preview;

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const loading = workspaceLoading || exportQuery.isLoading;
  const error =
    workspaceError ?? exportQuery.error?.message ?? null;

  const handleGenerateExport = () => {
    if (!periodId || !validation?.isValid || snapshotsQuery.locked) {
      return;
    }
    window.open(`/api/reporting-period/${periodId}/export`, "_blank");
    window.setTimeout(() => {
      void snapshotsQuery.refetch();
    }, 1200);
  };

  const handleFinalize = async (snapshotId: string) => {
    if (!periodId) {
      return;
    }
    try {
      await finalizeMutation.mutateAsync(snapshotId);
      await snapshotsQuery.refetch();
      await exportQuery.refetch();
    } catch {
      /* surfaced via mutation error */
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Export Review</h1>
            <p className="mt-1 text-sm text-slate-600">
              EFRAG VSME export integrity checkpoint — review before generating
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link href="/vsme" className="text-slate-600 hover:text-slate-900">
              VSME entry
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <VsmeWorkspaceSelectors
            companies={companies}
            company={company}
            employeeCount={employeeCount}
            periods={periods}
            periodId={periodId}
            onCompanyChange={setCompanyId}
            onPeriodChange={setPeriodId}
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading export validation…</p>
        ) : !periodId ? (
          <p className="text-sm text-slate-500">
            Select a reporting period to review export readiness.
          </p>
        ) : validation && preview ? (
          <div className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Reporting phase
                  </p>
                  {exportQuery.reportingState ? (
                    <p className="mt-1 text-lg font-semibold">
                      {REPORTING_STATE_LABELS[exportQuery.reportingState]}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-slate-600">
                    Required field coverage:{" "}
                    <span className="font-medium">
                      {validation.exportCoverage}%
                    </span>
                    {" · "}
                    {preview.summary.includedFields} fields included in export
                    {" · "}
                    {preview.summary.missingFields} required missing
                  </p>
                </div>
                <ExportIntegrityIndicator
                  exportCoverage={validation.exportCoverage}
                  isValid={validation.isValid}
                />
              </div>

              {!validation.isValid ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Export is blocked until all validation checks pass. Review
                  missing fields and structural issues below.
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-medium">Section breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Section</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Fields</th>
                      <th className="py-2">Missing required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sections.map((section) => {
                      const breakdown =
                        validation.sectionBreakdown[section.sectionId];
                      return (
                        <tr
                          key={section.sectionId}
                          className="border-b border-slate-50"
                        >
                          <td className="py-2 pr-4 font-medium">
                            {section.sectionId} — {section.title}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={
                                section.status === "complete"
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }
                            >
                              {section.status === "complete"
                                ? "Complete"
                                : "Incomplete"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-600">
                            {breakdown?.totalFields ?? section.fields.length}
                          </td>
                          <td className="py-2 text-slate-600">
                            {breakdown?.missingRequired ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {(validation.missingFields.length > 0 ||
              validation.extraFields.length > 0 ||
              validation.structuralErrors.length > 0) && (
              <section className="rounded-lg border border-red-100 bg-red-50/50 p-4">
                <h2 className="mb-2 text-sm font-semibold text-red-900">
                  Validation issues
                </h2>
                <ul className="list-inside list-disc space-y-1 text-sm text-red-800">
                  {validation.missingFields.slice(0, 8).map((id) => (
                    <li key={`m-${id}`}>Missing required: {id}</li>
                  ))}
                  {validation.missingFields.length > 8 ? (
                    <li>
                      …and {validation.missingFields.length - 8} more missing
                    </li>
                  ) : null}
                  {validation.extraFields.map((id) => (
                    <li key={`e-${id}`}>Unknown field in data: {id}</li>
                  ))}
                  {validation.structuralErrors.slice(0, 5).map((e) => (
                    <li key={`s-${e.fieldId}`}>
                      {e.fieldId}: {e.issue}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Field-level transparency</h2>
              {preview.sections.map((section) => {
                const expanded = expandedSections.has(section.sectionId);
                const includedCount = section.fields.filter(
                  (f) => f.includedInExport
                ).length;
                return (
                  <div
                    key={section.sectionId}
                    className="rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.sectionId)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span className="font-medium">
                        {section.sectionId} — {section.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {includedCount}/{section.fields.length} included ·{" "}
                        {expanded ? "Hide" : "Show"} fields
                      </span>
                    </button>
                    {expanded ? (
                      <div className="max-h-80 overflow-y-auto border-t border-slate-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Field</th>
                              <th className="px-3 py-2">Value</th>
                              <th className="px-3 py-2">Export</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.fields.map((field) => (
                              <tr
                                key={field.fieldId}
                                className="border-t border-slate-50"
                              >
                                <td className="px-3 py-2">
                                  <p className="font-medium text-slate-800">
                                    {field.label}
                                  </p>
                                  <p className="font-mono text-[10px] text-slate-400">
                                    {field.fieldId}
                                  </p>
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {field.value || "—"}
                                  {field.unit ? ` ${field.unit}` : ""}
                                </td>
                                <td className="px-3 py-2">
                                  {field.includedInExport ? (
                                    <span className="font-medium text-emerald-700">
                                      INCLUDED
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">
                                      EXCLUDED
                                      {field.reasonIfExcluded ? (
                                        <span className="block text-[10px] text-slate-500">
                                          {field.reasonIfExcluded}
                                        </span>
                                      ) : null}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-medium">Export snapshot history</h2>
              <p className="mt-1 text-xs text-slate-500">
                Each generate creates an immutable version (state, export rows,
                validation). Finalize one snapshot to lock the period.
              </p>
              {snapshotsQuery.locked ? (
                <p className="mt-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
                  Period locked
                  {snapshotsQuery.history?.finalVersion != null
                    ? ` — final snapshot v${snapshotsQuery.history.finalVersion}`
                    : ""}
                  . No further exports allowed.
                </p>
              ) : null}
              {snapshotsQuery.isLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading history…</p>
              ) : snapshotsQuery.snapshots.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No snapshots yet. Generate an export to create v1.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {[...snapshotsQuery.snapshots].reverse().map((snap) => (
                    <li
                      key={snap.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div>
                        <span className="font-medium">v{snap.version}</span>
                        <span className="ml-2 text-slate-500">
                          {new Date(snap.createdAt).toLocaleString()}
                        </span>
                        <span className="ml-2 text-xs text-slate-500">
                          {snap.rowCount} rows · {snap.coverage.toFixed(0)}%
                          coverage
                        </span>
                        {snap.isFinal ? (
                          <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                            Final
                          </span>
                        ) : null}
                      </div>
                      {!snap.isFinal && !snapshotsQuery.locked ? (
                        <button
                          type="button"
                          disabled={finalizeMutation.isPending}
                          onClick={() => handleFinalize(snap.id)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Mark as final
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                disabled={!validation.isValid || snapshotsQuery.locked}
                onClick={handleGenerateExport}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate EFRAG Export
              </button>
              {!validation.isValid ? (
                <p className="text-sm text-slate-600">
                  Complete required fields and resolve validation errors before
                  export.
                </p>
              ) : snapshotsQuery.locked ? (
                <p className="text-sm text-violet-800">
                  Period is locked by a final snapshot.
                </p>
              ) : (
                <p className="text-sm text-emerald-800">
                  Validation passed — export creates the next immutable snapshot.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
