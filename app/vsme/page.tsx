"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ExportAuditPanel,
  VSME_FOCUS_FIELD_STORAGE_KEY,
} from "@/components/vsme/ExportAuditPanel";
import { VSMEFormRenderer } from "@/components/vsme/VSMEFormRenderer";
import { useExportAudit } from "@/hooks/useExportAudit";
import { useExportValidation } from "@/hooks/useExportValidation";
import { useVsmeFieldSaveCoordinator } from "@/hooks/useVsmeFieldSaveCoordinator";
import { SystemHealthIndicator } from "@/components/system/SystemHealthIndicator";
import { PilotModeBanner } from "@/components/vsme/PilotModeBanner";
import { VsmeWorkspaceFallback } from "@/components/vsme/VsmeWorkspaceFallback";
import { VsmeOnboardingPanel } from "@/components/vsme/VsmeOnboardingPanel";
import { VsmeQuickExport } from "@/components/vsme/VsmeQuickExport";
import { VsmeWorkspaceSelectors } from "@/components/vsme/VsmeWorkspaceSelectors";
import { deriveVsmeReportingUiMode } from "@/components/vsme/vsmeReportingUiMode";
import type { VsmeFieldValue, VsmeMateriality } from "@/components/vsme/types";
import { getReportingState } from "@/lib/vsme/getReportingState";
import {
  useUpdateVsmeMateriality,
  useVsmeCoverage,
  useVsmeFieldValuesMap,
  useVsmeMateriality,
  useVsmeUiSchema,
  useVsmeWorkspace,
} from "@/components/vsme/queries";

function valuesMapFromRecord(
  values: Record<string, VsmeFieldValue>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [fieldId, entry] of Object.entries(values)) {
    map[fieldId] = entry.value;
  }
  return map;
}

