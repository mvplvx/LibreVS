"use client";

import type { VsmeUiSection } from "./types";
import type { SectionWorkspaceSummary } from "./vsmeWorkspaceMetrics";

type SectionSummaryHeaderProps = {
  section: VsmeUiSection;
  summary: SectionWorkspaceSummary;
  inScope: boolean;
};

export function SectionSummaryHeader({
  section,
  summary,
  inScope,
}: SectionSummaryHeaderProps) {
  const moduleCode = section.applicability.module;

  return (
    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {section.code} — {section.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Module {moduleCode}
            {moduleCode === "B" ? " · Basic (required)" : " · Comprehensive"}
            {inScope ? " · In reporting scope" : " · Optional scope"}
          </p>
        </div>
        <p className="text-lg font-semibold text-slate-800">
          {summary.completionPct}%
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Required missing</dt>
          <dd className="font-medium text-slate-800">
            {summary.requiredMissing}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Material fields</dt>
          <dd className="font-medium text-emerald-800">{summary.materialCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Excluded</dt>
          <dd className="font-medium text-slate-600">{summary.excludedCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Undecided</dt>
          <dd className="font-medium text-amber-800">{summary.undecidedCount}</dd>
        </div>
      </dl>
    </div>
  );
}
