"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { useExportValidation } from "@/hooks/useExportValidation";
import { useVsmeWorkspace } from "@/components/vsme/queries";

type SystemHealthPayload = {
  status: string;
  schemaVersion: string;
  registry: {
    fieldCount: number;
    bSections: number;
    cSections: number;
  };
  legacyFieldsDetected: boolean;
  warnings?: string[];
};

export default function SystemDebugPage() {
  const healthQuery = useQuery({
    queryKey: ["librevs", "system-health"],
    queryFn: () => apiGet<SystemHealthPayload>("/api/system-health"),
  });

  const workspace = useVsmeWorkspace();
  const exportQuery = useExportValidation(workspace.periodId);

  const health = healthQuery.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">System diagnostics</h1>
          <p className="mt-1 text-sm text-slate-600">
            Read-only runtime view — no data mutations
          </p>
          <nav className="mt-3 flex gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-700 underline">
              Dashboard
            </Link>
            <Link href="/vsme" className="text-slate-700 underline">
              VSME entry
            </Link>
          </nav>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Registry & schema
          </h2>
          {healthQuery.isLoading ? (
            <p className="mt-2 text-sm text-slate-500">Loading…</p>
          ) : health ? (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium capitalize">{health.status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Schema version</dt>
                <dd className="font-mono">{health.schemaVersion}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Field count</dt>
                <dd className="font-medium">{health.registry.fieldCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Sections (B / C)</dt>
                <dd className="font-medium">
                  {health.registry.bSections} / {health.registry.cSections}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Legacy rows detected</dt>
                <dd className="font-medium">
                  {health.legacyFieldsDetected ? "yes" : "no"}
                </dd>
              </div>
              {health.warnings && health.warnings.length > 0 ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Warnings</dt>
                  <dd className="text-amber-800">{health.warnings.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-red-700">Failed to load system health</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Export readiness (selected period)
          </h2>
          {!workspace.periodId ? (
            <p className="mt-2 text-sm text-slate-600">
              No reporting period selected. Open the dashboard and choose a period.
            </p>
          ) : exportQuery.isLoading ? (
            <p className="mt-2 text-sm text-slate-500">Loading export validation…</p>
          ) : (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Period</dt>
                <dd className="font-mono text-xs">{workspace.periodId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Export ready</dt>
                <dd className="font-medium">
                  {exportQuery.exportReady ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">EFRAG valid</dt>
                <dd className="font-medium">
                  {exportQuery.validation?.isValid ? "yes" : "no"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Required coverage</dt>
                <dd className="font-medium">
                  {exportQuery.validation?.exportCoverage ?? "—"}%
                </dd>
              </div>
            </dl>
          )}
        </section>

        <p className="text-xs text-slate-500">
          API:{" "}
          <a
            href="/api/system-health"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /api/system-health
          </a>
        </p>
      </div>
    </main>
  );
}
