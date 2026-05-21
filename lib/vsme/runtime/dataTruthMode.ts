import { isRegisteredFieldId } from "../vsme.fieldRegistry";

/** Active data-truth policy (no runtime toggle). */
export const DATA_TRUTH_MODE = "STRICT_V2" as const;

export type DataTruthMode = typeof DATA_TRUTH_MODE;

export type DataPointLike = {
  fieldId: string;
  legacyFieldId?: string | null;
  migrationStatus?: string | null;
};

/** True when fieldId exists in the v2 canonical registry. */
export function isV2FieldId(fieldId: string): boolean {
  return isRegisteredFieldId(fieldId);
}

/** True when the row is stored as legacy (audit-only under STRICT_V2). */
export function isLegacyStoredRow(dp: DataPointLike): boolean {
  if (!isV2FieldId(dp.fieldId)) {
    return true;
  }
  if (dp.legacyFieldId) {
    return true;
  }
  if (dp.migrationStatus) {
    return true;
  }
  return false;
}

/**
 * Returns only native v2 datapoints for business logic.
 * Legacy rows (including migration-mapped v1 rows) are excluded.
 */
export function filterLegacyDataPoints<T extends DataPointLike>(dataPoints: T[]): T[] {
  if (DATA_TRUTH_MODE !== "STRICT_V2") {
    return dataPoints;
  }
  return dataPoints.filter((dp) => !isLegacyStoredRow(dp));
}

/** Dev-only: warn when legacy rows would have entered a computed pipeline. */
export function assertV2Only(
  dataPoints: DataPointLike[],
  context: string
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  const legacy = dataPoints.filter(isLegacyStoredRow);
  if (legacy.length === 0) {
    return;
  }
  const ids = [...new Set(legacy.map((dp) => dp.legacyFieldId ?? dp.fieldId))];
  console.warn(
    `[LibreVS] STRICT_V2: ${legacy.length} legacy row(s) excluded from ${context}: ${ids.join(", ")}`
  );
}
