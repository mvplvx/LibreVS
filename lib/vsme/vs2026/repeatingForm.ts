import { repeatingStorageGroupId, siteReferencingGroupIds } from "./repeatingIntegrity";
import { disclosureDatapoints } from "./registry";
import type { RegistryValue, Vs2026Datapoint, Vs2026Disclosure } from "./registry/types";
import { classifyDatapoint, editorDisclosures, LEGACY_COLLIDING_DATAPOINT_IDS } from "./scalarEligibility";
import type { EditorControl, EditorNumberRule } from "./editorView";
import { validateStructuredWrite } from "./structuredInput";

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const INTEGER = /^(?:0|[1-9]\d*)$/;
const TEXT_LIMIT = 20_000;

export const OMISSION_GROUP_ID = "B1_OMITTED_DISCLOSURES";

const LEGACY_COLLISIONS = new Set<string>(LEGACY_COLLIDING_DATAPOINT_IDS);

export type CoverageClass =
  | "EDITABLE_SCALAR"
  | "EDITABLE_REPEATING"
  | "EDITABLE_DIMENSIONED"
  | "PREPARATION_INPUT"
  | "DERIVED"
  | "CALCULATED"
  | "DIGITAL_ONLY"
  | "BLOCKED_UNVERIFIED_CONTROL"
  | "BLOCKED_LEGACY_COLLISION"
  | "DEFERRED_LEGAL_WORKFLOW";

export type RepeatingCellDecision =
  | {
      editable: true;
      control: EditorControl;
      unit: string | null;
      preparation: boolean;
    }
  | { editable: false; reason: "UNSAFE_VALUE_SHAPE" | "DIGITAL_ONLY" | "SITE_MANAGED" };

export function energyOriginMembers(datapoint: Vs2026Datapoint): readonly string[] {
  if (datapoint.value.kind !== "DIMENSIONED_QUANTITY") {
    return [];
  }
  const origin = datapoint.value.axes.find((axis) => axis.id === "ENERGY_ORIGIN");
  return origin?.legalMembers ?? [];
}

export function isSingletonGroup(groupId: string): boolean {
  return (
    groupId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" ||
    groupId === "B3_ENERGY_CONSUMPTION_FROM_FUELS" ||
    groupId === "B3_SCOPE3_SIGNIFICANT_CATEGORIES"
  );
}

export function isScope3Group(groupId: string): boolean {
  return groupId === "B3_SCOPE3_SIGNIFICANT_CATEGORIES";
}

export function isEnergyGroup(groupId: string): boolean {
  return (
    groupId === "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY" ||
    groupId === "B3_ENERGY_CONSUMPTION_FROM_FUELS"
  );
}

export function supportedRepeatingGroupIds(): readonly string[] {
  const fromRegistry = editorDisclosures().flatMap((disclosure) =>
    disclosure.repeatingGroups.map((group) => group.id),
  );
  return [
    ...fromRegistry,
    "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
    "B3_ENERGY_CONSUMPTION_FROM_FUELS",
    "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
  ];
}

export function repeatingGroupIsSupported(groupId: string): boolean {
  return supportedRepeatingGroupIds().includes(groupId);
}

export function siteReferenceDatapointId(groupId: string): string | null {
  for (const disclosure of editorDisclosures()) {
    const group = disclosure.repeatingGroups.find((item) => item.id === groupId);
    const component = group?.components.find((item) => item.value.kind === "SITE_REFERENCE");
    if (component) {
      return component.id;
    }
  }
  return null;
}

export function classifyRepeatingCell(datapoint: Vs2026Datapoint): RepeatingCellDecision {
  if (datapoint.informationClass === "DIGITAL_FACT") {
    return { editable: false, reason: "DIGITAL_ONLY" };
  }
  if (datapoint.value.kind === "SITE_REFERENCE") {
    return { editable: false, reason: "SITE_MANAGED" };
  }
  const control = controlFor(datapoint);
  if (!control) {
    return { editable: false, reason: "UNSAFE_VALUE_SHAPE" };
  }
  return {
    editable: true,
    control,
    unit: storedUnit(datapoint.value),
    preparation:
      datapoint.role === "PREPARATION_GUIDANCE" ||
      datapoint.informationClass === "PREPARATION_DATA",
  };
}

