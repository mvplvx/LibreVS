"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { DataOwnershipNotice } from "@/components/librevs/DataOwnershipNotice";
import { SystemHealthIndicator } from "@/components/system/SystemHealthIndicator";
import { PilotModeBanner } from "@/components/vsme/PilotModeBanner";
import { useCreateReportingPeriod, useVsmeWorkspace } from "@/components/vsme/queries";
import { VsmeWorkspaceSelectors } from "@/components/vsme/VsmeWorkspaceSelectors";
import { saveOptionAAction } from "@/lib/vsme/vs2026/editorActions";
import { apiGet } from "@/lib/api/client";
import { queryClient } from "@/lib/query/queryClient";
import { parseReportingCurrency } from "@/lib/vsme/currency";
import { vsmeKeys } from "@/lib/vsme/vsmeQueryKeys";
import type { Vs2026PeriodSummary } from "@/lib/vsme/vs2026/periodSummary";

const OPTION_LABEL: Record<Vs2026PeriodSummary["standard"], string> = {
  UNCONFIGURED: "VS 2026 reporting option not configured",
  OPTION_A: "VS 2026 · Option A · Basic Module",
  OPTION_B: "VS 2026 · Option B · Comprehensive Module — future support",
  INVALID: "The stored reporting option is not valid",
};

export default function DashboardPage() {
  const {
    companies,
    company,
    employeeCount,
    periods,
    periodId,
    setCompanyId,
    setPeriodId,
    isLoading,
    error: workspaceError,
  } = useVsmeWorkspace();
  const createPeriod = useCreateReportingPeriod();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<Vs2026PeriodSummary | null>(null);
  const [summaryPeriodId, setSummaryPeriodId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [optionMessage, setOptionMessage] = useState<string | null>(null);
  const [optionPending, setOptionPending] = useState(false);
  const reportingCurrency = parseReportingCurrency(company?.currency);

  useEffect(() => {
    if (!periodId) {
      return;
    }
    const requestedId = periodId;
    let cancelled = false;
    apiGet<Vs2026PeriodSummary>(`/api/vsme/vs2026/period/${requestedId}/summary`)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setSummaryPeriodId(requestedId);
          setSummaryError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummary(null);
          setSummaryPeriodId(requestedId);
          setSummaryError(error instanceof Error ? error.message : "The reporting period could not be loaded.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [periodId]);
  const visibleSummary = periodId && summaryPeriodId === periodId ? summary : null;
  const visibleSummaryError = periodId && summaryPeriodId === periodId ? summaryError : null;

  async function createReportingPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company?.id) {
      return;
    }
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear)) {
      return;
    }
    const created = await createPeriod.mutateAsync({ companyId: company.id, year: parsedYear });
    setPeriodId(created.id);
    setOptionMessage(null);
  }

  async function chooseOptionA() {
    if (!periodId) {
      return;
    }
    setOptionPending(true);
    setOptionMessage(null);
    const result = await saveOptionAAction(periodId);
    setOptionPending(false);
    if (!result.ok) {
      setOptionMessage(result.message);
      return;
    }
    setOptionMessage("Option A is saved for this period.");
    await queryClient.invalidateQueries({ queryKey: vsmeKeys.reportingPeriods() });
    const refreshed = await apiGet<Vs2026PeriodSummary>(`/api/vsme/vs2026/period/${periodId}/summary`);
    setSummary(refreshed);
    setSummaryPeriodId(periodId);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PilotModeBanner />
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">LibreVS reporting</h1>
            <p className="mt-1 text-sm text-slate-600">
              VS 2026 Basic Module for the selected undertaking and reporting period.
            </p>
          </div>
          <SystemHealthIndicator />
        </header>
        {workspaceError ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{workspaceError}</div>
        ) : null}
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 space-y-4 lg:col-span-3">
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
            <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={createReportingPeriod}>
              <h2 className="text-sm font-semibold text-slate-900">New reporting period</h2>
              <p className="mt-1 text-xs text-slate-600">
                The period stays unconfigured until you choose Option A. Comprehensive Module support comes later.
              </p>
              <label className="mt-3 block text-sm text-slate-800">
                Reporting year
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                />
              </label>
              <button
                className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                type="submit"
                disabled={!company || createPeriod.isPending}
              >
                {createPeriod.isPending ? "Creating…" : "Create reporting period"}
              </button>
              {createPeriod.isError ? (
                <p className="mt-2 text-sm text-red-700">{createPeriod.error?.message}</p>
              ) : null}
            </form>
            <DataOwnershipNotice compact />
          </aside>
          <div className="col-span-12 space-y-6 lg:col-span-9">
            {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
            {!periodId && !isLoading ? (
              <p className="text-sm text-slate-600">Select an undertaking and a reporting period, or create a period.</p>
            ) : null}
            {visibleSummaryError ? <p className="text-sm text-red-700">{visibleSummaryError}</p> : null}
            {visibleSummary ? (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting period</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {visibleSummary.companyName} · {visibleSummary.year}
                </h2>
                <p className="mt-2 text-sm text-slate-700">{OPTION_LABEL[visibleSummary.standard]}</p>
                <p className="mt-2 text-sm text-slate-700">{visibleSummary.readinessMessage}</p>
                {visibleSummary.readiness ? (
                  <p className="mt-2 text-xs text-slate-500">Internal review status: {visibleSummary.readiness.replaceAll("_", " ")}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {visibleSummary.standard === "UNCONFIGURED" ? (
                    <button
                      className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
                      type="button"
                      disabled={optionPending}
                      onClick={() => void chooseOptionA()}
                    >
                      {optionPending ? "Saving…" : "Choose Option A — Basic Module"}
                    </button>
                  ) : null}
                  <span className="rounded border border-slate-300 px-3 py-2 text-slate-500">
                    Comprehensive Module — future support
                  </span>
                  <Link className="rounded border border-slate-300 px-3 py-2" href={`/vsme/vs2026/edit/${visibleSummary.reportingPeriodId}`}>
                    {visibleSummary.editorEnabled ? "Open the Basic Module editor" : "Editor unavailable"}
                  </Link>
                </div>
                {optionMessage ? <p className="mt-3 text-sm text-slate-700">{optionMessage}</p> : null}
                {visibleSummary.snapshots.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-slate-900">Finalised revisions</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      {visibleSummary.snapshots.map((snapshot) => (
                        <li key={snapshot.id}>
                          Revision {snapshot.revision}
                          <span className="text-slate-600"> · {snapshot.finalisedAt}</span>
                          <span className="ml-3 space-x-3">
                            <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=pdf`}>
                              Download PDF report
                            </a>
                            <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=xlsx`}>
                              Download Excel report
                            </a>
                            <a className="underline" href={`/api/vsme/vs2026/report/snapshot/${snapshot.id}?format=json`}>
                              Download JSON data
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-600">No finalised revision is stored for this period.</p>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
