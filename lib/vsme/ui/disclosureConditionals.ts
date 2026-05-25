import type { VsmeFieldValue } from "@/components/vsme/types";

function fieldValue(
  values: Record<string, VsmeFieldValue>,
  fieldId: string
): string {
  return values[fieldId]?.value ?? "";
}

function isYes(values: Record<string, VsmeFieldValue>, fieldId: string): boolean {
  return fieldValue(values, fieldId) === "true";
}

const C6_GATE_SUFFIX = "CODE_OF_CONDUCT_OR_HUMAN_RIGHTS_POLICY";
const C6_CHILD_SUFFIXES = [
  "COVERS_CHILD_LABOUR",
  "COVERS_FORCED_LABOUR",
  "COVERS_HUMAN_TRAFFICKING",
  "COVERS_DISCRIMINATION",
  "COVERS_ACCIDENT_PREVENTION",
  "COVERS_OTHER_HUMAN_RIGHTS",
  "OTHER_HUMAN_RIGHTS_SPECIFICATION",
  "COMPLAINTS_HANDLING_MECHANISM",
] as const;

const C7_INCIDENT_SUFFIXES = [
  "INCIDENT_CHILD_LABOUR",
  "INCIDENT_FORCED_LABOUR",
  "INCIDENT_HUMAN_TRAFFICKING",
  "INCIDENT_DISCRIMINATION",
  "INCIDENT_OTHER_HUMAN_RIGHTS",
  "INCIDENT_OTHER_SPECIFICATION",
  "ACTIONS_ADDRESSING_INCIDENTS",
  "VALUE_CHAIN_INCIDENTS_AWARENESS",
] as const;

function fieldIdEndsWith(fieldId: string, suffix: string): boolean {
  return fieldId.endsWith(suffix) || fieldId.includes(`_${suffix}`);
}

export function findC6GateFieldId(fieldIds: string[]): string | undefined {
  return fieldIds.find((id) => fieldIdEndsWith(id, C6_GATE_SUFFIX));
}

export function isC6ChildField(fieldId: string, gateFieldId?: string): boolean {
  if (gateFieldId && fieldId === gateFieldId) {
    return false;
  }
  if (!fieldId.startsWith("C6_")) {
    return false;
  }
  return C6_CHILD_SUFFIXES.some((s) => fieldIdEndsWith(fieldId, s));
}

export function isC7IncidentTreeField(fieldId: string): boolean {
  if (!fieldId.startsWith("C7_")) {
    return false;
  }
  return C7_INCIDENT_SUFFIXES.some((s) => fieldIdEndsWith(fieldId, s));
}

/**
 * Renderer-level visibility for progressive disclosure (§61 / §62).
 * Hidden fields remain in registry; export validation unchanged.
 */
export function isFieldVisibleInDisclosureTree(
  fieldId: string,
  values: Record<string, VsmeFieldValue>,
  options: {
    gateFieldId?: string;
    c7GateOpen?: boolean;
    allFieldIds?: string[];
  } = {}
): boolean {
  const { gateFieldId, c7GateOpen = true, allFieldIds = [] } = options;

  if (gateFieldId && fieldId === gateFieldId) {
    return true;
  }

  if (isC6ChildField(fieldId, gateFieldId)) {
    if (!gateFieldId || !isYes(values, gateFieldId)) {
      return false;
    }
    if (fieldIdEndsWith(fieldId, "OTHER_HUMAN_RIGHTS_SPECIFICATION")) {
      const coversId = options.allFieldIds?.find((id) =>
        fieldIdEndsWith(id, "COVERS_OTHER_HUMAN_RIGHTS")
      );
      return coversId ? isYes(values, coversId) : false;
    }
    return true;
  }

  if (isC7IncidentTreeField(fieldId)) {
    if (!c7GateOpen) {
      return false;
    }
    if (fieldIdEndsWith(fieldId, "INCIDENT_OTHER_SPECIFICATION")) {
      const otherId = allFieldIds.find((id) =>
        fieldIdEndsWith(id, "INCIDENT_OTHER_HUMAN_RIGHTS")
      );
      return otherId ? isYes(values, otherId) : false;
    }
    return true;
  }

  return true;
}

export function c7GateDefaultOpen(
  values: Record<string, VsmeFieldValue>,
  fieldIds: string[]
): boolean {
  return fieldIds.some((id) => {
    if (!isC7IncidentTreeField(id)) {
      return false;
    }
    if (fieldIdEndsWith(id, "ACTIONS_ADDRESSING_INCIDENTS") || fieldIdEndsWith(id, "VALUE_CHAIN")) {
      return fieldValue(values, id).trim().length > 0;
    }
    return isYes(values, id);
  });
}
