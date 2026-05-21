import type { VsmeMateriality } from "./materiality";

export type ReportingState =
  | "WORKSPACE_INITIALIZED"
  | "CONTEXT_READY"
  | "MATERIALITY_DEFINED"
  | "DATA_IN_PROGRESS"
  | "VALIDATION_READY"
  | "EXPORT_READY"
  | "EXPORTED";

export type PeriodSnapshot = {
  companyId: string;
  reportingPeriodId: string;
  employeeCount: number;

  materialityByFieldId: Record<string, VsmeMateriality>;
  valuesByFieldId: Record<string, string>;

  requiredFieldIds: string[];
  missingRequiredFieldIds: string[];

  exportReady: boolean;
  hasBeenExported: boolean;

  materialityDefined?: boolean;
};

function hasEnteredValues(valuesByFieldId: Record<string, string>): boolean {
  return Object.values(valuesByFieldId).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

function isMaterialityDefined(snapshot: PeriodSnapshot): boolean {
  if (snapshot.materialityDefined !== undefined) {
    return snapshot.materialityDefined;
  }
  return Object.keys(snapshot.materialityByFieldId).length > 0;
}

/**
 * Central reporting lifecycle state (derived only — not persisted).
 * Evaluated in strict priority order per Phase 4F spec.
 */
export function getReportingState(snapshot: PeriodSnapshot): ReportingState {
  if (!snapshot.companyId?.trim() || !snapshot.reportingPeriodId?.trim()) {
    return "WORKSPACE_INITIALIZED";
  }

  const materialityDefined = isMaterialityDefined(snapshot);

  if (!materialityDefined) {
    return "CONTEXT_READY";
  }

  const hasValues = hasEnteredValues(snapshot.valuesByFieldId);

  if (!hasValues) {
    return "MATERIALITY_DEFINED";
  }

  if (
    snapshot.missingRequiredFieldIds.length > 0
  ) {
    return "DATA_IN_PROGRESS";
  }

  if (
    snapshot.missingRequiredFieldIds.length === 0 &&
    snapshot.exportReady === false
  ) {
    return "VALIDATION_READY";
  }

  if (snapshot.exportReady === true && snapshot.hasBeenExported === false) {
    return "EXPORT_READY";
  }

  if (snapshot.hasBeenExported === true) {
    return "EXPORTED";
  }

  return "DATA_IN_PROGRESS";
}

export function getReportingStateFlags(state: ReportingState) {
  return {
    isSetupPhase:
      state === "WORKSPACE_INITIALIZED" || state === "CONTEXT_READY",

    isMaterialityPhase: state === "MATERIALITY_DEFINED",

    isDataEntryPhase: state === "DATA_IN_PROGRESS",

    isValidationPhase: state === "VALIDATION_READY",

    isExportPhase: state === "EXPORT_READY",

    isFrozen: state === "EXPORTED",
  };
}

/** Build values map from snapshot value rows. */
export function valuesByFieldIdFromRows(
  rows: Array<{ fieldId: string; value: string }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.fieldId] = row.value;
  }
  return map;
}
