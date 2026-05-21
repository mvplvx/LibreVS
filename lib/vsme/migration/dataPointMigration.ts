import {
  classifyLegacyFieldId,
  mapLegacyFieldId,
  type VsmeMigrationStatus,
} from "./v1ToV2FieldMap";
import { isRegisteredFieldId } from "../vsme.fieldRegistry";

export type VsmeDataPointMigrationFields = {
  legacyFieldId?: string | null;
  migratedFieldId?: string | null;
  migrationStatus?: string | null;
};

export type VsmeStoredDataPoint = {
  fieldId: string;
  value: string;
  unit: string | null;
  createdAt: Date;
} & VsmeDataPointMigrationFields;

export type LegacyDataSummary = {
  totalLegacyFields: number;
  unmappedLegacyFields: number;
  mappedLegacyFields: number;
};

/** Row is legacy when fieldId is not in v2 registry or migration metadata marks it. */
export function isLegacyDataPoint(dp: {
  fieldId: string;
  legacyFieldId?: string | null;
  migrationStatus?: string | null;
}): boolean {
  if (dp.legacyFieldId) {
    return true;
  }
  if (dp.migrationStatus) {
    return true;
  }
  return !isRegisteredFieldId(dp.fieldId);
}

/** Effective v2 fieldId for coverage/export; null when legacy cannot contribute. */
export function resolveEffectiveV2FieldId(dp: {
  fieldId: string;
  migratedFieldId?: string | null;
  migrationStatus?: string | null;
}): string | null {
  if (isRegisteredFieldId(dp.fieldId)) {
    return dp.fieldId;
  }
  if (
    dp.migrationStatus === "migrated" &&
    dp.migratedFieldId &&
    isRegisteredFieldId(dp.migratedFieldId)
  ) {
    return dp.migratedFieldId;
  }
  const mapped = mapLegacyFieldId(dp.fieldId);
  if (mapped && isRegisteredFieldId(mapped)) {
    return mapped;
  }
  return null;
}

export function buildLegacyDataSummary(
  dataPoints: Array<{
    fieldId: string;
    legacyFieldId?: string | null;
    migratedFieldId?: string | null;
    migrationStatus?: string | null;
  }>
): LegacyDataSummary {
  let totalLegacyFields = 0;
  let unmappedLegacyFields = 0;
  let mappedLegacyFields = 0;

  for (const dp of dataPoints) {
    if (!isLegacyDataPoint(dp)) {
      continue;
    }
    totalLegacyFields += 1;
    if (resolveEffectiveV2FieldId(dp)) {
      mappedLegacyFields += 1;
    } else {
      unmappedLegacyFields += 1;
    }
  }

  return { totalLegacyFields, unmappedLegacyFields, mappedLegacyFields };
}

export function buildLegacyWarning(
  dataPoints: Array<{
    fieldId: string;
    legacyFieldId?: string | null;
    migrationStatus?: string | null;
  }>
): string[] {
  const warnings: string[] = [];
  for (const dp of dataPoints) {
    if (!isLegacyDataPoint(dp)) {
      continue;
    }
    const status =
      dp.migrationStatus ?? classifyLegacyFieldId(dp.fieldId) ?? "unmapped";
    const label = dp.legacyFieldId ?? dp.fieldId;
    if (status === "unmapped") {
      warnings.push(`Unmapped legacy fieldId: ${label}`);
    } else if (status === "legacy_only") {
      warnings.push(`Legacy-only fieldId (no v2 target): ${label}`);
    }
  }
  return [...new Set(warnings)];
}

export type MigrationRowUpdate = {
  legacyFieldId: string;
  migratedFieldId: string | null;
  migrationStatus: VsmeMigrationStatus;
};

/** Classify a DB row for the idempotent migration script. */
/** Collapse legacy rows to effective v2 fieldIds for export/coverage (last wins). */
export function normalizeToV2DataPoints(
  dataPoints: Array<{
    fieldId: string;
    value: string;
    unit: string | null;
    migratedFieldId?: string | null;
    migrationStatus?: string | null;
  }>
): { fieldId: string; value: string; unit: string | null }[] {
  const byFieldId = new Map<string, { value: string; unit: string | null }>();
  for (const dp of dataPoints) {
    const effectiveId = resolveEffectiveV2FieldId(dp);
    if (effectiveId) {
      byFieldId.set(effectiveId, { value: dp.value, unit: dp.unit });
    }
  }
  return [...byFieldId.entries()]
    .map(([fieldId, v]) => ({ fieldId, ...v }))
    .sort((a, b) => a.fieldId.localeCompare(b.fieldId));
}

export function classifyDataPointForMigration(fieldId: string): MigrationRowUpdate | null {
  if (isRegisteredFieldId(fieldId)) {
    return null;
  }
  const status = classifyLegacyFieldId(fieldId);
  if (!status) {
    return null;
  }
  const migratedFieldId =
    status === "migrated" ? mapLegacyFieldId(fieldId) : null;
  return {
    legacyFieldId: fieldId,
    migratedFieldId,
    migrationStatus: status,
  };
}
