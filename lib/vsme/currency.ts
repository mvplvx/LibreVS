/** EU reporting currencies (display/export metadata only — no FX). */
export const EU_REPORTING_CURRENCIES = [
  "EUR",
  "SEK",
  "DKK",
  "NOK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
] as const;

export type EuReportingCurrency = (typeof EU_REPORTING_CURRENCIES)[number];

export const DEFAULT_REPORTING_CURRENCY: EuReportingCurrency = "EUR";

export function parseReportingCurrency(
  value: string | null | undefined
): EuReportingCurrency {
  const upper = value?.trim().toUpperCase();
  if (upper && (EU_REPORTING_CURRENCIES as readonly string[]).includes(upper)) {
    return upper as EuReportingCurrency;
  }
  return DEFAULT_REPORTING_CURRENCY;
}

export function isMonetaryUnit(unit: string | null | undefined): boolean {
  if (!unit) {
    return false;
  }
  const u = unit.trim().toUpperCase();
  return (
    u === "EUR" ||
    u.endsWith("_EUR") ||
    (EU_REPORTING_CURRENCIES as readonly string[]).includes(u)
  );
}
