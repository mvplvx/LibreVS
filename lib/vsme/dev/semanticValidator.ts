/**
 * DEV-ONLY semantic linting for VSME Phase 4F contract freeze.
 * Not imported from production request paths except via contractGuard (warnings).
 */
import {
  VSME_CONTRACT,
  VSME_CONTRACT_COMPLETENESS_KEYS,
  VSME_CONTRACT_DEPRECATED_API_KEYS,
  VSME_CONTRACT_KPI_METRIC_KEYS,
  VSME_CONTRACT_REGISTRY,
  VSME_CONTRACT_SNAPSHOT_PIPELINE,
} from "../CONTRACT";
import { isRequiredToFill } from "../materiality";
import type { VsmeMateriality } from "../materiality";
import { isLegacyFieldId } from "../migration/v1ToV2FieldMap";
import {
  VSME_B_FIELD_COUNT,
  VSME_C_FIELD_COUNT,
  VSME_FIELD_COUNT,
  VSME_FIELD_IDS,
  isRegisteredFieldId,
} from "../vsme.fieldRegistry";
import { isV2FieldId } from "../runtime/dataTruthMode";
import { VSME_SCHEMA_VERSION } from "../schemaVersion";
import { buildVsmeUiSchema } from "../vsme.uiSchema";
import type { VsmeUiSchema } from "../vsme.uiSchema";
import type { VsmePeriodSnapshot } from "../periodSnapshot";

export type SemanticValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function result(
  errors: string[],
  warnings: string[] = []
): SemanticValidationResult {
  return { ok: errors.length === 0, errors, warnings };
}

/** A. Registry field consistency */
export function validateRegistryContract(): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (VSME_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.totalFields) {
    errors.push(
      `registry field count ${VSME_FIELD_COUNT} !== contract ${VSME_CONTRACT_REGISTRY.totalFields}`
    );
  }
  if (VSME_B_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.bModuleFields) {
    errors.push(
      `B-module count ${VSME_B_FIELD_COUNT} !== contract ${VSME_CONTRACT_REGISTRY.bModuleFields}`
    );
  }
  if (VSME_C_FIELD_COUNT !== VSME_CONTRACT_REGISTRY.cModuleFields) {
    errors.push(
      `C-module count ${VSME_C_FIELD_COUNT} !== contract ${VSME_CONTRACT_REGISTRY.cModuleFields}`
    );
  }

  for (const fieldId of VSME_FIELD_IDS) {
    if (!isRegisteredFieldId(fieldId)) {
      errors.push(`registry list contains unregistered fieldId: ${fieldId}`);
    }
  }

  if (VSME_CONTRACT.version !== VSME_SCHEMA_VERSION) {
    warnings.push(
      `CONTRACT.version ${VSME_CONTRACT.version} !== VSME_SCHEMA_VERSION ${VSME_SCHEMA_VERSION}`
    );
  }

  return result(errors, warnings);
}

/** Reject v1 / orphan ids in STRICT_V2 GET payloads */
export function validateActiveFieldIds(
  fieldIds: string[],
  context: string
): SemanticValidationResult {
  const errors: string[] = [];
  for (const fieldId of fieldIds) {
    if (!isV2FieldId(fieldId)) {
      errors.push(
        `${context}: non-v2 fieldId "${fieldId}" (registry miss or legacy)`
      );
    }
    if (isLegacyFieldId(fieldId)) {
      errors.push(`${context}: known v1 legacy fieldId "${fieldId}" in active set`);
    }
  }
  return result(errors);
}

/** B. KPI / coverage naming */
export function validateKpiPayload(
  data: Record<string, unknown>,
  endpoint: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of VSME_CONTRACT_DEPRECATED_API_KEYS) {
    if (key in data) {
      warnings.push(
        `${endpoint}: deprecated top-level key "${key}" (see CONTRACT_API.md)`
      );
    }
  }

  for (const key of VSME_CONTRACT_KPI_METRIC_KEYS) {
    if (!(key in data)) {
      errors.push(`${endpoint}: missing frozen metric key "${key}"`);
    }
  }

  const completeness = data.completeness;
  if (completeness === null || typeof completeness !== "object") {
    errors.push(`${endpoint}: missing completeness object`);
  } else {
    const c = completeness as Record<string, unknown>;
    for (const key of VSME_CONTRACT_COMPLETENESS_KEYS) {
      if (!(key in c)) {
        errors.push(`${endpoint}: completeness missing "${key}"`);
      }
    }
    if (!("exportBlockingFields" in c)) {
      errors.push(`${endpoint}: completeness.exportBlockingFields required`);
    }
  }

  if ("bySection" in data && typeof data.bySection !== "object") {
    errors.push(`${endpoint}: bySection must be an object when present`);
  }

  return result(errors, warnings);
}

