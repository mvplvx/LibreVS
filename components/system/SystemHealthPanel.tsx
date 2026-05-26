"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import { useExportValidation } from "@/hooks/useExportValidation";
import { useVsmeWorkspace } from "@/components/vsme/queries";
import { VSME_FIELD_COUNT } from "@/lib/vsme/vsme.fieldRegistry";

type SystemHealthPayload = {
  status: string;
  schemaVersion: string;
  releaseCandidate: string;
  appVersion: string;
  databaseReachable: boolean;
  registry: {
    fieldCount: number;
    bSections: number;
    cSections: number;
    ok: boolean;
  };
  engines: {
    exportValidation: string;
    materiality: string;
    reportingSnapshot: string;
  };
  legacyFieldsDetected: boolean;
  warnings?: string[];
};

type VersionPayload = {
  version: string;
  releaseCandidate: string;
  schemaVersion: string;
  gitCommitShort: string | null;
  environment: string;
};

export function SystemHealthPanel() {
  const healthQuery = useQuery({
    queryKey: ["librevs", "system-health"],
    queryFn: () => apiGet<SystemHealthPayload>("/api/system-health"),
  });

  const versionQuery = useQuery({
    queryKey: ["librevs", "version"],
    queryFn: () => apiGet<VersionPayload>("/api/librevs/version"),
  });

  const workspace = useVsmeWorkspace();
  const exportQuery = useExportValidation(workspace.periodId);

  const health = healthQuery.data;
  const version = versionQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-slate-500">
          Release & build
        </h2>
        {versionQuery.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : version ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Release</dt>
              <dd className="font-medium">{version.releaseCandidate}</dd>
            </div>
            <div>
              <dt className="text-slate-500">App version</dt>
              <dd className="font-mono">v{version.version}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Schema</dt>
              <dd className="font-mono">VSME {version.schemaVersion}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Environment</dt>
              <dd className="font-medium capitalize">{version.environment}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Git commit</dt>
              <dd className="font-mono">{version.gitCommitShort ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Expected fields</dt>
              <dd className="font-medium">{VSME_FIELD_COUNT}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-red-700">Version API unavailable</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-slate-500">
          Runtime health
        </h2>
        {healthQuery.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : health ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Overall status</dt>
              <dd className="font-medium capitalize">{health.status}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Database</dt>
              <dd className="font-medium">
                {health.databaseReachable ? "connected" : "unreachable"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Registry fields</dt>
              <dd className="font-medium">
                {health.registry.fieldCount} / {VSME_FIELD_COUNT}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Sections (B / C)</dt>
              <dd className="font-medium">
                {health.registry.bSections} / {health.registry.cSections}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Legacy rows (sample)</dt>
              <dd className="font-medium">
                {health.legacyFieldsDetected ? "detected" : "none"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Export engine</dt>
              <dd className="font-medium">{health.engines.exportValidation}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Materiality engine</dt>
              <dd className="font-medium">{health.engines.materiality}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Reporting snapshot</dt>
              <dd className="font-medium">{health.engines.reportingSnapshot}</dd>
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
            No reporting period selected. Open the{" "}
            <Link href="/dashboard" className="font-medium underline">
              dashboard
            </Link>{" "}
            and choose a period.
          </p>
        ) : exportQuery.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Loading export validation…</p>
        ) : (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
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

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-medium text-slate-800">RC1 QA checklist</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Registry loads {VSME_FIELD_COUNT} fields</li>
          <li>API connectivity via this page and workspace save</li>
          <li>Export validation deterministic per period</li>
          <li>No sensitive data displayed on this page</li>
        </ul>
        <p className="mt-3">
          Automated:{" "}
          <code className="rounded bg-white px-1">npm run phase8:smoke</code>
        </p>
      </section>

      <p className="text-xs text-slate-500">
        APIs:{" "}
        <a href="/api/system-health" className="underline" target="_blank" rel="noreferrer">
          /api/system-health
        </a>
        {" · "}
        <a href="/api/librevs/version" className="underline" target="_blank" rel="noreferrer">
          /api/librevs/version
        </a>
      </p>
    </div>
  );
}
