import { VSME_SCHEMA } from "../vsme.schema";
import { isModuleInReportingScope } from "../moduleScope";
import { getFieldMateriality } from "../materiality";
import {
  getRegistryEntry,
  type VsmeRegistryEntry,
} from "../vsme.fieldRegistry";
import type { EfragReference } from "../vsme.types";
import type {
  EfragExportSnapshot,
  ExportValidationResult,
} from "../validateEfragExport";

export type ExportRequirementReasonCode =
  | "B_MODULE_REQUIRED"
  | "C_MODULE_SCOPE_ACTIVE"
  | "FIELD_MARKED_MATERIAL"
  | "IN_SCOPE_AND_MATERIAL";

export type ExportBlockingField = {
  fieldId: string;
  label: string;
  section: string;
  subsection?: string;
  module: "B" | "C";
  materiality: "material" | "non_material";
  moduleInReportingScope: boolean;
  requiredToFill: boolean;
  requiredReasonCode: ExportRequirementReasonCode;
  requiredReasonLabel: string;
  resolutionAction: string;
  efragReference?: EfragReference & { title?: string };
};

export type ExportAuditSectionSummary = {
  section: string;
  missingRequiredFields: number;
  blockingReasonSummary: string[];
};

export type ExportAuditResult = {
  exportReady: boolean;
  totalBlockingFields: number;
  blockingFields: ExportBlockingField[];
  missingSections: string[];
  sectionSummaries: ExportAuditSectionSummary[];
  summary: {
    totalRequiredFields: number;
    completedRequiredFields: number;
    missingRequiredFields: number;
  };
};

export type BuildExportAuditInput = {
  /** Same snapshot inputs used for export-validation / snapshot generation. */
  snapshot: EfragExportSnapshot;
  /** Output of validateEfragExport(snapshot) — blocking field list source of truth. */
  validation: ExportValidationResult;
  /** Period snapshot exportReady (completeness.exportBlockingFields). */
  exportReady: boolean;
  /** From period exportValidation.missingSections when available. */
  missingSections?: string[];
};

const REASON_LABELS: Record<ExportRequirementReasonCode, string> = {
  B_MODULE_REQUIRED:
    "B Module disclosures are mandatory for all companies.",
  C_MODULE_SCOPE_ACTIVE:
    "Comprehensive Module reporting is active because employee count is within reporting scope.",
  FIELD_MARKED_MATERIAL:
    "This field is required because it is marked as material.",
  IN_SCOPE_AND_MATERIAL:
    "This field is required because it is material and within reporting scope.",
};

function subsectionTitle(
  sectionCode: string,
  subsectionId: string
): string | undefined {
  const section = VSME_SCHEMA.sections.find((s) => s.code === sectionCode);
  return section?.subsections.find((sub) => sub.id === subsectionId)?.title;
}

function resolveRequirementReason(
  entry: VsmeRegistryEntry,
  snapshot: EfragExportSnapshot
): {
  code: ExportRequirementReasonCode;
  label: string;
} {
  const materiality = getFieldMateriality(
    entry.fieldId,
    snapshot.materialityByFieldId
  );
  const moduleInReportingScope = isModuleInReportingScope(
    entry.module,
    snapshot.employeeCount
  );

  if (entry.module === "B") {
    return {
      code: "B_MODULE_REQUIRED",
      label: REASON_LABELS.B_MODULE_REQUIRED,
    };
  }

  if (entry.module === "C" && moduleInReportingScope) {
    if (materiality === "material") {
      return {
        code: "IN_SCOPE_AND_MATERIAL",
        label: REASON_LABELS.IN_SCOPE_AND_MATERIAL,
      };
    }
    return {
      code: "C_MODULE_SCOPE_ACTIVE",
      label: REASON_LABELS.C_MODULE_SCOPE_ACTIVE,
    };
  }

  if (moduleInReportingScope && materiality === "material") {
    return {
      code: "IN_SCOPE_AND_MATERIAL",
      label: REASON_LABELS.IN_SCOPE_AND_MATERIAL,
    };
  }

  return {
    code: "FIELD_MARKED_MATERIAL",
    label: REASON_LABELS.FIELD_MARKED_MATERIAL,
  };
}

