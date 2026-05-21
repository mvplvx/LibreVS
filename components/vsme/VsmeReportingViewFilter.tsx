"use client";

import {
  REPORTING_VIEW_MODE_OPTIONS,
  type ReportingViewMode,
} from "./vsmeReportingViewMode";

type VsmeReportingViewFilterProps = {
  value: ReportingViewMode;
  onChange: (mode: ReportingViewMode) => void;
  disabled?: boolean;
};

export function VsmeReportingViewFilter({
  value,
  onChange,
  disabled = false,
}: VsmeReportingViewFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Reporting view mode"
    >
      {REPORTING_VIEW_MODE_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            title={option.description}
            onClick={() => onChange(option.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
