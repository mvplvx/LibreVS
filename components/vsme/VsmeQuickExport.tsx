"use client";

import { LIBREVS_POWERED_BY } from "@/lib/constants/librevsCommunity";

type VsmeQuickExportProps = {
  periodId: string;
  year: number;
  exportReady: boolean;
  missingRequiredCount: number;
};

export function VsmeQuickExport({
  periodId,
  year,
  exportReady,
  missingRequiredCount,
}: VsmeQuickExportProps) {
  const open = (format: "xlsx" | "pdf") => {
    if (!exportReady) {
      return;
    }
    window.open(
      `/api/reporting-period/${periodId}/export/${format}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">
        Export artifacts
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {exportReady
          ? "Deterministic XLSX and PDF from validated export rows."
          : `${missingRequiredCount} required field(s) still missing — export blocked.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!exportReady}
          onClick={() => open("xlsx")}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Export XLSX
        </button>
        <button
          type="button"
          disabled={!exportReady}
          onClick={() => open("pdf")}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 disabled:opacity-40"
        >
          Export PDF
        </button>
      </div>
      {exportReady ? (
        <p className="mt-2 text-[10px] text-slate-400">
          librevs-vsme-{year}.xlsx · librevs-vsme-{year}.pdf
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-slate-400">{LIBREVS_POWERED_BY}</p>
    </div>
  );
}
