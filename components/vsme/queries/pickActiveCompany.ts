import type { CompanyRecord, ReportingPeriodRecord } from "./types";

/**
 * Prefer a company that has reporting periods so dashboard/VSME load with data.
 * Tie-break: most periods, then non-empty name, then stable id.
 */
export function pickActiveCompany(
  companies: CompanyRecord[],
  periods: ReportingPeriodRecord[]
): CompanyRecord | null {
  if (companies.length === 0) {
    return null;
  }

  const periodCountByCompany = new Map<string, number>();
  for (const period of periods) {
    periodCountByCompany.set(
      period.companyId,
      (periodCountByCompany.get(period.companyId) ?? 0) + 1
    );
  }

  const ranked = [...companies].sort((a, b) => {
    const countA = periodCountByCompany.get(a.id) ?? 0;
    const countB = periodCountByCompany.get(b.id) ?? 0;
    if (countB !== countA) {
      return countB - countA;
    }
    const nameA = (a.name ?? "").trim();
    const nameB = (b.name ?? "").trim();
    if (nameB !== nameA) {
      return nameB.localeCompare(nameA);
    }
    return a.id.localeCompare(b.id);
  });

  return ranked[0];
}
