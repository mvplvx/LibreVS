"use client";

import type { CompanyRecord, ReportingPeriodRecord } from "./queries/types";
import { companyLabel } from "./companyLabel";
import {
  EU_REPORTING_CURRENCIES,
  parseReportingCurrency,
  type EuReportingCurrency,
} from "@/lib/vsme/currency";

type VsmeWorkspaceSelectorsProps = {
  companies: CompanyRecord[];
  company: CompanyRecord | null;
  employeeCount: number;
  reportingCurrency: EuReportingCurrency;
  periods: ReportingPeriodRecord[];
  periodId: string;
  onCompanyChange: (companyId: string) => void;
  onPeriodChange: (periodId: string) => void;
  onCurrencyChange?: (currency: EuReportingCurrency) => void;
  currencySaving?: boolean;
  /** Show employee count line under company (VSME page). */
  showScopeHint?: boolean;
};

export function VsmeWorkspaceSelectors({
  companies,
  company,
  employeeCount,
  reportingCurrency,
  periods,
  periodId,
  onCompanyChange,
  onPeriodChange,
  onCurrencyChange,
  currencySaving = false,
  showScopeHint = false,
}: VsmeWorkspaceSelectorsProps) {
  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Company</p>
        {company ? (
          <>
            {companies.length > 1 ? (
              <select
                value={company.id}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {companyLabel(c)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 font-medium">{companyLabel(company)}</p>
            )}
            {showScopeHint ? (
              <p className="mt-1 text-xs text-slate-500">
                {company.employeeCount != null ? (
                  <>
                    Employees: {employeeCount}
                    {employeeCount >= 500
                      ? " · C module in mandatory scope"
                      : " · C module optional"}
                  </>
                ) : (
                  <span className="text-amber-700">
                    Employee count not set — B module only until configured
                  </span>
                )}
              </p>
            ) : company.employeeCount != null ? (
              <p className="mt-1 text-xs text-slate-500">
                Employees: {company.employeeCount}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-700">Employee count not set</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">No company</p>
        )}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Reporting currency
        </p>
        {company && onCurrencyChange ? (
          <select
            value={reportingCurrency}
            disabled={currencySaving}
            onChange={(e) =>
              onCurrencyChange(parseReportingCurrency(e.target.value))
            }
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
            aria-label="Reporting currency"
          >
            {EU_REPORTING_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1 text-sm text-slate-600">{reportingCurrency}</p>
        )}
        <p className="mt-1 text-[10px] text-slate-500">
          Display and export metadata only — no FX conversion.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Reporting period
        </p>
        {periods.length > 0 ? (
          <select
            value={periodId}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.year} ({p.status})
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No reporting periods</p>
        )}
      </div>
    </>
  );
}
