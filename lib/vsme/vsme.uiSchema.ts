import { VSME_SCHEMA } from "./vsme.schema";
import { VSME_SCHEMA_VERSION } from "./schemaVersion";
import {
  getFieldApplicability,
  isSectionModuleInReportingScope,
  getSectionWorkflowLabel,
  isModuleCInReportingScope,
} from "./applicability";
import { DEFAULT_MATERIALITY } from "./materiality";
import type { VsmeMateriality } from "./materiality";
import { buildFieldId, buildFieldPath } from "./buildFieldPath";
import { isUiSectionVisible } from "./sectionUiVisibility";
import type { VsmeApplicabilityRule, VsmeModule, VsmeWorkflowLabel } from "./vsme.types";

export type VsmeUiFieldApplicability = {
  module: VsmeModule;
  applicabilityRule: VsmeApplicabilityRule;
  visible: boolean;
  moduleInReportingScope: boolean;
  materiality: VsmeMateriality;
  requiredToFill: boolean;
  workflowLabel: VsmeWorkflowLabel;
};

export type VsmeUiField = {
  fieldId: string;
  path: string;
  name: string;
  label: string;
  description: string;
  type: "number" | "string" | "boolean";
  excelCell: string;
  xbrlNamedRange: string;
  excelSheet: string;
  unit?: string;
  efragParagraph?: string;
  applicability: VsmeUiFieldApplicability;
};

export type VsmeUiSubsection = {
  id: string;
  title: string;
  fields: VsmeUiField[];
};

export type VsmeUiSectionApplicability = {
  module: VsmeModule;
  applicabilityRule: VsmeApplicabilityRule;
  visible: boolean;
  moduleInReportingScope: boolean;
  workflowLabel: VsmeWorkflowLabel;
};

export type VsmeUiSection = {
  id: string;
  code: string;
  title: string;
  schemaFidelity: "full";
  applicability: VsmeUiSectionApplicability;
  subsections: VsmeUiSubsection[];
};

export type VsmeUiSchema = {
  schemaVersion: string;
  templateVersion: string;
  standard: string;
  alignment: string;
  employeeCount: number;
  /** C module in mandatory reporting scope (employee count obligation). */
  moduleCInReportingScope: boolean;
  sections: VsmeUiSection[];
};

export function buildVsmeUiSchema(
  employeeCount: number,
  materialityByFieldId: Record<string, VsmeMateriality> = {},
  reportedFieldIds: ReadonlySet<string> = new Set()
): VsmeUiSchema {
  const sections: VsmeUiSection[] = VSME_SCHEMA.sections.map((section) => {
    const moduleInReportingScope = isSectionModuleInReportingScope(
      section,
      employeeCount
    );

    const subsections: VsmeUiSubsection[] = section.subsections.map(
      (subsection) => ({
        id: subsection.id,
        title: subsection.title,
        fields: subsection.fields.map((field) => {
          const fieldId = buildFieldId(section, subsection, field);
          const path = buildFieldPath(section, subsection, field);
          const materiality =
            materialityByFieldId[fieldId] ?? DEFAULT_MATERIALITY;
          const fieldApplicability = getFieldApplicability(
            section.code,
            section.module,
            employeeCount,
            materiality
          );

          return {
            fieldId,
            path,
            name: field.name,
            label: field.label,
            description: field.description,
            type: field.type,
            excelCell: field.excelCell,
            xbrlNamedRange: field.xbrlNamedRange,
            excelSheet: field.excelSheet,
            unit: field.unit,
            efragParagraph: field.efragParagraph,
            applicability: {
              module: section.module,
              applicabilityRule: section.applicabilityRule,
              visible: true,
              moduleInReportingScope:
                fieldApplicability.moduleInReportingScope,
              materiality: fieldApplicability.materiality,
              requiredToFill: fieldApplicability.requiredToFill,
              workflowLabel: fieldApplicability.workflowLabel,
            },
          };
        }),
      })
    );

    const sectionFields = subsections.flatMap((sub) => sub.fields);
    const sectionVisible = isUiSectionVisible(
      sectionFields.map((f) => ({
        materiality: f.applicability.materiality,
        moduleInReportingScope: f.applicability.moduleInReportingScope,
        hasData: reportedFieldIds.has(f.fieldId),
      }))
    );

    return {
      id: section.id,
      code: section.code,
      title: section.title,
      schemaFidelity: section.schemaFidelity,
      applicability: {
        module: section.module,
        applicabilityRule: section.applicabilityRule,
        visible: sectionVisible,
        moduleInReportingScope,
        workflowLabel: getSectionWorkflowLabel(section, employeeCount),
      },
      subsections,
    };
  });

  return {
    schemaVersion: VSME_SCHEMA_VERSION,
    templateVersion: VSME_SCHEMA.templateVersion,
    standard: VSME_SCHEMA.standard,
    alignment: VSME_SCHEMA.alignment,
    employeeCount,
    moduleCInReportingScope: isModuleCInReportingScope(employeeCount),
    sections,
  };
}

export function getDefaultVsmeUiSchema(): VsmeUiSchema {
  return buildVsmeUiSchema(0);
}
