"use client";

import type { ReportingState } from "@/lib/vsme/getReportingState";

const PHASE_MESSAGES: Partial<
  Record<ReportingState, { title: string; body: string; tone: string }>
> = {
  CONTEXT_READY: {
    title: "Declare reporting decisions to start",
    body: "Each field requires an explicit Material or Non-material choice before data entry. Undecided fields block export readiness.",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
  },
  MATERIALITY_DEFINED: {
    title: "Start entering data to begin reporting",
    body: "Materiality is configured. Enter values for required material fields in each section.",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
  },
  VALIDATION_READY: {
    title: "Validation complete",
    body: "All required fields have values. Review completeness before export.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  EXPORT_READY: {
    title: "System is ready for export",
    body: "Reporting is complete for this period. Generate export from the dashboard when ready.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  EXPORTED: {
    title: "This reporting period has been exported",
    body: "Data is read-only. Create a new reporting period to start another cycle.",
    tone: "border-violet-200 bg-violet-50 text-violet-900",
  },
};

type VsmePhaseMessageProps = {
  state: ReportingState;
};

export function VsmePhaseMessage({ state }: VsmePhaseMessageProps) {
  const message = PHASE_MESSAGES[state];
  if (!message) {
    return null;
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${message.tone}`}>
      <p className="font-medium">{message.title}</p>
      <p className="mt-1 text-sm opacity-90">{message.body}</p>
    </div>
  );
}
