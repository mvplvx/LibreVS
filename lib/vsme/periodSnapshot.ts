import { VSME_FIELD_COUNT, VSME_FIELD_IDS, getRegistryEntry } from "./vsme.fieldRegistry";
import type { VsmeRegistryEntry } from "./vsme.fieldRegistry";

export type VsmeStoredDataPoint = {
  fieldId: string;
  value: string;
  unit: string | null;
  createdAt: Date;
};

export type VsmePeriodSnapshot = {
  fieldsReported: number;
  totalFields: number;
  coveragePercentage: number;
  reportedFieldIds: string[];
  missingFieldIds: string[];
  bySection: Record<
    string,
    { reported: number; total: number; fields: VsmeRegistryEntry[] }
  >;
  values: {
    fieldId: string;
    path: string;
    value: string;
    unit: string | null;
    label: string;
    type: string;
    excelCell: string;
  }[];
};

export function buildVsmePeriodSnapshot(
  dataPoints: VsmeStoredDataPoint[]
): VsmePeriodSnapshot {
  const reportedSet = new Set(dataPoints.map((dp) => dp.fieldId));
  const bySection: VsmePeriodSnapshot["bySection"] = {};

  for (const fieldId of VSME_FIELD_IDS) {
    const entry = getRegistryEntry(fieldId)!;
    if (!bySection[entry.sectionCode]) {
      bySection[entry.sectionCode] = { reported: 0, total: 0, fields: [] };
    }
    bySection[entry.sectionCode].total += 1;
    if (reportedSet.has(fieldId)) {
      bySection[entry.sectionCode].reported += 1;
    }
  }

  const values = dataPoints
    .map((dp) => {
      const entry = getRegistryEntry(dp.fieldId);
      if (!entry) return null;
      return {
        fieldId: dp.fieldId,
        path: entry.path,
        value: dp.value,
        unit: dp.unit,
        label: entry.label,
        type: entry.type,
        excelCell: entry.excelCell,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const fieldsReported = reportedSet.size;

  return {
    fieldsReported,
    totalFields: VSME_FIELD_COUNT,
    coveragePercentage:
      VSME_FIELD_COUNT === 0
        ? 0
        : Math.round((fieldsReported / VSME_FIELD_COUNT) * 100),
    reportedFieldIds: [...reportedSet].sort(),
    missingFieldIds: VSME_FIELD_IDS.filter((id) => !reportedSet.has(id)),
    bySection,
    values,
  };
}
