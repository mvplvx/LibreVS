"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompanies } from "./useCompanies";
import { useReportingPeriods } from "./useReportingPeriods";
import { pickActiveCompany } from "./pickActiveCompany";
import type { CompanyRecord, ReportingPeriodRecord } from "./types";

const EMPTY_COMPANIES: CompanyRecord[] = [];
const EMPTY_PERIODS: ReportingPeriodRecord[] = [];

export function useVsmeWorkspace() {
  const companiesQuery = useCompanies();
  const periodsQuery = useReportingPeriods();

  const companies = companiesQuery.data ?? EMPTY_COMPANIES;
  const allPeriods = periodsQuery.data ?? EMPTY_PERIODS;

  const suggestedCompany = useMemo(
    () => pickActiveCompany(companies, allPeriods),
    [companies, allPeriods]
  );

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  useEffect(() => {
    if (!suggestedCompany) {
      setSelectedCompanyId((id) => (id === "" ? id : ""));
      return;
    }
    if (
      !selectedCompanyId ||
      !companies.some((c) => c.id === selectedCompanyId)
    ) {
      setSelectedCompanyId(suggestedCompany.id);
    }
  }, [suggestedCompany, selectedCompanyId, companies]);

  const company =
    companies.find((c) => c.id === selectedCompanyId) ?? suggestedCompany;

  const periods = useMemo(() => {
    if (!company) {
      return allPeriods;
    }
    return allPeriods.filter((p) => p.companyId === company.id);
  }, [allPeriods, company]);

  useEffect(() => {
    if (periods.length === 0) {
      setSelectedPeriodId((id) => (id === "" ? id : ""));
      return;
    }
    if (!periods.some((p) => p.id === selectedPeriodId)) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const employeeCount = company?.employeeCount ?? 0;

  const isLoading = companiesQuery.isLoading || periodsQuery.isLoading;

  const error =
    companiesQuery.error?.message ?? periodsQuery.error?.message ?? null;

  return {
    companies,
    company,
    employeeCount,
    periods,
    periodId: selectedPeriodId,
    setCompanyId: setSelectedCompanyId,
    setPeriodId: setSelectedPeriodId,
    isLoading,
    error,
  };
}

export type { CompanyRecord, ReportingPeriodRecord };
