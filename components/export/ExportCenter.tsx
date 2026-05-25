"use client";

import { LIBREVS_POWERED_BY } from "@/lib/constants/librevsCommunity";

type ExportCenterProps = {
  periodId: string | null;
  year: number | null;
  exportReady: boolean;
  mandatoryCoveragePercentage: number;
  missingRequiredCount: number;
  blockingFieldCount: number;
};

export function ExportCenter({
  periodId,
  year,
  exportReady,
  mandatoryCoveragePercentage,
  missingRequiredCount,
  blockingFieldCount,
}: ExportCenterProps) {
  const disabled = !periodId || !exportReady;

  const openArtifact = (format: "xlsx" | "pdf") => {
    if (!periodId || disabled) {
      return;
    }
    window.open(
      `/api/reporting-period/${periodId}/export/${format}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-slate-900">Export center</h2>
      <p className="mt-1 text-xs text-slate-500">
        Deterministic artifacts from validated strict V2 export rows (no
        interpretation or analytics).
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Export status</dt>
          <dd
            className={`mt-0.5 font-semibold ${
              exportReady ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {exportReady ? "Ready" : "Blocked"}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Mandatory coverage</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {mandatoryCoveragePercentage}%
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">Missing required</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">
            {missingRequiredCount}
          </dd>
        </div>
      </dl>

      {!exportReady ? (
        <p className="mt-3 text-sm text-amber-800">
          {blockingFieldCount} field
          {blockingFieldCount === 1 ? "" : "s"} blocking export. Complete
          required material fields before generating artifacts.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => openArtifact("xlsx")}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export XLSX
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => openArtifact("pdf")}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export PDF
        </button>
      </div>

      {year != null && periodId ? (
        <p className="mt-2 text-[10px] text-slate-400">
          Files: librevs-vsme-{year}.xlsx · librevs-vsme-{year}.pdf
        </p>
      ) : null}
      <p className="mt-3 text-[10px] text-slate-400">{LIBREVS_POWERED_BY}</p>
    </section>
  );
}
