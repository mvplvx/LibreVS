"use client";

/** Presentational only — parents use React Query hooks; no apiGet/apiPost here. */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReportingState } from "@/lib/vsme/getReportingState";
import { isModuleCInReportingScope } from "@/lib/vsme/moduleScope";
import type { FieldSaveState } from "./fieldSaveState";
import type { WorkspaceSaveStatus } from "./fieldSaveState";
import type {
  VsmeCoverageMetrics,
  VsmeFieldValue,
  VsmeMateriality,
  VsmeUiSchema,
} from "./types";
import { countUndecidedVisibleFields } from "./fieldMaterialityState";
import { SectionRenderer } from "./SectionRenderer";
import { VsmeModuleSidebar } from "./VsmeModuleSidebar";
import { VsmePhaseMessage } from "./VsmePhaseMessage";
import { VsmeProgressHeader } from "./VsmeProgressHeader";
import { VsmeWorkspaceStatusBar } from "./VsmeWorkspaceStatusBar";
import type { VsmeReportingUiMode } from "./vsmeReportingUiMode";
import type { ReportingViewMode } from "./vsmeReportingViewMode";
import {
  computeModuleMetrics,
  groupSectionsByModule,
} from "./vsmeWorkspaceMetrics";

type VSMEFormRendererProps = {
  schema: VsmeUiSchema;
  values: Record<string, VsmeFieldValue>;
  materialityByFieldId: Record<string, VsmeMateriality>;
  coverage: VsmeCoverageMetrics | null;
  fieldCount: number;
  uiMode: VsmeReportingUiMode;
  reportingState: ReportingState;
  employeeCount: number;
  exportCoverage?: number;
  exportValid?: boolean;
  materialitySavingFieldId: string | null;
  saveStateByFieldId: Record<string, FieldSaveState>;
  workspaceSaveStatus: WorkspaceSaveStatus;
  materialitySaveError: string | null;
  onFieldChange: (fieldId: string, value: string, unit: string | null) => void;
  onFieldSave: (fieldId: string, value: string, unit: string | null) => void;
  onRetryFieldSave: (fieldId: string) => void;
  onMaterialityChange: (fieldId: string, materiality: VsmeMateriality) => void;
};