export function classifyCoverage(datapoint: Vs2026Datapoint): CoverageClass {
  if (datapoint.id === OMISSION_GROUP_ID || repeatingStorageGroupId(datapoint) === OMISSION_GROUP_ID) {
    return "DEFERRED_LEGAL_WORKFLOW";
  }
  if (LEGACY_COLLISIONS.has(datapoint.id)) {
    return "BLOCKED_LEGACY_COLLISION";
  }
  if (datapoint.role === "DERIVED_FROM_REPORTING_CONFIGURATION") {
    return "DERIVED";
  }
  if (datapoint.informationClass === "CALCULATED_FACT") {
    return "CALCULATED";
  }
  if (datapoint.informationClass === "DIGITAL_FACT") {
    return "DIGITAL_ONLY";
  }
  const storageGroup = repeatingStorageGroupId(datapoint);
  if (storageGroup) {
    if (datapoint.value.kind === "DIMENSIONED_QUANTITY" && energyOriginMembers(datapoint).length > 0) {
      return "EDITABLE_DIMENSIONED";
    }
    const cell = classifyRepeatingCell(datapoint);
    if (!cell.editable && cell.reason !== "SITE_MANAGED") {
      return "BLOCKED_UNVERIFIED_CONTROL";
    }
    if (cell.editable && cell.preparation) {
      return "PREPARATION_INPUT";
    }
    return "EDITABLE_REPEATING";
  }
  const scalar = classifyDatapoint(datapoint);
  if (!scalar.editable) {
    return "BLOCKED_UNVERIFIED_CONTROL";
  }
  if (scalar.preparation) {
    return "PREPARATION_INPUT";
  }
  return "EDITABLE_SCALAR";
}

export function coverageInventory(): { id: string; disclosureId: string; coverage: CoverageClass; requirementType: string }[] {
  return editorDisclosures().flatMap((disclosure) =>
    disclosureDatapoints(disclosure, true).map((datapoint) => ({
      id: datapoint.id,
      disclosureId: disclosure.id,
      coverage: classifyCoverage(datapoint),
      requirementType: datapoint.requirementType,
    })),
  );
}

export type RepeatingValueValidation =
  | { ok: true; value: string | null; unit: string | null; dimensionMember: string }
  | { ok: false; code: "NOT_EDITABLE" | "INVALID_VALUE" | "INVALID_ENUMERATION" | "INVALID_DIMENSION"; message: string };

export function validateRepeatingValue(input: {
  datapoint: Vs2026Datapoint;
  raw: string | null;
  dimensionMember: string | null;
  categoryKey?: string | null;
}): RepeatingValueValidation {
  const structured = validateStructuredWrite(input.datapoint, input.raw);
  const decision = classifyRepeatingCell(input.datapoint);
  if (!decision.editable) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        decision.reason === "SITE_MANAGED"
          ? "Choose the B1 site for this row. The site reference is not typed separately."
          : decision.reason === "DIGITAL_ONLY"
            ? "This digital output is not entered in this editor."
            : "No verified input control exists for this value.",
    };
  }
  const dimension = resolveDimension(input.datapoint, input.dimensionMember, input.categoryKey);
  if (!dimension.ok) {
    return dimension;
  }
  if (structured) {
    if (!structured.ok) {
      return structured;
    }
    return {
      ok: true,
      value: structured.value,
      unit: structured.value === null ? null : decision.unit,
      dimensionMember: dimension.member,
    };
  }
  if (input.raw === null || input.raw.trim() === "") {
    return { ok: true, value: null, unit: null, dimensionMember: dimension.member };
  }
  const trimmed = input.raw.trim();
  if (trimmed.length > TEXT_LIMIT) {
    return { ok: false, code: "INVALID_VALUE", message: "The value is too long." };
  }
  const value = input.datapoint.value;
  if (value.kind === "TEXT" || value.kind === "NARRATIVE") {
    return { ok: true, value: trimmed, unit: null, dimensionMember: dimension.member };
  }
  if (value.kind === "BOOLEAN") {
    if (trimmed !== "true" && trimmed !== "false") {
      return { ok: false, code: "INVALID_VALUE", message: "Choose yes, no, or leave the field unanswered." };
    }
    return { ok: true, value: trimmed, unit: null, dimensionMember: dimension.member };
  }
  if (value.kind === "ENUMERATION") {
    if (!value.members.some((member) => member.id === trimmed)) {
      return { ok: false, code: "INVALID_ENUMERATION", message: "Choose one of the listed values." };
    }
    return { ok: true, value: trimmed, unit: null, dimensionMember: dimension.member };
  }
  const rule = numberRule(value);
  if (!rule || !DECIMAL.test(trimmed) || !Number.isFinite(Number(trimmed))) {
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
  return { ok: true, value: trimmed, unit: decision.unit, dimensionMember: dimension.member };
}

