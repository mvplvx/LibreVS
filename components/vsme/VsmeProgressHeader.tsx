"use client";

import type { VsmeCoverageMetrics, VsmeUiSchema } from "./types";

type VsmeProgressHeaderProps = {
  schema: VsmeUiSchema;
  coverage: VsmeCoverageMetrics | null;
  fieldCount: number;
  undecidedFieldCount?: number;
  prominent?: boolean;
  auditTone?: boolean;
  showMissingRequiredIndicator?: boolean;
};

export function VsmeProgressHeader({
  schema,
  coverage,
  fieldCount,
  undecidedFieldCount = 0,
  prominent = false,
  auditTone = false,
  showMissingRequiredIndicator = false,
}: VsmeProgressHeaderProps) {
  const completeness = coverage?.completeness;
  const exportBlockingCount = completeness?.exportBlockingFields.length ?? 0;
  const missingRequiredCount = completeness?.missingRequiredFields.length ?? 0;

  const shellClass = auditTone
    ? "rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm ring-1 ring-amber-100"
    : prominent
      ? "rounded-lg border border-emerald-200 bg-white p-4 shadow-md ring-1 ring-emerald-100"
      : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {auditTone ? "Completeness audit" : "VSME schema execution"}
          </p>
          <p className="text-sm text-slate-700">
            {schema.standard} {schema.schemaVersion} · {fieldCount} fields ·
            employees {schema.employeeCount}
          </p>
        </div>
        {schema.moduleCInReportingScope ? (
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-800">
            C module in mandatory reporting scope
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            C module present · optional reporting scope (&lt;500 employees)
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Flow: decide materiality per field → enter data if material → validate
        completeness → export. Required = in scope × explicitly material.
      </p>

      {undecidedFieldCount > 0 ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {undecidedFieldCount} field
          {undecidedFieldCount === 1 ? "" : "s"} still need a reporting decision
          (amber cards below).
        </p>
      ) : null}

      {coverage ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric
              label="In-scope completeness"
              value={`${coverage.inScopeCoveragePercentage}%`}
              detail={
                completeness
                  ? `${completeness.completedFieldIds.filter((id) => completeness.inScopeFieldIds.includes(id)).length} / ${completeness.inScopeFieldIds.length}`
                  : undefined
              }
            />
            <Metric
              label="Material completeness"
              value={`${coverage.materialCoveragePercentage}%`}
              detail={
                completeness
                  ? `${completeness.completedFieldIds.filter((id) => completeness.materialFieldIds.includes(id)).length} / ${completeness.materialFieldIds.length}`
                  : undefined
              }
            />
            <Metric
              label="Required completeness"
              value={`${coverage.requiredCoveragePercentage}%`}
              detail={
                completeness
                  ? `${completeness.completedFieldIds.filter((id) => completeness.requiredFieldIds.includes(id)).length} / ${completeness.requiredFieldIds.length}`
                  : undefined
              }
            />
            <Metric
              label="Registry coverage"
              value={`${coverage.totalCoveragePercentage}%`}
              detail={`${coverage.fieldsReported} / ${coverage.totalFields}`}
            />
            <Metric
              label="Export"
              value={coverage.exportReady ? "Ready" : "Blocked"}
              detail={
                exportBlockingCount > 0
                  ? `${exportBlockingCount} blocking`
                  : undefined
              }
            />
          </div>

          {showMissingRequiredIndicator && missingRequiredCount > 0 ? (
            <p className="mt-3 text-sm text-amber-800">
              {missingRequiredCount} required field
              {missingRequiredCount === 1 ? "" : "s"} still missing (highlighted
              below).
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      {detail ? <p className="text-[10px] text-slate-500">{detail}</p> : null}
    </div>
  );
}
