import type { VsmeRegistryEntry } from "./vsme.fieldRegistry";

export type FieldValueValidationResult =
  | { ok: true; normalizedValue: string; unit: string | null }
  | { ok: false; error: string };

function parseBoolean(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(v)) return true;
  if (["false", "0", "no"].includes(v)) return false;
  return null;
}

export function validateFieldValue(
  entry: VsmeRegistryEntry,
  value: string,
  unit?: string | null
): FieldValueValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "value must not be empty" };
  }

  let normalizedValue: string;

  switch (entry.type) {
    case "number": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        return {
          ok: false,
          error: `field ${entry.fieldId} requires a numeric value`,
        };
      }
      normalizedValue = String(n);
      break;
    }
    case "boolean": {
      const b = parseBoolean(trimmed);
      if (b === null) {
        return {
          ok: false,
          error: `field ${entry.fieldId} requires a boolean value (true/false)`,
        };
      }
      normalizedValue = b ? "true" : "false";
      break;
    }
    case "string":
    default:
      normalizedValue = trimmed;
      break;
  }

  const registryUnit = entry.unit;
  if (registryUnit) {
    if (unit == null || unit === "") {
      return {
        ok: false,
        error: `field ${entry.fieldId} requires unit "${registryUnit}"`,
      };
    }
    if (unit !== registryUnit) {
      return {
        ok: false,
        error: `field ${entry.fieldId} requires unit "${registryUnit}", got "${unit}"`,
      };
    }
    return { ok: true, normalizedValue, unit: registryUnit };
  }

  if (unit != null && unit !== "") {
    return {
      ok: false,
      error: `field ${entry.fieldId} does not accept a unit`,
    };
  }

  return { ok: true, normalizedValue, unit: null };
}
