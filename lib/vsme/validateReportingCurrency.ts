import { parseReportingCurrency } from "./currency";

/** Parse and validate company reporting currency for API persistence. */
export function validateReportingCurrencyInput(
  value: unknown
): { ok: true; currency: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "currency must be a non-empty ISO code" };
  }
  const parsed = parseReportingCurrency(value);
  if (parsed !== value.trim().toUpperCase()) {
    return {
      ok: false,
      error: `currency must be one of the supported EU reporting currencies`,
    };
  }
  return { ok: true, currency: parsed };
}
