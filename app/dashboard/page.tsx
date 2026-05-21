"use client";

import { useCallback, useEffect, useState } from "react";

type Company = { id: string; name: string };

type ReportingPeriod = {
  id: string;
  year: number;
  status: string;
  companyId: string;
};

type DashboardData = {
  reportingPeriodId: string;
  year: number;
  status: string;
  companyId: string;
  totalDataPoints: number;
  vsme: {
    fieldsReported: number;
    totalFields: number;
    coveragePercentage: number;
    bySection: Record<string, { reported: number; total: number }>;
    values: {
      fieldId: string;
      path: string;
      label: string;
      value: string;
      unit: string | null;
      excelCell: string;
    }[];
  };
};

export default function DashboardPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (periodId: string) => {
    setLoadingDashboard(true);
    setError(null);
    try {
      const res = await fetch(`/api/reporting-period/${periodId}/dashboard`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to load dashboard");
      }
      setDashboard(json.data);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [companyRes, periodsRes] = await Promise.all([
          fetch("/api/company"),
          fetch("/api/reporting-period"),
        ]);
        const companyJson = await companyRes.json();
        const periodsJson = await periodsRes.json();
        if (!companyRes.ok || !companyJson.success) {
          throw new Error(companyJson.error ?? "Failed to load company");
        }
        if (!periodsRes.ok || !periodsJson.success) {
          throw new Error(periodsJson.error ?? "Failed to load periods");
        }
        const companies: Company[] = companyJson.data ?? [];
        const first = companies[0] ?? null;
        setCompany(first);
        const companyPeriods = (periodsJson.data ?? []).filter(
          (p: ReportingPeriod) => !first || p.companyId === first.id
        );
        setPeriods(companyPeriods);
        const latest = companyPeriods[0]?.id ?? "";
        setSelectedPeriodId(latest);
        if (latest) await loadDashboard(latest);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadDashboard]);

  useEffect(() => {
    if (selectedPeriodId) loadDashboard(selectedPeriodId);
    else setDashboard(null);
  }, [selectedPeriodId, loadDashboard]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">LibreVS VSME Reporting</h1>
          <p className="mt-1 text-sm text-slate-600">
            Schema-driven local reporting (EFRAG-aligned, single company)
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                Company
              </h2>
              {company ? (
                <p className="font-medium">{company.name}</p>
              ) : (
                <p className="text-sm text-slate-500">No company</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                Reporting period
              </h2>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.year} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          </aside>

          <div className="col-span-12 lg:col-span-9 space-y-6">
            {loading || loadingDashboard ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : dashboard ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">VSME coverage</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.vsme.coveragePercentage}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">Fields reported</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.vsme.fieldsReported} / {dashboard.vsme.totalFields}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase text-slate-500">Data points</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {dashboard.totalDataPoints}
                    </p>
                  </div>
                </div>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-4 text-lg font-medium">Coverage by section</h2>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(dashboard.vsme.bySection).map(([code, s]) => (
                      <div
                        key={code}
                        className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-medium">{code}</p>
                        <p className="text-slate-600">
                          {s.reported} / {s.total} fields
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {dashboard.vsme.values.length > 0 && (
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
                          {dashboard.vsme.values.map((row) => (
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
