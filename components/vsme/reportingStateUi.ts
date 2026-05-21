import type { VsmeReportingState } from "./types";

export const REPORTING_STATE_LABELS: Record<VsmeReportingState, string> = {
  WORKSPACE_INITIALIZED: "Workspace initialized",
  CONTEXT_READY: "Context ready",
  MATERIALITY_DEFINED: "Materiality defined",
  DATA_IN_PROGRESS: "Data in progress",
  VALIDATION_READY: "Validation ready",
  EXPORT_READY: "Export ready",
  EXPORTED: "Exported",
};

export const REPORTING_STATE_DESCRIPTIONS: Record<VsmeReportingState, string> = {
  WORKSPACE_INITIALIZED:
    "Select a company and reporting period to begin VSME reporting.",
  CONTEXT_READY:
    "Set materiality for in-scope fields before entering data.",
  MATERIALITY_DEFINED:
    "Materiality is set. Enter values for required material fields.",
  DATA_IN_PROGRESS:
    "Reporting has started. Complete remaining required fields.",
  VALIDATION_READY:
    "All required fields are filled. Resolve validation before export.",
  EXPORT_READY:
    "Report is complete and ready to export.",
  EXPORTED: "Export has been generated for this reporting period.",
};

export const REPORTING_STATE_BADGE_CLASS: Record<VsmeReportingState, string> = {
  WORKSPACE_INITIALIZED: "bg-slate-100 text-slate-700 ring-slate-200",
  CONTEXT_READY: "bg-slate-100 text-slate-600 ring-slate-200",
  MATERIALITY_DEFINED: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  DATA_IN_PROGRESS: "bg-blue-50 text-blue-800 ring-blue-200",
  VALIDATION_READY: "bg-amber-50 text-amber-900 ring-amber-200",
  EXPORT_READY: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  EXPORTED: "bg-violet-50 text-violet-800 ring-violet-200",
};
