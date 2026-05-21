"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VSMEFormRenderer } from "@/components/vsme/VSMEFormRenderer";
import { VsmeWorkspaceSelectors } from "@/components/vsme/VsmeWorkspaceSelectors";
import type { VsmeFieldValue, VsmeMateriality } from "@/components/vsme/types";
import {
  useSaveVsmeField,
  useUpdateVsmeMateriality,
  useVsmeCoverage,
  useVsmeFieldValuesMap,
  useVsmeMateriality,
  useVsmeUiSchema,
  useVsmeWorkspace,
} from "@/components/vsme/queries";

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

  const schemaQuery = useVsmeUiSchema(employeeCount, periodId);
  const fieldValuesQuery = useVsmeFieldValuesMap(periodId);
  const materialityQuery = useVsmeMateriality(periodId);
  const coverageQuery = useVsmeCoverage(periodId);

  const saveFieldMutation = useSaveVsmeField();
  const updateMaterialityMutation = useUpdateVsmeMateriality();

  const [localValues, setLocalValues] = useState<Record<string, VsmeFieldValue>>(
    {}
  );

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

  const materialityByFieldId = useMemo(() => {
    const fromQuery = materialityQuery.byFieldId;
    const merged: Record<string, VsmeMateriality> = {};
    if (schemaQuery.schema) {
      for (const field of schemaQuery.fields) {
        merged[field.fieldId] =
          fromQuery[field.fieldId] ?? field.applicability.materiality;
      }
    }
    return { ...merged, ...fromQuery };
  }, [materialityQuery.byFieldId, schemaQuery.schema, schemaQuery.fields]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: string, unit: string | null) => {
      setLocalValues((prev) => ({
        ...prev,
        [fieldId]: { value, unit },
      }));
    },
    []
  );

  const handleFieldSave = useCallback(
    async (fieldId: string, value: string, unit: string | null) => {
      if (!periodId) {
        return;
      }
      try {
        await saveFieldMutation.mutateAsync({
          reportingPeriodId: periodId,
          fieldId,
          value,
          unit,
          employeeCount,
        });
      } catch {
        /* error surfaced via saveFieldMutation.error */
      }
    },
    [periodId, employeeCount, saveFieldMutation]
  );

  const handleMaterialityChange = useCallback(
    async (fieldId: string, materiality: VsmeMateriality) => {
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
        /* error surfaced via updateMaterialityMutation.error */
      }
    },
    [periodId, employeeCount, updateMaterialityMutation]
  );

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

  const saveError =
    saveFieldMutation.error?.message ??
    updateMaterialityMutation.error?.message ??
    null;

  const savingFieldId = saveFieldMutation.isPending
    ? saveFieldMutation.variables?.fieldId ?? null
    : null;

  const materialitySavingFieldId = updateMaterialityMutation.isPending
    ? updateMaterialityMutation.variables?.fieldId ?? null
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">VSME data entry</h1>
            <p className="mt-1 text-sm text-slate-600">
              Module scope from employee count · materiality per field
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
          </nav>
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
        ) : schemaQuery.schema && periodId ? (
          <VSMEFormRenderer
            schema={schemaQuery.schema}
            values={localValues}
            materialityByFieldId={materialityByFieldId}
            coverage={coverageQuery.coverage}
            fieldCount={schemaQuery.fieldCount}
            savingFieldId={savingFieldId}
            materialitySavingFieldId={materialitySavingFieldId}
            saveError={saveError}
            onFieldChange={handleFieldChange}
            onFieldSave={handleFieldSave}
            onMaterialityChange={handleMaterialityChange}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Select a reporting period to begin data entry.
          </p>
        )}
      </div>
    </main>
  );
}
