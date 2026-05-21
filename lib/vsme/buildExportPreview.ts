import { VSME_SCHEMA } from "./vsme.schema";
import { getFieldIdsForSection } from "./applicability";
import { VSME_FIELD_REGISTRY } from "./vsme.fieldRegistry";
import type { ExportValidationResult } from "./validateEfragExport";
import {
  buildEfragExportSnapshot,
  exportExclusionReason,
  validateEfragExport,
  wouldFieldBeIncludedInExport,
  type EfragExportSnapshot,
} from "./validateEfragExport";

export type ExportPreviewField = {
  fieldId: string;
  label: string;
  value: string;
  unit: string | null;
  includedInExport: boolean;
  reasonIfExcluded?: string;
};

export type ExportPreviewSection = {
  sectionId: string;
  title: string;
  status: "complete" | "incomplete";
  fields: ExportPreviewField[];
};

export type ExportPreview = {
  sections: ExportPreviewSection[];
  summary: {
    totalFields: number;
    includedFields: number;
    missingFields: number;
    coverage: number;
  };
};

export function buildExportPreview(
  snapshot: EfragExportSnapshot,
  validation: ExportValidationResult,
  unitsByFieldId: Record<string, string | null> = {}
): ExportPreview {
  let totalFields = 0;
  let includedFields = 0;

  const sections: ExportPreviewSection[] = VSME_SCHEMA.sections.map(
    (section) => {
      const breakdown = validation.sectionBreakdown[section.code];
      const fieldIds = getFieldIdsForSection(section.code);

      const fields: ExportPreviewField[] = fieldIds.map((fieldId) => {
        totalFields += 1;
        const entry = VSME_FIELD_REGISTRY[fieldId]!;
        const value = snapshot.valuesByFieldId[fieldId] ?? "";
        const included = wouldFieldBeIncludedInExport(fieldId, snapshot);
        if (included) {
          includedFields += 1;
        }
        const reasonIfExcluded = included
          ? undefined
          : exportExclusionReason(fieldId, snapshot);

        return {
          fieldId,
          label: entry.label,
          value,
          unit: unitsByFieldId[fieldId] ?? entry.unit ?? null,
          includedInExport: included,
          reasonIfExcluded,
        };
      });

      return {
        sectionId: section.code,
        title: section.title,
        status: breakdown?.complete ? "complete" : "incomplete",
        fields,
      };
    }
  );

  return {
    sections,
    summary: {
      totalFields,
      includedFields,
      missingFields: validation.missingFields.length,
      coverage: validation.exportCoverage,
    },
  };
}

export function buildExportPreviewFromValues(
  input: Parameters<typeof buildEfragExportSnapshot>[0],
  unitsByFieldId: Record<string, string | null> = {}
): {
  snapshot: EfragExportSnapshot;
  validation: ExportValidationResult;
  preview: ExportPreview;
} {
  const snapshot = buildEfragExportSnapshot(input);
  const validation = validateEfragExport(snapshot);
  const preview = buildExportPreview(snapshot, validation, unitsByFieldId);
  return { snapshot, validation, preview };
}