export default function VsmeReportingPage() {
  const workspace = useVsmeWorkspace();
  const {
    companies,
    company,
    employeeCount,
    periods,
    periodId,
    setCompanyId,
    setPeriodId,
    isLoading: workspaceLoading,
    error: workspaceError,
  } = workspace;

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === periodId) ?? null,
    [periods, periodId]
  );

  const schemaQuery = useVsmeUiSchema(employeeCount, periodId);
  const fieldValuesQuery = useVsmeFieldValuesMap(periodId);
  const materialityQuery = useVsmeMateriality(periodId);
  const coverageQuery = useVsmeCoverage(periodId);
  const exportReady = coverageQuery.coverage?.exportReady ?? false;
  const exportValidationQuery = useExportValidation(periodId);
  const exportAuditQuery = useExportAudit(periodId, exportReady);
  const navigateToFieldRef = useRef<((fieldId: string) => void) | null>(null);

  const updateMaterialityMutation = useUpdateVsmeMateriality();

  const [localValues, setLocalValues] = useState<Record<string, VsmeFieldValue>>(
    {}
  );

  const serverValuesSynced =
    !!periodId && !fieldValuesQuery.isFetching && !fieldValuesQuery.isLoading;

  useEffect(() => {
    if (!periodId) {
      setLocalValues((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (!fieldValuesQuery.isFetching) {
      setLocalValues((prev) =>
        prev === fieldValuesQuery.values ? prev : fieldValuesQuery.values
      );
    }
  }, [fieldValuesQuery.values, fieldValuesQuery.isFetching, periodId]);

  /** DB-only materiality; absent keys = UNDECIDED in field UI. */
  const dbMaterialityByFieldId = materialityQuery.byFieldId;

  const reportingState = useMemo(() => {
    const completeness = coverageQuery.coverage?.completeness;
    return getReportingState({
      companyId: company?.id ?? "",
      reportingPeriodId: periodId,
      employeeCount,
      materialityByFieldId: materialityQuery.byFieldId,
      valuesByFieldId: valuesMapFromRecord(localValues),
      requiredFieldIds: completeness?.requiredFieldIds ?? [],
      missingRequiredFieldIds: completeness?.missingRequiredFields ?? [],
      exportReady: coverageQuery.coverage?.exportReady ?? false,
      hasBeenExported: selectedPeriod?.status === "exported",
      materialityDefined:
        Object.keys(materialityQuery.byFieldId).length > 0,
    });
  }, [
    company?.id,
    periodId,
    employeeCount,
    materialityQuery.byFieldId,
    localValues,
    coverageQuery.coverage,
    selectedPeriod?.status,
  ]);

  const uiMode = useMemo(
    () => deriveVsmeReportingUiMode(reportingState),
    [reportingState]
  );

  const {
    saveStateByFieldId,
    workspaceSaveStatus,
    handleFieldChange,
    handleFieldSave,
    retryFieldSave,
  } = useVsmeFieldSaveCoordinator({
    periodId,
    employeeCount,
    localValues,
    setLocalValues,
    serverValues: fieldValuesQuery.values,
    serverValuesSynced,
    materialityByFieldId: dbMaterialityByFieldId,
    fieldsReadOnly: uiMode.fieldsReadOnly,
  });

  const handleMaterialityChange = async (
    fieldId: string,
    materiality: VsmeMateriality
  ) => {
    if (!periodId) {
      return;
    }
    try {
      await updateMaterialityMutation.mutateAsync({
        reportingPeriodId: periodId,
        fieldId,
        materiality,
        employeeCount,
      });
    } catch {
      /* surfaced via materialitySaveError */
    }
  };

  const loading =
    workspaceLoading ||
    schemaQuery.isLoading ||
    fieldValuesQuery.isLoading ||
    materialityQuery.isLoading ||
    coverageQuery.isLoading;

  const error =
    workspaceError ??
    schemaQuery.error?.message ??
    fieldValuesQuery.error?.message ??
    materialityQuery.error?.message ??
    coverageQuery.error?.message ??
    null;

  const materialitySaveError = updateMaterialityMutation.error?.message ?? null;

  const materialitySavingFieldId = updateMaterialityMutation.isPending
    ? updateMaterialityMutation.variables?.fieldId ?? null
    : null;

  const onboardingNeeded =
    !loading && (!company || periods.length === 0 || !periodId);

  const showFormShell =
    uiMode.showForm &&
    schemaQuery.schema &&
    periodId &&
    !loading &&
    !onboardingNeeded;

  const registerNavigateToField = useCallback(
    (navigate: ((fieldId: string) => void) | null) => {
      navigateToFieldRef.current = navigate;
    },
    []
  );

  useEffect(() => {
    if (!showFormShell) {
      return;
    }
    let fieldId: string | null = null;
    try {
      fieldId = sessionStorage.getItem(VSME_FOCUS_FIELD_STORAGE_KEY);
      if (fieldId) {
        sessionStorage.removeItem(VSME_FOCUS_FIELD_STORAGE_KEY);
      }
    } catch {
      fieldId = null;
    }
    if (!fieldId) {
      return;
    }
    const timer = window.setTimeout(() => {
      navigateToFieldRef.current?.(fieldId!);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [showFormShell, periodId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PilotModeBanner />

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">VSME data entry</h1>
            <p className="mt-1 text-sm text-slate-600">
              Reporting lifecycle · module scope from employee count
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SystemHealthIndicator />
          <nav className="flex gap-3 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
          </nav>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <VsmeWorkspaceSelectors
            companies={companies}
            company={company}
            employeeCount={employeeCount}
            periods={periods}
            periodId={periodId}
            onCompanyChange={setCompanyId}
            onPeriodChange={setPeriodId}
            showScopeHint
          />
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Schema</p>
            {schemaQuery.schema ? (
              <p className="mt-1 text-sm">
                {schemaQuery.schema.schemaVersion} · {schemaQuery.fieldCount} fields
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">—</p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading schema and values…</p>
        ) : onboardingNeeded ? (
          <>
          <VsmeWorkspaceFallback
            companies={companies}
            company={company}
            periods={periods}
            onCreated={setPeriodId}
          />
          <VsmeOnboardingPanel
            companies={companies}
            company={company}
            periods={periods}
            onPeriodCreated={setPeriodId}
          />
          </>
        ) : showFormShell ? (
          <>
            {uiMode.state === "EXPORT_READY" ||
            (periodId && exportValidationQuery.validation) ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    {exportValidationQuery.validation?.isValid
                      ? "Export validation passed — review before generating."
                      : "Export blocked — complete required fields first."}
                  </p>
                  {exportValidationQuery.validation ? (
                    <p className="mt-1 text-xs text-emerald-800/90">
                      {exportValidationQuery.validation.exportCoverage}% required
                      coverage · {exportValidationQuery.preview?.summary.includedFields ?? 0}{" "}
                      fields in export bundle
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {periodId ? (
                    <Link
                      href="/vsme/export-review"
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      Export review
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard"
                    className="rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            ) : null}

            {selectedPeriod && periodId ? (
              <div className="mb-4">
                <VsmeQuickExport
                  periodId={periodId}
                  year={selectedPeriod.year}
                  exportReady={coverageQuery.coverage?.exportReady ?? false}
                  missingRequiredCount={
                    coverageQuery.coverage?.completeness.missingRequiredFields
                      .length ?? 0
                  }
                />
              </div>
            ) : null}

            {uiMode.state === "EXPORTED" ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                <p className="text-sm text-violet-900">
                  This period is frozen after export. Fields are read-only.
                </p>
                <Link
                  href="/dashboard"
                  className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100"
                >
                  Create new reporting period
                </Link>
              </div>
            ) : null}

            {!exportReady && periodId ? (
              <div className="mb-4">
                <ExportAuditPanel
                  audit={exportAuditQuery.audit}
                  isLoading={exportAuditQuery.isLoading}
                  error={exportAuditQuery.error?.message ?? null}
                  onNavigateToField={(fieldId) =>
                    navigateToFieldRef.current?.(fieldId)
                  }
                />
              </div>
            ) : null}

            <VSMEFormRenderer
              schema={schemaQuery.schema}
              values={localValues}
              materialityByFieldId={dbMaterialityByFieldId}
              coverage={coverageQuery.coverage}
              fieldCount={schemaQuery.fieldCount}
              uiMode={uiMode}
              reportingState={reportingState}
              employeeCount={employeeCount}
              exportCoverage={
                exportValidationQuery.validation?.exportCoverage
              }
              exportValid={exportValidationQuery.validation?.isValid}
              materialitySavingFieldId={materialitySavingFieldId}
              saveStateByFieldId={saveStateByFieldId}
              workspaceSaveStatus={workspaceSaveStatus}
              materialitySaveError={materialitySaveError}
              onFieldChange={handleFieldChange}
              onFieldSave={handleFieldSave}
              onRetryFieldSave={retryFieldSave}
              onMaterialityChange={handleMaterialityChange}
              onRegisterNavigateToField={registerNavigateToField}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Loading reporting workspace…
          </p>
        )}
      </div>
    </main>
  );
}