export function groupForDisclosure(disclosure: Vs2026Disclosure): { id: string; statement: string; usesSite: boolean }[] {
  return disclosure.repeatingGroups.map((group) => ({
    id: group.id,
    statement: group.regulatoryStatement,
    usesSite: group.siteInventory === "B1_SITE" || siteReferencingGroupIds().includes(group.id),
  }));
}

function resolveDimension(
  datapoint: Vs2026Datapoint,
  dimensionMember: string | null,
  categoryKey: string | null | undefined,
): { ok: true; member: string } | { ok: false; code: "INVALID_DIMENSION"; message: string } {
  if (datapoint.value.kind === "DIMENSIONED_QUANTITY") {
    const member = (dimensionMember ?? "").trim();
    if (!energyOriginMembers(datapoint).includes(member)) {
      return { ok: false, code: "INVALID_DIMENSION", message: "Choose a verified energy-origin member." };
    }
    return { ok: true, member };
  }
  if (isScope3Group(datapoint.id)) {
    const member = (categoryKey ?? dimensionMember ?? "").trim();
    if (member === "" || member.length > 200) {
      return {
        ok: false,
        code: "INVALID_DIMENSION",
        message: "Enter the significant category identity assessed by the undertaking.",
      };
    }
    return { ok: true, member };
  }
  return { ok: true, member: "" };
}

function controlFor(datapoint: Vs2026Datapoint): EditorControl | null {
  if (datapoint.id === "B1_SITE_COUNTRY" || datapoint.value.kind === "COUNTRY_CODE") {
    return { kind: "country" };
  }
  if (datapoint.value.kind === "GPS_LOCATION") {
    return { kind: "coordinates" };
  }
  if (datapoint.id === "B4_POLLUTANT_IDENTITY") {
    return { kind: "pollutantName" };
  }
  const value = datapoint.value;
  switch (value.kind) {
    case "TEXT":
      return { kind: "text" };
    case "NARRATIVE":
      return { kind: "narrative" };
    case "BOOLEAN":
      return { kind: "boolean" };
    case "ENUMERATION":
      if (value.members.length === 0) {
        return null;
      }
      return {
        kind: "enumeration",
        members: value.members.map((member) => ({ id: member.id, legalText: member.legalText })),
      };
    case "QUANTITY":
    case "REPEATING_QUANTITY":
    case "REPEATING_DIMENSIONED_QUANTITY":
    case "DIMENSIONED_QUANTITY":
    case "WORKFORCE_COUNT":
    case "COUNT":
    case "NUMBER":
    case "PROPORTION": {
      const rule = numberRule(value);
      if (!rule) {
        return null;
      }
      if (value.kind === "PROPORTION") {
        return { kind: "percentage", rule };
      }
      return { kind: "number", rule };
    }
    default:
      return null;
  }
}

function numberRule(value: RegistryValue): EditorNumberRule | null {
  switch (value.kind) {
    case "COUNT":
      return { integer: true, minimum: 0, maximum: null, unitLabel: null };
    case "QUANTITY":
    case "REPEATING_QUANTITY":
    case "REPEATING_DIMENSIONED_QUANTITY":
    case "DIMENSIONED_QUANTITY":
    case "WORKFORCE_COUNT":
    case "NUMBER":
    case "PROPORTION":
      return { integer: false, minimum: null, maximum: null, unitLabel: unitLabel(value) };
    default:
      return null;
  }
}

function unitLabel(value: RegistryValue): string | null {
  if (!("reportedUnit" in value)) {
    return null;
  }
  if (value.reportedUnit === "WEIGHT") {
    return "Weight, in the reported unit. No conversion is applied.";
  }
  if (value.reportedUnit === "VOLUME" || value.reportedUnit === "MASS_AS_REPORTED") {
    return "Quantity as reported. No conversion is applied.";
  }
  if (value.reportedUnit === "PERCENT") {
    return "Percent";
  }
  return value.reportedUnit;
}

function storedUnit(value: RegistryValue): string | null {
  if (!("reportedUnit" in value)) {
    return null;
  }
  if (value.reportedUnit === "MWh" || value.reportedUnit === "tCO2eq" || value.reportedUnit === "m3") {
    return value.reportedUnit;
  }
  return null;
}
