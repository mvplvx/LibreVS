"use client";

import Link from "next/link";
import { CreateReportingPeriodCta } from "./CreateReportingPeriodCta";
import type { CompanyRecord, ReportingPeriodRecord } from "./queries/types";

type VsmeWorkspaceFallbackProps = {
  companies: CompanyRecord[];
  company: CompanyRecord | null;
  periods: ReportingPeriodRecord[];
  onCreated?: (periodId: string) => void;
};

export function VsmeWorkspaceFallback({
  companies,
  company,
  periods,
  onCreated,
}: VsmeWorkspaceFallbackProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm font-medium text-slate-900">No companies yet</p>
        <p className="mt-1 text-sm text-slate-600">
          Run{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">npm run db:seed</code>{" "}
          to create the demo organization and company, or add a company via the API.
        </p>
        <Link
          href="/system/health"
          className="mt-3 inline-block text-sm font-medium text-slate-700 underline"
        >
          View system diagnostics
        </Link>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Select a company to continue VSME reporting.
      </div>
    );
  }

  if (company.employeeCount == null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Employee count not set</p>
        <p className="mt-1">
          Module scope (B vs C) depends on employee count. Update the company profile
          before reporting.
        </p>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
        <p className="text-sm font-medium text-slate-900">
          No reporting periods for {company.name}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          No reporting periods exist yet. Create a reporting period to begin VSME
          reporting for this company.
        </p>
        {onCreated ? (
          <div className="mt-4">
            <CreateReportingPeriodCta
              companyId={company.id}
              companyName={company.name}
              existingYears={periods.map((p) => p.year)}
              onCreated={onCreated}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
