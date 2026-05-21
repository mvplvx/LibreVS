import type { VsmeReportingState } from "./types";

export const REPORTING_STATE_LABELS: Record<VsmeReportingState, string> = {
  draft: "Draft",
  in_progress: "In progress",
  ready_for_review: "Ready for review",
  export_ready: "Export ready",
  exported: "Exported",
};

export const REPORTING_STATE_DESCRIPTIONS: Record<VsmeReportingState, string> = {
  draft: "Less than 20% of required fields are complete.",
  in_progress: "Between 20% and 80% of required fields are complete.",
  ready_for_review: "Over 80% complete; required fields still missing.",
  export_ready: "All required fields are complete and export is unblocked.",
  exported: "Export has been generated for this period.",
};

export const REPORTING_STATE_BADGE_CLASS: Record<VsmeReportingState, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-blue-50 text-blue-800 ring-blue-200",
  ready_for_review: "bg-amber-50 text-amber-900 ring-amber-200",
  export_ready: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  exported: "bg-violet-50 text-violet-800 ring-violet-200",
};
