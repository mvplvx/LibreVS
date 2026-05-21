"use client";

import type { ReportingState } from "@/lib/vsme/getReportingState";
import { COMPREHENSIVE_EMPLOYEE_THRESHOLD } from "@/lib/vsme/moduleScope";
import { ExportIntegrityIndicator } from "./ExportIntegrityIndicator";
import {
  REPORTING_STATE_BADGE_CLASS,
  REPORTING_STATE_LABELS,
} from "./reportingStateUi";
import { VsmeReportingViewFilter } from "./VsmeReportingViewFilter";
import type { WorkspaceSaveStatus } from "./fieldSaveState";
import {
  reportingViewModeLabel,
  type ReportingViewMode,
} from "./vsmeReportingViewMode";

type VsmeWorkspaceStatusBarProps = {
  reportingState: ReportingState;
  overallCompletionPct: number;
  exportReady: boolean;
  exportCoverage?: number;
  exportValid?: boolean;
  viewMode: ReportingViewMode;
  onViewModeChange: (mode: ReportingViewMode) => void;
  activeContext: string;
  employeeCount: number;
  moduleCInReportingScope: boolean;
  viewFilterDisabled?: boolean;
  workspaceSaveStatus?: WorkspaceSaveStatus;
};

export function VsmeWorkspaceStatusBar({
  reportingState,
  overallCompletionPct,
  exportReady,
  exportCoverage,
  exportValid,
  viewMode,
  onViewModeChange,
  activeContext,
  employeeCount,
  moduleCInReportingScope,
  viewFilterDisabled = false,
  workspaceSaveStatus,
}: VsmeWorkspaceStatusBarProps) {
  const saveToneClass =
    workspaceSaveStatus?.tone === "error"
      ? "text-red-700"
      : workspaceSaveStatus?.tone === "warning"
        ? "text-amber-700"
        : workspaceSaveStatus?.tone === "active"
          ? "text-slate-700"
          : "text-emerald-700";
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/90">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${REPORTING_STATE_BADGE_CLASS[reportingState]}`}
          >
            {REPORTING_STATE_LABELS[reportingState]}
          </span>
          <div className="text-sm">
            <span className="font-medium text-slate-900">
              {overallCompletionPct}%
            </span>
            <span className="text-slate-500"> required complete</span>
          </div>
          <span
            className={`text-xs font-medium ${
              exportReady ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            Export {exportReady ? "ready" : "blocked"}
          </span>
          {exportCoverage != null && exportValid != null ? (
            <ExportIntegrityIndicator
              exportCoverage={exportCoverage}
              isValid={exportValid}
            />
          ) : null}
          {workspaceSaveStatus ? (
            <span className={`text-xs font-medium ${saveToneClass}`}>
              {workspaceSaveStatus.message}
            </span>
          ) : null}
        </div>
        <p className="max-w-md text-right text-xs text-slate-500">
          <span className="font-medium text-slate-700">Context: </span>
          {activeContext}
          <span className="mx-1">·</span>
          View: {reportingViewModeLabel(viewMode)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <VsmeReportingViewFilter
          value={viewMode}
          onChange={onViewModeChange}
          disabled={viewFilterDisabled}
        />
        <p className="text-[10px] text-slate-500">
          C module:{" "}
          {moduleCInReportingScope
            ? `required (≥${COMPREHENSIVE_EMPLOYEE_THRESHOLD} employees)`
            : `optional (${employeeCount} employees — expand Comprehensive module)`}
        </p>
      </div>
    </div>
  );
}
