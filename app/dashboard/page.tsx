"use client";

import Link from "next/link";
import { ExportCenter } from "@/components/export/ExportCenter";
import { SystemHealthIndicator } from "@/components/system/SystemHealthIndicator";
import { PilotModeBanner } from "@/components/vsme/PilotModeBanner";
import { VsmeWorkspaceFallback } from "@/components/vsme/VsmeWorkspaceFallback";
import {
  REPORTING_STATE_BADGE_CLASS,
  REPORTING_STATE_DESCRIPTIONS,
  REPORTING_STATE_LABELS,
} from "@/components/vsme/reportingStateUi";
import { ExportIntegrityIndicator } from "@/components/vsme/ExportIntegrityIndicator";
import { VsmeWorkspaceSelectors } from "@/components/vsme/VsmeWorkspaceSelectors";
import { useVsmeDashboard, useVsmeWorkspace } from "@/components/vsme/queries";
import { useExportValidation } from "@/hooks/useExportValidation";
import { parseReportingCurrency } from "@/lib/vsme/currency";

export default function DashboardPage() {
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
  } = useVsmeWorkspace();

  const dashboardQuery = useVsmeDashboard(periodId);
  const exportValidationQuery = useExportValidation(periodId);
  const dashboard = dashboardQuery.data ?? null;

  const loading =
    workspaceLoading ||
    dashboardQuery.isLoading ||
    exportValidationQuery.isLoading;

  const error =
    workspaceError ?? dashboardQuery.error?.message ?? null;

  const reportingCurrency = parseReportingCurrency(company?.currency);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PilotModeBanner />

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">LibreVS VSME Reporting</h1>
            <p className="mt-1 text-sm text-slate-600">
              Schema-driven local reporting (EFRAG-aligned, single company)
            </p>
            <a
              href="/vsme"
              className="mt-2 inline-block text-sm font-medium text-slate-800 underline"
            >
              Open VSME data entry →
            </a>
          </div>
          <SystemHealthIndicator />
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <VsmeWorkspaceSelectors
              companies={companies}
              company={company}
              employeeCount={employeeCount}
              reportingCurrency={reportingCurrency}
              periods={periods}
              periodId={periodId}
              onCompanyChange={setCompanyId}
              onPeriodChange={setPeriodId}
            />
          </aside>

          <div className="col-span-12 lg:col-span-9 space-y-6">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : !dashboard ? (
              <VsmeWorkspaceFallback
                companies={companies}
                company={company}
                periods={periods}
                onCreated={setPeriodId}
              />
            ) : dashboard ? (
              <>
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reporting state
                      </p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        {REPORTING_STATE_LABELS[dashboard.reportingState]}
                      </p>
                      <p className="mt-1 max-w-xl text-sm text-slate-600">
                        {REPORTING_STATE_DESCRIPTIONS[dashboard.reportingState]}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Derived from snapshot · {dashboard.requiredCoveragePercentage}%
                        required complete · period DB status:{" "}
                        <span className="font-medium">{dashboard.status}</span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${REPORTING_STATE_BADGE_CLASS[dashboard.reportingState]}`}
                    >
                      {dashboard.reportingState.replace(/_/g, " ")}
                    </span>
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">
                      In-scope completeness
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.inScopeCoveragePercentage}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboard.completeness.completedFieldIds.filter((id) =>
                        dashboard.completeness.inScopeFieldIds.includes(id)
                      ).length}{" "}
                      / {dashboard.completeness.inScopeFieldIds.length} in scope
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">
                      Material completeness
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.materialCoveragePercentage}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboard.completeness.missingMaterialFields.length}{" "}
                      material without data
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">
                      Required completeness
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.requiredCoveragePercentage}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboard.completeness.missingRequiredFields.length}{" "}
                      required missing
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">
                      Registry coverage
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.totalCoveragePercentage}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboard.fieldsReported} / {dashboard.totalFields}{" "}
                      fields
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase text-slate-500">Export</p>
                      {exportValidationQuery.validation ? (
                        <ExportIntegrityIndicator
                          exportCoverage={
                            exportValidationQuery.validation.exportCoverage
                          }
                          isValid={exportValidationQuery.validation.isValid}
                          compact
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 text-lg font-semibold">
                      {dashboard.exportReady ? "Ready" : "Blocked"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {dashboard.completeness.exportBlockingFields.length}{" "}
                      blocking field
                      {dashboard.completeness.exportBlockingFields.length === 1
                        ? ""
                        : "s"}
                    </p>
                    {periodId ? (
                      <Link
                        href={`/vsme/export-review?period=${periodId}`}
                        className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                      >
                        Review before export →
                      </Link>
                    ) : null}
                  </div>
                </div>

                <ExportCenter
                  periodId={periodId}
                  year={dashboard.year ?? null}
                  exportReady={dashboard.exportReady}
                  mandatoryCoveragePercentage={
                    dashboard.mandatoryCoveragePercentage ??
                    dashboard.requiredCoveragePercentage ??
                    0
                  }
                  missingRequiredCount={
                    dashboard.completeness.missingRequiredFields.length
                  }
                  blockingFieldCount={
                    dashboard.completeness.exportBlockingFields.length
                  }
                />

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-4 text-lg font-medium">Sections</h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {dashboard.applicableSections.map((s) => {
                      const counts = dashboard.bySection[s.sectionCode];
                      return (
                        <div
                          key={s.sectionCode}
                          className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm"
                        >
                          <p className="font-medium">
                            {s.sectionCode}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              ({s.workflowLabel.replace(/_/g, " ")})
                            </span>
                          </p>
                          {counts && (
                            <p className="text-slate-600">
                              {counts.reported} / {counts.total} fields
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {dashboard.values.length > 0 && (
                  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium">Reported values</h2>
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b text-slate-500">
                          <tr>
                            <th className="py-2 pr-4">Field</th>
                            <th className="py-2 pr-4">Value</th>
                            <th className="py-2">Excel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.values.map((row) => (
                            <tr key={row.fieldId} className="border-b border-slate-50">
                              <td className="py-2 pr-4">
                                <p className="font-medium">{row.label}</p>
                                <p className="font-mono text-xs text-slate-500">
                                  {row.fieldId}
                                </p>
                              </td>
                              <td className="py-2 pr-4">
                                {row.value}
                                {row.unit ? ` ${row.unit}` : ""}
                              </td>
                              <td className="py-2 font-mono text-xs">{row.excelCell}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a reporting period.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
