import { isIso3166Alpha2 } from "./iso3166Alpha2";
import type { Vs2026Datapoint } from "./registry/types";

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const NACE_CODE = /^(?:0[1-9]|[1-9]\d)(?:\.\d|\.\d\d)?$/;
const LEGAL_FORM_LIMIT = 300;
const POLLUTANT_LIMIT = 200;

export type StructuredWrite =
  | { ok: true; value: string | null }
  | { ok: false; code: "INVALID_VALUE"; message: string };

/** Returns null when the datapoint is not one of the structured shapes. */
export function validateStructuredWrite(
  datapoint: Vs2026Datapoint,
  raw: string | null,
): StructuredWrite | null {
  if (datapoint.id === "B1_LEGAL_FORM") {
    return validateLegalForm(raw);
  }
  if (datapoint.id === "B1_NACE_CODES") {
    return validateNaceCodes(raw);
  }
  if (datapoint.id === "B4_PUBLIC_DISCLOSURE_URL") {
    return validatePublicUrl(raw);
  }
  if (datapoint.id === "B1_SITE_COUNTRY" || datapoint.value.kind === "COUNTRY_CODE") {
    return validateCountryCode(raw);
  }
  if (datapoint.value.kind === "GPS_LOCATION") {
    return validateGeolocation(raw);
  }
  if (datapoint.id === "B4_POLLUTANT_IDENTITY") {
    return validatePollutantIdentity(raw);
  }
  return null;
}

export function validateLegalForm(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const value = raw.trim();
  if (value.length > LEGAL_FORM_LIMIT) {
    return { ok: false, code: "INVALID_VALUE", message: "The legal form is too long." };
  }
  return { ok: true, value };
}

/**
 * Serialization contract: a compact JSON array of distinct NACE Rev. 2
 * division, group, or class codes, in the order entered.
 * Example: ["01.11","10.20"]. A comma-separated string is rejected.
 * Codes are not padded and unknown codes are not rewritten.
 */
export function validateNaceCodes(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      code: "INVALID_VALUE",
      message: "Enter NACE codes as separate codes. A comma-separated line is not accepted.",
    };
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 40) {
    return { ok: false, code: "INVALID_VALUE", message: "Enter one or more NACE codes." };
  }
  const codes: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string" || !NACE_CODE.test(item)) {
      return {
        ok: false,
        code: "INVALID_VALUE",
        message: "Each NACE code must be a division, group, or class code such as 01, 01.1, or 01.11.",
      };
    }
    if (codes.includes(item)) {
      return { ok: false, code: "INVALID_VALUE", message: "Each NACE code can be entered once." };
    }
    codes.push(item);
  }
  return { ok: true, value: JSON.stringify(codes) };
}

export function validateCountryCode(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const value = raw.trim().toUpperCase();
  if (!isIso3166Alpha2(value)) {
    return {
      ok: false,
      code: "INVALID_VALUE",
      message: "Choose an ISO 3166-1 alpha-2 country code.",
    };
  }
  return { ok: true, value };
}

/**
 * Point coordinates only. Stored as `latitude,longitude` using the entered
 * decimal tokens. A polygon or a single coordinate is not stored.
 */
export function validateGeolocation(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const parts = raw.split(",");
  if (parts.length !== 2) {
    return {
      ok: false,
      code: "INVALID_VALUE",
      message: "Enter latitude and longitude. A polygon is not stored.",
    };
  }
  const latitude = parts[0]?.trim() ?? "";
  const longitude = parts[1]?.trim() ?? "";
  if (!DECIMAL.test(latitude) || !DECIMAL.test(longitude)) {
    return { ok: false, code: "INVALID_VALUE", message: "Enter decimal latitude and longitude." };
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, code: "INVALID_VALUE", message: "Latitude must be between -90 and 90." };
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { ok: false, code: "INVALID_VALUE", message: "Longitude must be between -180 and 180." };
  }
  return { ok: true, value: `${latitude},${longitude}` };
}

export function validatePublicUrl(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const value = raw.trim();
  if (/\s/.test(value)) {
    return { ok: false, code: "INVALID_VALUE", message: "Enter one http or https URL." };
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, code: "INVALID_VALUE", message: "Enter one http or https URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "INVALID_VALUE", message: "Only an http or https URL can be stored." };
  }
  if (url.username !== "" || url.password !== "" || url.hostname === "") {
    return { ok: false, code: "INVALID_VALUE", message: "Enter a public http or https URL without embedded credentials." };
  }
  return { ok: true, value };
}

export function validatePollutantIdentity(raw: string | null): StructuredWrite {
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  const value = raw.trim();
  if (value.length > POLLUTANT_LIMIT) {
    return { ok: false, code: "INVALID_VALUE", message: "The pollutant identity is too long." };
  }
  return { ok: true, value };
}

export type OmissionWorkflowStatus =
  | "DRAFT"
  | "REASSESSMENT_REQUIRED"
  | "INCOMPLETE"
  | "STRUCTURALLY_COMPLETE";

export function omissionWorkflowStatus(input: {
  conditionsAssessed: boolean;
  reassessedForPeriod: boolean;
}): OmissionWorkflowStatus {
  if (input.conditionsAssessed && input.reassessedForPeriod) {
    return "STRUCTURALLY_COMPLETE";
  }
  if (input.conditionsAssessed) {
    return "REASSESSMENT_REQUIRED";
  }
  if (input.reassessedForPeriod) {
    return "INCOMPLETE";
  }
  return "DRAFT";
}
