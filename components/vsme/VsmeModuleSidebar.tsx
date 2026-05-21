"use client";

import type { VsmeUiSection } from "./types";
import type { ModuleWorkspaceMetrics } from "./vsmeWorkspaceMetrics";

type VsmeModuleSidebarProps = {
  basicSections: VsmeUiSection[];
  comprehensiveSections: VsmeUiSection[];
  basicMetrics: ModuleWorkspaceMetrics;
  comprehensiveMetrics: ModuleWorkspaceMetrics;
  basicExpanded: boolean;
  comprehensiveExpanded: boolean;
  onToggleBasic: () => void;
  onToggleComprehensive: () => void;
  mountedCodes: Set<string>;
  activeSectionCode: string | null;
  bySection?: Record<string, { reported: number; total: number }>;
  moduleCInReportingScope: boolean;
  employeeCount: number;
  navEnabled: boolean;
  onSectionSelect: (code: string) => void;
};

function ModuleGroupHeader({
  title,
  subtitle,
  metrics,
  expanded,
  onToggle,
}: {
  title: string;
  subtitle: string;
  metrics: ModuleWorkspaceMetrics;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-left hover:bg-slate-100"
      aria-expanded={expanded}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
        {title}
      </span>
      <span className="text-[10px] leading-snug text-slate-500">{subtitle}</span>
      <span className="text-xs font-medium text-slate-800">
        {metrics.completionPct}% complete
      </span>
      {metrics.missingRequired > 0 ? (
        <span className="text-[10px] text-amber-800">
          {metrics.missingRequired} required field
          {metrics.missingRequired === 1 ? "" : "s"} missing
        </span>
      ) : (
        <span className="text-[10px] text-emerald-700">Required complete</span>
      )}
      <span className="text-[10px] text-slate-500">
        Materiality decisions: {metrics.materialityDecisionPct}%
        {metrics.undecidedFields > 0
          ? ` · ${metrics.undecidedFields} undecided`
          : ""}
      </span>
    </button>
  );
}

function SectionNavButton({
  section,
  counts,
  isActive,
  isMounted,
  disabled,
  onSelect,
}: {
  section: VsmeUiSection;
  counts?: { reported: number; total: number };
  isActive: boolean;
  isMounted: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={`w-full rounded px-2 py-1.5 text-left text-sm ${
          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50"
        } ${isActive ? "bg-slate-100 font-medium" : ""} ${
          isMounted ? "ring-1 ring-inset ring-slate-200" : ""
        }`}
        aria-current={isActive ? "true" : undefined}
      >
        <span>{section.code}</span>
        {counts ? (
          <span className="ml-1 text-xs text-slate-500">
            {counts.reported}/{counts.total}
          </span>
        ) : null}
      </button>
    </li>
  );
}

export function VsmeModuleSidebar({
  basicSections,
  comprehensiveSections,
  basicMetrics,
  comprehensiveMetrics,
  basicExpanded,
  comprehensiveExpanded,
  onToggleBasic,
  onToggleComprehensive,
  mountedCodes,
  activeSectionCode,
  bySection,
  moduleCInReportingScope,
  employeeCount,
  navEnabled,
  onSectionSelect,
}: VsmeModuleSidebarProps) {
  const cSubtitle = moduleCInReportingScope
    ? "Required for 500–999 employees"
    : `Optional below ${500} employees (${employeeCount} employees)`;

  return (
    <nav
      className={`sticky top-28 max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        !navEnabled ? "opacity-60" : ""
      }`}
      aria-label="VSME module navigation"
    >
      <div className="space-y-2">
        <ModuleGroupHeader
          title="Basic Module"
          subtitle="Required for all companies"
          metrics={basicMetrics}
          expanded={basicExpanded}
          onToggle={onToggleBasic}
        />
        {basicExpanded ? (
          <ul className="ml-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
            {basicSections.map((section) => (
              <SectionNavButton
                key={section.id}
                section={section}
                counts={bySection?.[section.code]}
                isActive={activeSectionCode === section.code}
                isMounted={mountedCodes.has(section.code)}
                disabled={!navEnabled}
                onSelect={() => onSectionSelect(section.code)}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <ModuleGroupHeader
          title="Comprehensive Module"
          subtitle={cSubtitle}
          metrics={comprehensiveMetrics}
          expanded={comprehensiveExpanded}
          onToggle={onToggleComprehensive}
        />
        {comprehensiveExpanded ? (
          <ul className="ml-1 space-y-0.5 border-l-2 border-violet-200 pl-2">
            {comprehensiveSections.length === 0 ? (
              <li className="px-2 py-1 text-xs text-slate-500">
                No C sections visible
              </li>
            ) : (
              comprehensiveSections.map((section) => (
                <SectionNavButton
                  key={section.id}
                  section={section}
                  counts={bySection?.[section.code]}
                  isActive={activeSectionCode === section.code}
                  isMounted={mountedCodes.has(section.code)}
                  disabled={!navEnabled}
                  onSelect={() => onSectionSelect(section.code)}
                />
              ))
            )}
          </ul>
        ) : null}
      </div>
    </nav>
  );
}
