import { repeatingStorageGroupId } from "./repeatingIntegrity";
import {
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
  disclosureDatapoints,
} from "./registry";
import type { RegistryValue, Vs2026Datapoint, Vs2026Disclosure } from "./registry/types";
import type { EditorControl, EditorNumberRule } from "./editorView";
import { validateStructuredWrite } from "./structuredInput";

/**
 * These identifiers also exist in the running VSME field catalogue.
 * The legacy entries are paragraph 79 cooperative items (number or string).
 * The VS 2026 entries are EFRAG guidance paragraph 15 (narrative or monetary).
 * Equal identifiers are not treated as the same fact.
 * A test fails if the overlap set changes, so a new collision cannot be edited
 * until it is added here.
 */
export const LEGACY_COLLIDING_DATAPOINT_IDS: readonly string[] = Object.freeze([
  "B2_COOPERATIVE_DISCLOSURES_COOP_INVESTMENT_SOCIAL_ECONOMY",
  "B2_COOPERATIVE_DISCLOSURES_COOP_PROFIT_DISTRIBUTION_LIMITS",
  "B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION",
]);

const LEGACY_COLLISIONS = new Set(LEGACY_COLLIDING_DATAPOINT_IDS);

const DISCLOSURES: readonly Vs2026Disclosure[] = [
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
];

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const INTEGER = /^(?:0|[1-9]\d*)$/;
const TEXT_LIMIT = 20_000;

export type UnavailableReason =
  | "LEGACY_IDENTIFIER_COLLISION"
  | "DERIVED"
  | "CALCULATED"
  | "DIGITAL_ONLY"
  | "REPEATING_OR_DIMENSIONED"
  | "UNSAFE_VALUE_SHAPE";

export type FieldDecision =
  | {
      editable: true;
      datapoint: Vs2026Datapoint;
      control: EditorControl;
      preparation: boolean;
    }
  | {
      editable: false;
      datapoint: Vs2026Datapoint;
      reason: UnavailableReason;
    };

const BY_ID = new Map<string, Vs2026Datapoint>();
for (const disclosure of DISCLOSURES) {
  for (const datapoint of disclosureDatapoints(disclosure, true)) {
    if (BY_ID.has(datapoint.id)) {
      throw new Error(`Duplicate VS 2026 datapoint id: ${datapoint.id}`);
    }
    BY_ID.set(datapoint.id, datapoint);
  }
}

export function registryDatapoint(id: string): Vs2026Datapoint | undefined {
  return BY_ID.get(id);
}

export function reasonLabel(reason: UnavailableReason): string {
  switch (reason) {
    case "LEGACY_IDENTIFIER_COLLISION":
      return "This identifier is also used by the running VSME workspace with a different definition. It is not overwritten.";
    case "DERIVED":
      return "This value is derived from the saved reporting option.";
    case "CALCULATED":
      return "Calculated outputs are not entered in this editor.";
    case "DIGITAL_ONLY":
      return "This digital output is not entered in this editor.";
    case "REPEATING_OR_DIMENSIONED":
      return "Repeating rows and dimensioned facts are not entered in this editor.";
    case "UNSAFE_VALUE_SHAPE":
      return "No verified input control exists for this value.";
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

export function classifyDatapoint(datapoint: Vs2026Datapoint): FieldDecision {
  if (LEGACY_COLLISIONS.has(datapoint.id)) {
    return { editable: false, datapoint, reason: "LEGACY_IDENTIFIER_COLLISION" };
  }
  if (datapoint.role === "DERIVED_FROM_REPORTING_CONFIGURATION") {
    return { editable: false, datapoint, reason: "DERIVED" };
  }
  if (datapoint.informationClass === "CALCULATED_FACT") {
    return { editable: false, datapoint, reason: "CALCULATED" };
  }
  if (datapoint.informationClass === "DIGITAL_FACT") {
    return { editable: false, datapoint, reason: "DIGITAL_ONLY" };
  }
  const kind = datapoint.value.kind;
  if (
    datapoint.repeatingGroupId ||
    repeatingStorageGroupId(datapoint) ||
    kind === "DIMENSIONED_QUANTITY" ||
    kind === "REPEATING_QUANTITY" ||
    kind === "REPEATING_REFERENCES" ||
    kind === "REPEATING_DIMENSIONED_QUANTITY" ||
    kind === "SITE_REFERENCE"
  ) {
    return { editable: false, datapoint, reason: "REPEATING_OR_DIMENSIONED" };
  }
  const control = controlFor(datapoint);
  if (!control) {
    return { editable: false, datapoint, reason: "UNSAFE_VALUE_SHAPE" };
  }
  return {
    editable: true,
    datapoint,
    control,
    preparation:
      datapoint.role === "PREPARATION_GUIDANCE" ||
      datapoint.informationClass === "PREPARATION_DATA" ||
      datapoint.applicability.kind === "GUIDANCE_OUTSIDE_ANNEX_I",
  };
}

export function editorDisclosures(): readonly Vs2026Disclosure[] {
  return DISCLOSURES;
}

export type ScalarWriteValidation =
  | { ok: true; value: string | null; unit: string | null }
  | { ok: false; code: "NOT_EDITABLE" | "INVALID_VALUE" | "INVALID_ENUMERATION"; message: string };

/**
 * Validate a scalar write from the canonical datapoint.
 * Null and blank input clear the stored fact. They do not become zero or false.
 */
export function validateScalarWrite(
  datapoint: Vs2026Datapoint,
  raw: string | null,
): ScalarWriteValidation {
  const decision = classifyDatapoint(datapoint);
  if (!decision.editable) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message: reasonLabel(decision.reason),
    };
  }
  const structured = validateStructuredWrite(datapoint, raw);
  if (structured) {
    if (!structured.ok) {
      return structured;
    }
    return { ok: true, value: structured.value, unit: null };
  }
  if (raw === null || raw.trim() === "") {
    return { ok: true, value: null, unit: null };
  }
  const trimmed = raw.trim();
  if (trimmed.length > TEXT_LIMIT) {
    return { ok: false, code: "INVALID_VALUE", message: "The value is too long." };
  }

  const value = datapoint.value;
  if (value.kind === "TEXT" || value.kind === "NARRATIVE") {
    return { ok: true, value: trimmed, unit: null };
  }
  if (value.kind === "BOOLEAN") {
    if (trimmed !== "true" && trimmed !== "false") {
      return { ok: false, code: "INVALID_VALUE", message: "Choose yes, no, or leave the field unanswered." };
    }
    return { ok: true, value: trimmed, unit: null };
  }
  if (value.kind === "ENUMERATION") {
    if (!value.members.some((member) => member.id === trimmed)) {
      return {
        ok: false,
        code: "INVALID_ENUMERATION",
        message: "Choose one of the listed values.",
      };
    }
    return { ok: true, value: trimmed, unit: null };
  }
  if (value.kind === "MONETARY" || numberRule(value)) {
    const rule = value.kind === "MONETARY" ? monetaryRule() : numberRule(value);
    if (!rule) {
      return { ok: false, code: "NOT_EDITABLE", message: reasonLabel("UNSAFE_VALUE_SHAPE") };
    }
    if (!DECIMAL.test(trimmed) || !Number.isFinite(Number(trimmed))) {
      return { ok: false, code: "INVALID_VALUE", message: "Enter a number, or leave the field empty." };
    }
    if (rule.integer && !INTEGER.test(trimmed)) {
      return { ok: false, code: "INVALID_VALUE", message: "Enter a whole number, or leave the field empty." };
    }
    const parsed = Number(trimmed);
    if (rule.minimum !== null && parsed < rule.minimum) {
      return { ok: false, code: "INVALID_VALUE", message: "The number is below the accepted range." };
    }
    if (rule.maximum !== null && parsed > rule.maximum) {
      return { ok: false, code: "INVALID_VALUE", message: "The number is above the accepted range." };
    }
    return { ok: true, value: trimmed, unit: storedUnit(value) };
  }
  return { ok: false, code: "NOT_EDITABLE", message: reasonLabel("UNSAFE_VALUE_SHAPE") };
}

