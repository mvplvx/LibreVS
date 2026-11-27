import { VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE } from "./employeeSize";
import { registryDatapoint } from "./scalarEligibility";
import { VS2026_COMPARATIVE_BASIS, VS2026_REPORTING_ORIGIN } from "./reportingStandard";

export type ProvenanceRow = {
  readonly fieldId: string;
  readonly legacyFieldId: string | null;
  readonly migratedFieldId: string | null;
  readonly migrationStatus: string | null;
  readonly reportingOrigin: string | null;
};

/**
 * A registry or control value is a VS 2026 fact only when the editor wrote it
 * and no legacy migration marker is present. Repeating rows live in the
 * VS 2026 tables and are not scanned here.
 */
export function unverifiedVs2026FieldIds(rows: readonly ProvenanceRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!tracked(row.fieldId)) {
      continue;
    }
    const marked =
      row.legacyFieldId !== null || row.migratedFieldId !== null || row.migrationStatus !== null;
    if (marked || row.reportingOrigin !== VS2026_REPORTING_ORIGIN) {
      ids.add(row.fieldId);
    }
  }
  return [...ids].sort();
}

function tracked(fieldId: string): boolean {
  if (fieldId === VS2026_EMPLOYEE_PROPORTIONALITY_MEASURE || fieldId === VS2026_COMPARATIVE_BASIS) {
    return true;
  }
  const datapoint = registryDatapoint(fieldId);
  return datapoint !== undefined && datapoint.id !== "B1_MODULE_OPTION";
}
