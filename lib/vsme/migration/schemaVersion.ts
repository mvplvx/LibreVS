import { VSME_SCHEMA } from "../vsme.schema";
import { isLegacyDataPoint } from "./dataPointMigration";

/** Reporting period version when any v1/legacy datapoints remain. */
export const VSME_SCHEMA_VERSION_LEGACY = `${VSME_SCHEMA.version}-legacy`;

export const VSME_SCHEMA_VERSION_CLEAN = VSME_SCHEMA.version;

export function periodHasLegacyData(
  dataPoints: Array<{
    fieldId: string;
    legacyFieldId?: string | null;
    migrationStatus?: string | null;
  }>
): boolean {
  return dataPoints.some(isLegacyDataPoint);
}

export function resolveReportingPeriodSchemaVersion(
  dataPoints: Array<{
    fieldId: string;
    legacyFieldId?: string | null;
    migrationStatus?: string | null;
  }>
): string {
  return periodHasLegacyData(dataPoints)
    ? VSME_SCHEMA_VERSION_LEGACY
    : VSME_SCHEMA_VERSION_CLEAN;
}
