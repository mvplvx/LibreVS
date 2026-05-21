import { buildVsmeCompleteness } from "./completeness";
import { VSME_FIELD_REGISTRY } from "./vsme.fieldRegistry";
import {
  getFieldIdsInModuleScope,
  isModuleCInReportingScope,
  resolveSectionApplicability,
} from "./applicability";
import { getFieldMateriality, isRequiredToFill } from "./materiality";
import type { VsmeMateriality } from "./materiality";

export type VsmeExportRow = {
  fieldId: string;
  path: string;
  excelCell: string;
  xbrlNamedRange: string;
  value: string;
  unit: string | null;
  sectionCode: string;
  module: "B" | "C";
};

export type VsmeExportValidationResult = {
  exportReady: boolean;
  employeeCount: number;
  moduleCInReportingScope: boolean;
  missingFieldIds: string[];
  missingSections: string[];
  includedFieldIds: string[];
  errors: string[];
  warnings: string[];
};

export function selectExportFieldIds(
  employeeCount: number,
  reportedFieldIds: string[],
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): string[] {
  return reportedFieldIds.filter((fieldId) => {
    const entry = VSME_FIELD_REGISTRY[fieldId];
    if (!entry) {
      return false;
    }
    const materiality = getFieldMateriality(fieldId, materialityByFieldId);
    return isRequiredToFill(entry.module, employeeCount, materiality);
  });
}

export function buildExportRows(
  employeeCount: number,
  dataPoints: { fieldId: string; value: string; unit: string | null }[],
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): VsmeExportRow[] {
  const reportedIds = dataPoints.map((dp) => dp.fieldId);
  const allowed = new Set(
    selectExportFieldIds(employeeCount, reportedIds, materialityByFieldId)
  );
  const byId = new Map(dataPoints.map((dp) => [dp.fieldId, dp]));

  return [...allowed]
    .sort()
    .map((fieldId) => {
      const entry = VSME_FIELD_REGISTRY[fieldId]!;
      const dp = byId.get(fieldId);
      return {
        fieldId,
        path: entry.path,
        excelCell: entry.excelCell,
        xbrlNamedRange: entry.xbrlNamedRange,
        value: dp?.value ?? "",
        unit: dp?.unit ?? null,
        sectionCode: entry.sectionCode,
        module: entry.module,
      };
    });
}

export function validateExportCompleteness(
  employeeCount: number,
  reportedFieldIds: string[],
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): VsmeExportValidationResult {
  const reported = new Set(reportedFieldIds);
  const completeness = buildVsmeCompleteness(
    employeeCount,
    reportedFieldIds,
    materialityByFieldId
  );
  const mandatoryFieldIds = completeness.requiredFieldIds;
  const missingFieldIds = completeness.exportBlockingFields;

  const sectionStates = resolveSectionApplicability(employeeCount, reported);
  const missingSections = sectionStates
    .filter((s) => s.moduleInReportingScope)
    .filter((s) => {
      const sectionFieldIds = mandatoryFieldIds.filter(
        (id) => VSME_FIELD_REGISTRY[id]?.sectionCode === s.sectionCode
      );
      return sectionFieldIds.some((id) => !reported.has(id));
    })
    .map((s) => s.sectionCode);

  const includedFieldIds = selectExportFieldIds(
    employeeCount,
    reportedFieldIds,
    materialityByFieldId
  );
  const errors: string[] = [];
  const warnings: string[] = [];

  if (missingFieldIds.length > 0) {
    errors.push(
      `${missingFieldIds.length} material in-scope field(s) missing for export`
    );
  }
  if (missingSections.length > 0) {
    errors.push(
      `Incomplete in-scope sections: ${[...new Set(missingSections)].join(", ")}`
    );
  }

  const inScopeCount = getFieldIdsInModuleScope(employeeCount).length;
  const nonMaterialReported = reportedFieldIds.filter((id) => {
    const entry = VSME_FIELD_REGISTRY[id];
    if (!entry) {
      return false;
    }
    return (
      getFieldMateriality(id, materialityByFieldId) === "non_material" &&
      reported.has(id)
    );
  });
  if (nonMaterialReported.length > 0) {
    warnings.push(
      `${nonMaterialReported.length} non-material field(s) excluded from export`
    );
  }

  if (!isModuleCInReportingScope(employeeCount)) {
    const optionalCWithData = sectionStates.filter(
      (s) =>
        s.module === "C" &&
        !s.moduleInReportingScope &&
        s.hasVoluntaryData
    );
    for (const s of optionalCWithData) {
      warnings.push(
        `Section ${s.sectionCode}: C module optional scope (${s.reportedCount}/${s.fieldCount} fields with data)`
      );
    }
  }

  const exportReady = missingFieldIds.length === 0;

  return {
    exportReady,
    employeeCount,
    moduleCInReportingScope: isModuleCInReportingScope(employeeCount),
    missingFieldIds,
    missingSections: [...new Set(missingSections)],
    includedFieldIds,
    errors,
    warnings,
  };
}
