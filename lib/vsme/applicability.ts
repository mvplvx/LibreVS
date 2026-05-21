import { buildFieldId } from "./buildFieldPath";
import { getFieldMateriality, isRequiredToFill } from "./materiality";
import type { VsmeMateriality } from "./materiality";
import {
  COMPREHENSIVE_EMPLOYEE_MAX,
  COMPREHENSIVE_EMPLOYEE_THRESHOLD,
  isModuleCInReportingScope,
  isModuleInReportingScope,
} from "./moduleScope";
import { VSME_SCHEMA } from "./vsme.schema";
import { VSME_FIELD_IDS, getRegistryEntry } from "./vsme.fieldRegistry";
import type { VsmeApplicabilityRule, VsmeModule, VsmeSectionDef, VsmeWorkflowLabel } from "./vsme.types";

export {
  COMPREHENSIVE_EMPLOYEE_MAX,
  COMPREHENSIVE_EMPLOYEE_THRESHOLD,
  isModuleCInReportingScope,
  isModuleInReportingScope,
};

/** @deprecated Use isModuleCInReportingScope */
export function requiresComprehensiveModule(employeeCount: number): boolean {
  return isModuleCInReportingScope(employeeCount);
}

export function getApplicabilityRuleForModule(
  module: VsmeModule
): VsmeApplicabilityRule {
  return module === "B" ? "always" : "if_employee_count_gt_500";
}

/** All B/C sections exist in schema and are visible for data entry. */
export function isSectionVisible(_section: VsmeSectionDef): boolean {
  return true;
}

/** Module-level obligation (employee count only — not materiality). */
export function isSectionModuleInReportingScope(
  section: VsmeSectionDef,
  employeeCount: number
): boolean {
  return isModuleInReportingScope(section.module, employeeCount);
}

/** @deprecated Use isSectionModuleInReportingScope */
export function isSectionRequiredInWorkflow(
  section: VsmeSectionDef,
  employeeCount: number
): boolean {
  return isSectionModuleInReportingScope(section, employeeCount);
}

export function getSectionWorkflowLabel(
  section: VsmeSectionDef,
  employeeCount: number
): VsmeWorkflowLabel {
  if (section.module === "B") {
    return "in_scope";
  }
  if (isModuleCInReportingScope(employeeCount)) {
    return "c_module_mandatory_scope";
  }
  return "c_module_optional_scope";
}

export function getFieldIdsForSection(sectionCode: string): string[] {
  const section = VSME_SCHEMA.sections.find((s) => s.code === sectionCode);
  if (!section) {
    return [];
  }
  const ids: string[] = [];
  for (const subsection of section.subsections) {
    for (const field of subsection.fields) {
      ids.push(buildFieldId(section, subsection, field));
    }
  }
  return ids;
}

export function getFieldIdsForModule(module: VsmeModule): string[] {
  return VSME_SCHEMA.sections
    .filter((section) => section.module === module)
    .flatMap((section) => getFieldIdsForSection(section.code));
}

export function getFieldIdsInModuleScope(employeeCount: number): string[] {
  return VSME_FIELD_IDS.filter((fieldId) => {
    const entry = getRegistryEntry(fieldId);
    return entry && isModuleInReportingScope(entry.module, employeeCount);
  });
}

export type FieldModuleApplicability = {
  moduleInReportingScope: boolean;
  workflowLabel: VsmeWorkflowLabel;
};

export function getFieldModuleApplicability(
  sectionCode: string,
  module: VsmeModule,
  employeeCount: number
): FieldModuleApplicability {
  const section = VSME_SCHEMA.sections.find((s) => s.code === sectionCode);
  if (!section) {
    return {
      moduleInReportingScope: false,
      workflowLabel: "c_module_optional_scope",
    };
  }
  return {
    moduleInReportingScope: isModuleInReportingScope(module, employeeCount),
    workflowLabel: getSectionWorkflowLabel(section, employeeCount),
  };
}

export type FieldApplicability = FieldModuleApplicability & {
  materiality: VsmeMateriality;
  requiredToFill: boolean;
};

export function getFieldApplicability(
  sectionCode: string,
  module: VsmeModule,
  employeeCount: number,
  materiality: VsmeMateriality = "material"
): FieldApplicability {
  const moduleApplicability = getFieldModuleApplicability(
    sectionCode,
    module,
    employeeCount
  );
  return {
    ...moduleApplicability,
    materiality,
    requiredToFill: isRequiredToFill(module, employeeCount, materiality),
  };
}

export type SectionApplicabilityState = {
  sectionId: string;
  sectionCode: string;
  module: VsmeModule;
  title: string;
  visible: boolean;
  moduleInReportingScope: boolean;
  workflowLabel: VsmeWorkflowLabel;
  fieldCount: number;
  reportedCount: number;
  hasVoluntaryData: boolean;
};

export function resolveSectionApplicability(
  employeeCount: number,
  reportedFieldIds: Set<string> = new Set()
): SectionApplicabilityState[] {
  return VSME_SCHEMA.sections.map((section) => {
    const moduleInReportingScope = isSectionModuleInReportingScope(
      section,
      employeeCount
    );
    const sectionFieldIds = getFieldIdsForSection(section.code);
    const reportedCount = sectionFieldIds.filter((id) =>
      reportedFieldIds.has(id)
    ).length;
    const hasVoluntaryData = reportedCount > 0;

    return {
      sectionId: section.id,
      sectionCode: section.code,
      module: section.module,
      title: section.title,
      visible: isSectionVisible(section),
      moduleInReportingScope,
      workflowLabel: getSectionWorkflowLabel(section, employeeCount),
      fieldCount: sectionFieldIds.length,
      reportedCount,
      hasVoluntaryData,
    };
  });
}

/**
 * Field IDs that count toward mandatory completion (module scope × material).
 */
export function getMandatoryFieldIdsForExport(
  employeeCount: number,
  materialityByFieldId: Record<string, VsmeMateriality> = {},
  _reportedFieldIds: Set<string> = new Set()
): string[] {
  return getFieldIdsInModuleScope(employeeCount).filter((fieldId) => {
    const entry = getRegistryEntry(fieldId);
    if (!entry) {
      return false;
    }
    const materiality = getFieldMateriality(fieldId, materialityByFieldId);
    return isRequiredToFill(entry.module, employeeCount, materiality);
  });
}