/** Export payload contract */
export function validateExportPayload(
  data: Record<string, unknown>,
  endpoint: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!("exportReady" in data)) {
    errors.push(`${endpoint}: missing exportReady`);
  }
  if (!("rows" in data) || !Array.isArray(data.rows)) {
    errors.push(`${endpoint}: missing rows[]`);
  } else {
    for (const row of data.rows as Array<Record<string, unknown>>) {
      const fieldId = row.fieldId;
      if (typeof fieldId !== "string" || !isV2FieldId(fieldId)) {
        errors.push(`${endpoint}: export row has non-v2 fieldId: ${String(fieldId)}`);
      }
      if (!row.excelCell) {
        warnings.push(`${endpoint}: export row missing excelCell for ${fieldId}`);
      }
    }
  }

  const validation = data.validation;
  if (validation === null || typeof validation !== "object") {
    errors.push(`${endpoint}: missing validation object`);
  } else {
    const v = validation as Record<string, unknown>;
    if (!("missingFieldIds" in v)) {
      errors.push(`${endpoint}: validation.missingFieldIds required`);
    }
    if ("missingFieldIds" in data) {
      warnings.push(
        `${endpoint}: missingFieldIds must not appear at export root`
      );
    }
  }

  return result(errors, warnings);
}

/** UI schema field shape */
export function validateUiSchemaPayload(
  data: Record<string, unknown>,
  endpoint: string
): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (data.schemaVersion !== VSME_SCHEMA_VERSION) {
    errors.push(
      `${endpoint}: schemaVersion ${data.schemaVersion} !== ${VSME_SCHEMA_VERSION}`
    );
  }

  let fieldCount = 0;
  const sections = data.sections;
  if (!Array.isArray(sections)) {
    return result([`${endpoint}: sections must be an array`]);
  }

  for (const section of sections as Array<Record<string, unknown>>) {
    const subs = section.subsections;
    if (!Array.isArray(subs)) continue;
    for (const sub of subs as Array<Record<string, unknown>>) {
      const fields = sub.fields;
      if (!Array.isArray(fields)) continue;
      for (const field of fields as Array<Record<string, unknown>>) {
        fieldCount += 1;
        const fieldId = field.fieldId;
        if (typeof fieldId !== "string" || !isRegisteredFieldId(fieldId)) {
          errors.push(`${endpoint}: invalid fieldId ${String(fieldId)}`);
        }
        const app = field.applicability as Record<string, unknown> | undefined;
        if (!app) {
          errors.push(`${endpoint}: field ${fieldId} missing applicability`);
          continue;
        }
        for (const k of [
          "module",
          "materiality",
          "moduleInReportingScope",
          "requiredToFill",
        ]) {
          if (!(k in app)) {
            errors.push(`${endpoint}: field ${fieldId} missing applicability.${k}`);
          }
        }
      }
    }
  }

  if (fieldCount !== VSME_CONTRACT_REGISTRY.totalFields) {
    errors.push(`${endpoint}: field count ${fieldCount} !== 264`);
  }

  return result(errors, warnings);
}

/** Align UI schema requiredToFill with materiality + module rules */
export function validateRequiredToFillConsistency(
  employeeCount: number,
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): SemanticValidationResult {
  const errors: string[] = [];
  const schema = buildVsmeUiSchema(employeeCount, materialityByFieldId);

  for (const section of schema.sections) {
    for (const sub of section.subsections) {
      for (const field of sub.fields) {
        const expected = isRequiredToFill(
          field.applicability.module,
          employeeCount,
          field.applicability.materiality
        );
        if (field.applicability.requiredToFill !== expected) {
          errors.push(
            `requiredToFill mismatch for ${field.fieldId}: schema=${field.applicability.requiredToFill} expected=${expected}`
          );
        }
      }
    }
  }

  return result(errors);
}

/** Compare snapshot completeness vs UI schema for same inputs */
export function validateSnapshotVsUiSchema(
  snapshot: VsmePeriodSnapshot,
  employeeCount: number,
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): SemanticValidationResult {
  const errors: string[] = [];
  const schema = buildVsmeUiSchema(
    employeeCount,
    materialityByFieldId,
    new Set(snapshot.reportedFieldIds)
  );

  const requiredFromUi = new Set<string>();
  for (const section of schema.sections) {
    for (const sub of section.subsections) {
      for (const field of sub.fields) {
        if (field.applicability.requiredToFill) {
          requiredFromUi.add(field.fieldId);
        }
      }
    }
  }

  const requiredFromSnapshot = new Set(snapshot.completeness.requiredFieldIds);
  for (const id of requiredFromUi) {
    if (!requiredFromSnapshot.has(id)) {
      errors.push(`snapshot missing required field from ui-schema: ${id}`);
    }
  }
  for (const id of requiredFromSnapshot) {
    if (!requiredFromUi.has(id)) {
      errors.push(`ui-schema missing required field from snapshot: ${id}`);
    }
  }

  return result(errors);
}

/** C. Cross-endpoint snapshot derivation (static contract) */
export function validateSnapshotPipelineContract(): SemanticValidationResult {
  const warnings: string[] = [];
  warnings.push(
    `Period metrics must use ${VSME_CONTRACT_SNAPSHOT_PIPELINE.loader} → ${VSME_CONTRACT_SNAPSHOT_PIPELINE.builder}; routes: ${VSME_CONTRACT_SNAPSHOT_PIPELINE.routes.join(", ")}`
  );
  return result([], warnings);
}

export function mergeResults(
  ...parts: SemanticValidationResult[]
): SemanticValidationResult {
  const errors = parts.flatMap((p) => p.errors);
  const warnings = parts.flatMap((p) => p.warnings);
  return result(errors, warnings);
}
