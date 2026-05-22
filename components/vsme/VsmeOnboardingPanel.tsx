"use client";

import { CreateReportingPeriodCta } from "./CreateReportingPeriodCta";
import type { CompanyRecord, ReportingPeriodRecord } from "./queries/types";

type VsmeOnboardingPanelProps = {
  companies: CompanyRecord[];
  company: CompanyRecord | null;
  periods: ReportingPeriodRecord[];
  onPeriodCreated: (periodId: string) => void;
};

export function VsmeOnboardingPanel({
  companies,
  company,
  periods,
  onPeriodCreated,
}: VsmeOnboardingPanelProps) {
  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <p className="text-lg font-medium text-amber-900">No companies available</p>
        <p className="mt-2 text-sm text-amber-800">
          Run the test seed to create pilot companies:{" "}
          <code className="rounded bg-amber-100 px-1">npm run seed:test</code>
        </p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-medium text-slate-800">Select a company</p>
        <p className="mt-2 text-sm text-slate-600">
          Choose a company above to continue VSME reporting.
        </p>
      </div>
    );
  }

  if (company.employeeCount == null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-6">
        <p className="font-medium text-amber-900">Employee count not set</p>
        <p className="mt-1 text-sm text-amber-800">
          Module scope (B vs C) requires an employee count on the company record.
          Reporting can continue with B-module defaults (C optional).
        </p>
        {periods.length === 0 ? (
          <div className="mt-4">
            <CreateReportingPeriodCta
              companyId={company.id}
              companyName={company.name}
              existingYears={[]}
              onCreated={onPeriodCreated}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <CreateReportingPeriodCta
        companyId={company.id}
        companyName={company.name}
        existingYears={[]}
        onCreated={onPeriodCreated}
      />
    );
  }

  return null;
}