export function VSMEFormRenderer({
  schema,
  values,
  materialityByFieldId,
  coverage,
  fieldCount,
  uiMode,
  reportingState,
  employeeCount,
  exportCoverage,
  exportValid,
  materialitySavingFieldId,
  saveStateByFieldId,
  workspaceSaveStatus,
  materialitySaveError,
  onFieldChange,
  onFieldSave,
  onRetryFieldSave,
  onMaterialityChange,
}: VSMEFormRendererProps) {
  const sections = useMemo(
    () => schema.sections.filter((s) => s.applicability.visible),
    [schema.sections]
  );

  const { basic: basicSections, comprehensive: comprehensiveSections } =
    useMemo(() => groupSectionsByModule(sections), [sections]);

  const moduleCInScope = isModuleCInReportingScope(employeeCount);

  const [viewMode, setViewMode] = useState<ReportingViewMode>("all");
  const [basicModuleExpanded, setBasicModuleExpanded] = useState(true);
  const [comprehensiveModuleExpanded, setComprehensiveModuleExpanded] = useState(
    () => moduleCInScope
  );
  const [activeSectionCode, setActiveSectionCode] = useState<string | null>(
    () => basicSections[0]?.code ?? comprehensiveSections[0]?.code ?? null
  );

  const defaultActiveCode = basicSections[0]?.code ?? null;

  const [mountedCodes, setMountedCodes] = useState<Set<string>>(() =>
    defaultActiveCode ? new Set([defaultActiveCode]) : new Set()
  );

  useEffect(() => {
    setComprehensiveModuleExpanded(moduleCInScope);
  }, [moduleCInScope, schema.employeeCount]);

  const visibleSectionCodes = useMemo(
    () => sections.map((s) => s.code),
    [sections]
  );

  useEffect(() => {
    setMountedCodes((prev) => {
      const pruned = [...prev].filter((code) => visibleSectionCodes.includes(code));
      if (pruned.length > 0) {
        const next = new Set(pruned);
        return next.size === prev.size && [...next].every((c) => prev.has(c))
          ? prev
          : next;
      }
      return defaultActiveCode ? new Set([defaultActiveCode]) : new Set();
    });
    if (
      activeSectionCode &&
      !visibleSectionCodes.includes(activeSectionCode)
    ) {
      setActiveSectionCode(defaultActiveCode);
    }
  }, [visibleSectionCodes, defaultActiveCode, activeSectionCode]);

  useEffect(() => {
    if (uiMode.state === "CONTEXT_READY" || uiMode.state === "EXPORTED") {
      setMountedCodes(new Set(visibleSectionCodes));
      return;
    }
    if (uiMode.autoExpandFirstSection && defaultActiveCode) {
      setMountedCodes(new Set([defaultActiveCode]));
      setActiveSectionCode(defaultActiveCode);
    }
  }, [
    uiMode.autoExpandFirstSection,
    uiMode.state,
    visibleSectionCodes,
    defaultActiveCode,
  ]);

  const mountedSections = useMemo(
    () => sections.filter((s) => mountedCodes.has(s.code)),
    [sections, mountedCodes]
  );

  const exportBlockingIds = useMemo(
    () => new Set(coverage?.completeness.exportBlockingFields ?? []),
    [coverage?.completeness.exportBlockingFields]
  );

  const visibleFields = useMemo(
    () =>
      schema.sections.flatMap((s) =>
        s.subsections.flatMap((sub) =>
          sub.fields.filter((f) => f.applicability.visible)
        )
      ),
    [schema.sections]
  );

  const undecidedFieldCount = useMemo(
    () => countUndecidedVisibleFields(visibleFields, materialityByFieldId),
    [visibleFields, materialityByFieldId]
  );

  const basicMetrics = useMemo(
    () =>
      computeModuleMetrics("B", sections, materialityByFieldId, values),
    [sections, materialityByFieldId, values]
  );

  const comprehensiveMetrics = useMemo(
    () =>
      computeModuleMetrics("C", sections, materialityByFieldId, values),
    [sections, materialityByFieldId, values]
  );

  const activeContext = useMemo(() => {
    const section = sections.find((s) => s.code === activeSectionCode);
    if (!section) {
      return "Workspace";
    }
    const mod =
      section.applicability.module === "B" ? "Basic Module" : "Comprehensive Module";
    return `${mod} · ${section.code}`;
  }, [sections, activeSectionCode]);

  const overallCompletionPct =
    coverage?.requiredCoveragePercentage ??
    coverage?.mandatoryCoveragePercentage ??
    0;

  const mountSection = useCallback((code: string) => {
    setMountedCodes((prev) => {
      if (prev.has(code)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  }, []);

  const unmountSection = useCallback((code: string) => {
    setMountedCodes((prev) => {
      if (!prev.has(code)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }, []);

  const scrollToSection = useCallback(
    (code: string) => {
      if (!uiMode.navEnabled) {
        return;
      }
      setActiveSectionCode(code);
      mountSection(code);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document
            .getElementById(`section-${code}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [mountSection, uiMode.navEnabled]
  );

  const valueInputsDisabled = uiMode.fieldsReadOnly;
  const materialityDisabled = !uiMode.materialityEditable;

  return (
    <div className="space-y-6">
      <VsmeWorkspaceStatusBar
        reportingState={reportingState}
        overallCompletionPct={overallCompletionPct}
        exportReady={coverage?.exportReady ?? false}
        exportCoverage={exportCoverage}
        exportValid={exportValid}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeContext={activeContext}
        employeeCount={employeeCount}
        moduleCInReportingScope={moduleCInScope}
        viewFilterDisabled={!uiMode.navEnabled}
        workspaceSaveStatus={workspaceSaveStatus}
      />

      <VsmePhaseMessage state={uiMode.state} />

      {uiMode.showProgressHeader ? (
        <VsmeProgressHeader
          schema={schema}
          coverage={coverage}
          fieldCount={fieldCount}
          undecidedFieldCount={undecidedFieldCount}
          prominent={uiMode.summaryProminent}
          auditTone={uiMode.auditHeaderTone}
          showMissingRequiredIndicator={uiMode.showMissingRequiredIndicator}
        />
      ) : null}

      {materialitySaveError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {materialitySaveError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        {uiMode.navVisible ? (
          <div className="lg:col-span-3">
            <VsmeModuleSidebar
              basicSections={basicSections}
              comprehensiveSections={comprehensiveSections}
              basicMetrics={basicMetrics}
              comprehensiveMetrics={comprehensiveMetrics}
              basicExpanded={basicModuleExpanded}
              comprehensiveExpanded={comprehensiveModuleExpanded}
              onToggleBasic={() => setBasicModuleExpanded((v) => !v)}
              onToggleComprehensive={() =>
                setComprehensiveModuleExpanded((v) => !v)
              }
              mountedCodes={mountedCodes}
              activeSectionCode={activeSectionCode}
              bySection={coverage?.bySection}
              moduleCInReportingScope={moduleCInScope}
              employeeCount={employeeCount}
              navEnabled={uiMode.navEnabled}
              onSectionSelect={scrollToSection}
            />
          </div>
        ) : null}

        <div
          className={`space-y-4 ${
            uiMode.navVisible ? "lg:col-span-9" : "lg:col-span-12"
          } ${uiMode.formDeemphasized ? "opacity-90" : ""}`}
        >
          {mountedSections.length === 0 ? (
            <p className="text-sm text-slate-500">
              Expand a module and select a section to load fields.
            </p>
          ) : (
            mountedSections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                values={values}
                materialityByFieldId={materialityByFieldId}
                exportBlockingIds={exportBlockingIds}
                materialitySavingFieldId={materialitySavingFieldId}
                saveStateByFieldId={saveStateByFieldId}
                bySection={coverage?.bySection}
                expanded
                viewMode={viewMode}
                onToggle={() => {
                  if (activeSectionCode === section.code) {
                    setActiveSectionCode(null);
                  }
                  unmountSection(section.code);
                }}
                onMaterialityChange={onMaterialityChange}
                onChange={onFieldChange}
                onSave={onFieldSave}
                onRetrySave={onRetryFieldSave}
                valueInputsDisabled={valueInputsDisabled}
                materialityDisabled={materialityDisabled}
                showExportBlockingHints={uiMode.showMissingRequiredIndicator}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
