import { VSME_SCHEMA } from "./vsme.schema";
import { getFieldIdsForSection } from "./applicability";
import { isModuleInReportingScope } from "./moduleScope";
import { getFieldMateriality, isRequiredToFill } from "./materiality";
import type { VsmeMateriality } from "./materiality";
import {
  VSME_FIELD_REGISTRY,
  isRegisteredFieldId,
} from "./vsme.fieldRegistry";
import { validateFieldValue } from "./validateFieldValue";

export type EfragExportSnapshot = {
  employeeCount: number;
  materialityByFieldId: Record<string, VsmeMateriality>;
  valuesByFieldId: Record<string, string>;
  requiredFieldIds: string[];
};

export type ExportValidationResult = {
  isValid: boolean;

  missingFields: string[];
  extraFields: string[];

  structuralErrors: Array<{
    fieldId: string;
    issue: string;
  }>;

  sectionBreakdown: Record<
    string,
    {
      totalFields: number;
      missingRequired: number;
      complete: boolean;
    }
  >;

  exportCoverage: number;
};

function hasNonEmptyValue(valuesByFieldId: Record<string, string>, fieldId: string): boolean {
  const value = valuesByFieldId[fieldId];
  return typeof value === "string" && value.trim().length > 0;
}

function validateFieldType(
  fieldId: string,
  value: string
): string | null {
  const entry = VSME_FIELD_REGISTRY[fieldId];
  if (!entry) {
    return null;
  }
  const result = validateFieldValue(entry, value, null);
  if (!result.ok) {
    return result.error;
  }
  return null;
}

/** Registry field count per section must match canonical schema section size. */
function validateSectionStructure(): Array<{ fieldId: string; issue: string }> {
  const errors: Array<{ fieldId: string; issue: string }> = [];

  for (const section of VSME_SCHEMA.sections) {
    const schemaCount = section.subsections.reduce(
      (n, sub) => n + sub.fields.length,
      0
    );
    const registryCount = getFieldIdsForSection(section.code).length;
    if (schemaCount !== registryCount) {
      errors.push({
        fieldId: section.code,
        issue: `Section ${section.code} registry field count (${registryCount}) does not match EFRAG schema (${schemaCount})`,
      });
    }
  }

  return errors;
}

export function validateEfragExport(
  snapshot: EfragExportSnapshot
): ExportValidationResult {
  const { employeeCount, materialityByFieldId, valuesByFieldId, requiredFieldIds } =
    snapshot;

  const missingFields: string[] = [];
  const extraFields: string[] = [];
  const structuralErrors: Array<{ fieldId: string; issue: string }> = [];

  for (const fieldId of requiredFieldIds) {
    if (!hasNonEmptyValue(valuesByFieldId, fieldId)) {
      missingFields.push(fieldId);
    }
  }

  for (const fieldId of Object.keys(valuesByFieldId)) {
    if (!isRegisteredFieldId(fieldId)) {
      extraFields.push(fieldId);
      continue;
    }
    if (!hasNonEmptyValue(valuesByFieldId, fieldId)) {
      continue;
    }
    const typeError = validateFieldType(fieldId, valuesByFieldId[fieldId]);
    if (typeError) {
      structuralErrors.push({ fieldId, issue: typeError });
    }
  }

  structuralErrors.push(...validateSectionStructure());

  const sectionBreakdown: ExportValidationResult["sectionBreakdown"] = {};

  for (const section of VSME_SCHEMA.sections) {
    const sectionFieldIds = getFieldIdsForSection(section.code);
    const sectionRequired = sectionFieldIds.filter((fieldId) => {
      const entry = VSME_FIELD_REGISTRY[fieldId];
      if (!entry) {
        return false;
      }
      const materiality = getFieldMateriality(fieldId, materialityByFieldId);
      return isRequiredToFill(entry.module, employeeCount, materiality);
    });

    const missingRequired = sectionRequired.filter(
      (id) => !hasNonEmptyValue(valuesByFieldId, id)
    ).length;

    sectionBreakdown[section.code] = {
      totalFields: sectionFieldIds.length,
      missingRequired,
      complete: missingRequired === 0,
    };
  }

  const completedRequired = requiredFieldIds.filter((id) =>
    hasNonEmptyValue(valuesByFieldId, id)
  ).length;
  const totalRequired = requiredFieldIds.length;
  const exportCoverage =
    totalRequired === 0
      ? 100
      : Math.round((completedRequired / totalRequired) * 100);

  const isValid =
    missingFields.length === 0 &&
    extraFields.length === 0 &&
    structuralErrors.length === 0;

  return {
    isValid,
    missingFields,
    extraFields,
    structuralErrors,
    sectionBreakdown,
    exportCoverage,
  };
}

export function buildEfragExportSnapshot(input: {
  employeeCount: number;
  materialityByFieldId: Record<string, VsmeMateriality>;
  values: Array<{ fieldId: string; value: string }>;
  requiredFieldIds: string[];
}): EfragExportSnapshot {
  const valuesByFieldId: Record<string, string> = {};
  for (const row of input.values) {
    valuesByFieldId[row.fieldId] = row.value;
  }
  return {
    employeeCount: input.employeeCount,
    materialityByFieldId: input.materialityByFieldId,
    valuesByFieldId,
    requiredFieldIds: input.requiredFieldIds,
  };
}

export function wouldFieldBeIncludedInExport(
  fieldId: string,
  snapshot: EfragExportSnapshot
): boolean {
  const entry = VSME_FIELD_REGISTRY[fieldId];
  if (!entry) {
    return false;
  }
  if (!hasNonEmptyValue(snapshot.valuesByFieldId, fieldId)) {
    return false;
  }
  const materiality = getFieldMateriality(fieldId, snapshot.materialityByFieldId);
  return isRequiredToFill(
    entry.module,
    snapshot.employeeCount,
    materiality
  );
}

export function exportExclusionReason(
  fieldId: string,
  snapshot: EfragExportSnapshot
): string | undefined {
  const entry = VSME_FIELD_REGISTRY[fieldId];
  if (!entry) {
    return "Unknown field (not in registry)";
  }
  if (!isModuleInReportingScope(entry.module, snapshot.employeeCount)) {
    return "Out of scope module";
  }
  const materiality = getFieldMateriality(fieldId, snapshot.materialityByFieldId);
  if (materiality === "non_material") {
    return "Non-material";
  }
  const required = isRequiredToFill(
    entry.module,
    snapshot.employeeCount,
    materiality
  );
  if (required && !hasNonEmptyValue(snapshot.valuesByFieldId, fieldId)) {
    return "Missing required value";
  }
  if (!hasNonEmptyValue(snapshot.valuesByFieldId, fieldId)) {
    return "Not reported";
  }
  if (!wouldFieldBeIncludedInExport(fieldId, snapshot)) {
    return "Excluded from export selection";
  }
  return undefined;
}
