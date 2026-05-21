"use client";

import type { ReportingState } from "@/lib/vsme/getReportingState";
import { REPORTING_STATE_LABELS } from "./reportingStateUi";

const NEXT_ACTION_HINTS: Record<ReportingState, string> = {
  WORKSPACE_INITIALIZED: "Set up company context",
  CONTEXT_READY: "Define materiality",
  MATERIALITY_DEFINED: "Start data entry",
  DATA_IN_PROGRESS: "Continue reporting",
  VALIDATION_READY: "Review completeness",
  EXPORT_READY: "Generate export",
  EXPORTED: "Reporting completed",
};

type VsmeStateBannerProps = {
  state: ReportingState;
};

export function VsmeStateBanner({ state }: VsmeStateBannerProps) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reporting phase
          </p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            {REPORTING_STATE_LABELS[state]}
          </p>
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Next: </span>
          {NEXT_ACTION_HINTS[state]}
        </p>
      </div>
    </div>
  );
}
