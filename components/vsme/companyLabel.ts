import type { CompanyRecord } from "./queries/types";

export function companyLabel(company: CompanyRecord): string {
  const name = (company.name ?? "").trim();
  if (name) {
    return name;
  }
  return `Company …${company.id.slice(-6)}`;
}