function resolveResolutionAction(
  materiality: "material" | "non_material",
  moduleInReportingScope: boolean
): string {
  if (materiality === "non_material") {
    return "Mark the field as non-material if reporting is not required.";
  }
  if (!moduleInReportingScope) {
    return "Complete required reporting data for this section.";
  }
  return "Provide a value for this field.";
}

function buildBlockingField(
  fieldId: string,
  snapshot: EfragExportSnapshot
): ExportBlockingField {
  const entry = getRegistryEntry(fieldId)!;
  const materiality = getFieldMateriality(
    fieldId,
    snapshot.materialityByFieldId
  );
  const moduleInReportingScope = isModuleInReportingScope(
    entry.module,
    snapshot.employeeCount
  );
  const requiredToFill = snapshot.requiredFieldIds.includes(fieldId);
  const { code, label } = resolveRequirementReason(entry, snapshot);
  const subsection = subsectionTitle(entry.sectionCode, entry.subsectionId);

  const efragRef = entry.efragReference
    ? {
        ...entry.efragReference,
        title: entry.efragReference.section,
      }
    : undefined;

  return {
    fieldId,
    label: entry.label,
    section: entry.sectionCode,
    subsection,
    module: entry.module,
    materiality,
    moduleInReportingScope,
    requiredToFill,
    requiredReasonCode: code,
    requiredReasonLabel: label,
    resolutionAction: resolveResolutionAction(
      materiality,
      moduleInReportingScope
    ),
    efragReference: efragRef,
  };
}

function buildSectionSummaries(
  validation: ExportValidationResult,
  blockingFields: ExportBlockingField[]
): ExportAuditSectionSummary[] {
  const reasonsBySection = new Map<string, Set<string>>();

  for (const field of blockingFields) {
    if (!reasonsBySection.has(field.section)) {
      reasonsBySection.set(field.section, new Set());
    }
    reasonsBySection.get(field.section)!.add(field.requiredReasonLabel);
  }

  return Object.entries(validation.sectionBreakdown)
    .filter(([, breakdown]) => breakdown.missingRequired > 0)
    .map(([section, breakdown]) => ({
      section,
      missingRequiredFields: breakdown.missingRequired,
      blockingReasonSummary: [...(reasonsBySection.get(section) ?? [])].sort(),
    }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

/**
 * Read-only export audit — explains existing validateEfragExport + period snapshot state.
 * Does not determine blocking fields independently; uses validation.missingFields only.
 */
export function buildExportAudit(input: BuildExportAuditInput): ExportAuditResult {
  const { snapshot, validation, exportReady, missingSections } = input;

  const requiredSet = new Set(snapshot.requiredFieldIds);
  const blockingFields = [...validation.missingFields]
    .filter((fieldId) => requiredSet.has(fieldId))
    .sort()
    .map((fieldId) => buildBlockingField(fieldId, snapshot));

  const derivedMissingSections =
    missingSections ??
    Object.entries(validation.sectionBreakdown)
      .filter(([, breakdown]) => !breakdown.complete)
      .map(([code]) => code)
      .sort();

  const totalRequired = snapshot.requiredFieldIds.length;
  const missingCount = validation.missingFields.length;

  return {
    exportReady,
    totalBlockingFields: blockingFields.length,
    blockingFields,
    missingSections: [...new Set(derivedMissingSections)].sort(),
    sectionSummaries: buildSectionSummaries(validation, blockingFields),
    summary: {
      totalRequiredFields: totalRequired,
      completedRequiredFields: totalRequired - missingCount,
      missingRequiredFields: missingCount,
    },
  };
}