function controlFor(datapoint: Vs2026Datapoint): EditorControl | null {
  if (datapoint.id === "B1_LEGAL_FORM") {
    return { kind: "legalForm" };
  }
  if (datapoint.id === "B1_NACE_CODES") {
    return { kind: "naceCodes" };
  }
  if (datapoint.id === "B4_PUBLIC_DISCLOSURE_URL") {
    return { kind: "url" };
  }
  const value = datapoint.value;
  switch (value.kind) {
    case "TEXT":
      return { kind: "text" };
    case "NARRATIVE":
      return { kind: "narrative" };
    case "BOOLEAN":
      return { kind: "boolean" };
    case "MONETARY":
      return { kind: "monetary" };
    case "ENUMERATION":
      if (value.members.length === 0) {
        return null;
      }
      return {
        kind: "enumeration",
        members: value.members.map((member) => ({ id: member.id, legalText: member.legalText })),
      };
    case "PERCENTAGE":
    case "PROPORTION": {
      const rule = numberRule(value);
      return rule ? { kind: "percentage", rule } : null;
    }
    default: {
      const rule = numberRule(value);
      if (!rule) {
        return null;
      }
      return { kind: "number", rule };
    }
  }
}

function monetaryRule(): EditorNumberRule {
  return { integer: false, minimum: null, maximum: null, unitLabel: "Reporting currency" };
}

function numberRule(value: RegistryValue): EditorNumberRule | null {
  switch (value.kind) {
    case "NUMBER":
    case "QUANTITY":
    case "PROPORTION":
    case "WORKFORCE_COUNT":
    case "ACCIDENT_RATE":
    case "HOURS_WORKED":
    case "HOURS_AVERAGE":
      return {
        integer: false,
        minimum: null,
        maximum: null,
        unitLabel: unitLabel(value),
      };
    case "COUNT":
      return { integer: true, minimum: 0, maximum: null, unitLabel: null };
    case "PERCENTAGE":
      return value.bounds === "ZERO_TO_100"
        ? { integer: false, minimum: 0, maximum: 100, unitLabel: "Percent" }
        : { integer: false, minimum: null, maximum: null, unitLabel: "Percent" };
    default:
      return null;
  }
}

function unitLabel(value: RegistryValue): string | null {
  switch (value.kind) {
    case "QUANTITY":
      if (value.reportedUnit === "WEIGHT") {
        return "Weight, in the reported unit. No conversion is applied.";
      }
      if (value.reportedUnit === "VOLUME") {
        return "Volume, in the reported unit. No conversion is applied.";
      }
      return value.reportedUnit;
    case "PROPORTION":
    case "PERCENTAGE":
      return "Percent";
    case "HOURS_WORKED":
      return "Hours";
    case "HOURS_AVERAGE":
      return "Hours per employee";
    default:
      return null;
  }
}

function storedUnit(value: RegistryValue): string | null {
  if (value.kind !== "QUANTITY") {
    return null;
  }
  if (value.reportedUnit === "MWh" || value.reportedUnit === "tCO2eq" || value.reportedUnit === "m3") {
    return value.reportedUnit;
  }
  return null;
}
