import { resolveSectionApplicability } from "./applicability";
import type { SectionApplicabilityState } from "./applicability";
import {
  buildCompletedFieldIds,
  buildVsmeCompleteness,
  coveragePercentage,
  type VsmeCompleteness,
} from "./completeness";
import {
  deriveReportingState,
  type VsmeReportingState,
} from "./reportingState";
import { validateExportCompleteness } from "./exportMapping";
import type { VsmeExportValidationResult } from "./exportMapping";
import type { VsmeMateriality } from "./materiality";
import { getFieldMateriality, isRequiredToFill } from "./materiality";
import type { VsmeStoredDataPoint } from "./migration/dataPointMigration";
import {
  assertV2Only,
  filterLegacyDataPoints,
} from "./runtime/dataTruthMode";
import {
  VSME_FIELD_COUNT,
  VSME_FIELD_IDS,
  getRegistryEntry,
} from "./vsme.fieldRegistry";
import type { VsmeRegistryEntry } from "./vsme.fieldRegistry";

export type { VsmeStoredDataPoint } from "./migration/dataPointMigration";
export type { VsmeCompleteness } from "./completeness";
export type { VsmeReportingState } from "./reportingState";

export type BuildVsmePeriodSnapshotOptions = {
  /** When true, reportingState becomes "exported" (e.g. period.status === "exported"). */
  exportGenerated?: boolean;
};

export type VsmePeriodSnapshot = {
  employeeCount: number;
  fieldsReported: number;
  totalFields: number;
  totalCoveragePercentage: number;
  inScopeCoveragePercentage: number;
  materialCoveragePercentage: number;
  requiredCoveragePercentage: number;
  reportedFieldIds: string[];
  missingFieldIds: string[];
  completeness: VsmeCompleteness;
  reportingState: VsmeReportingState;
  applicableSections: SectionApplicabilityState[];
  exportReady: boolean;
  exportValidation: VsmeExportValidationResult;
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
  dataPoints: VsmeStoredDataPoint[],
  employeeCount = 0,
  materialityByFieldId: Record<string, VsmeMateriality> = {},
  options: BuildVsmePeriodSnapshotOptions = {}
): VsmePeriodSnapshot {
  assertV2Only(dataPoints, "buildVsmePeriodSnapshot(input)");
  const v2DataPoints = filterLegacyDataPoints(dataPoints);

  const completedFieldIds = buildCompletedFieldIds(v2DataPoints);
  const completedSet = new Set(completedFieldIds);
  const reportedSet = new Set(completedFieldIds);

  const completeness = buildVsmeCompleteness(
    employeeCount,
    completedFieldIds,
    materialityByFieldId
  );

  const exportValidation = validateExportCompleteness(
    employeeCount,
    completedFieldIds,
    materialityByFieldId
  );

  const bySection: VsmePeriodSnapshot["bySection"] = {};

  for (const fieldId of VSME_FIELD_IDS) {
    const entry = getRegistryEntry(fieldId)!;
    const materiality = getFieldMateriality(fieldId, materialityByFieldId);
    const countsTowardRequired = isRequiredToFill(
      entry.module,
      employeeCount,
      materiality
    );
    if (!bySection[entry.sectionCode]) {
      bySection[entry.sectionCode] = { reported: 0, total: 0, fields: [] };
    }
    if (countsTowardRequired) {
      bySection[entry.sectionCode].total += 1;
      if (completedSet.has(fieldId)) {
        bySection[entry.sectionCode].reported += 1;
      }
    }
  }

  const values = v2DataPoints
    .map((dp) => {
      const entry = getRegistryEntry(dp.fieldId);
      if (!entry) {
        return null;
      }
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
  const exportReady = completeness.exportBlockingFields.length === 0;

  const requiredCoveragePercentage = coveragePercentage(
    completedSet,
    completeness.requiredFieldIds
  );

  const reportingState = deriveReportingState(
    {
      requiredCoveragePercentage,
      completeness,
    },
    { exportGenerated: options.exportGenerated }
  );

  return {
    employeeCount,
    fieldsReported,
    totalFields: VSME_FIELD_COUNT,
    totalCoveragePercentage:
      VSME_FIELD_COUNT === 0
        ? 0
        : Math.round((fieldsReported / VSME_FIELD_COUNT) * 100),
    inScopeCoveragePercentage: coveragePercentage(
      completedSet,
      completeness.inScopeFieldIds
    ),
    materialCoveragePercentage: coveragePercentage(
      completedSet,
      completeness.materialFieldIds
    ),
    requiredCoveragePercentage,
    reportedFieldIds: [...reportedSet].sort(),
    missingFieldIds: VSME_FIELD_IDS.filter((id) => !reportedSet.has(id)),
    completeness,
    reportingState,
    applicableSections: resolveSectionApplicability(employeeCount, reportedSet),
    exportReady,
    exportValidation,
    bySection,
    values,
  };
}
