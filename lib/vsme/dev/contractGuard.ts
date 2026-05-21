/**
 * DEV-ONLY runtime contract guard (warnings only — never throws in production).
 */
import type { VsmeMateriality } from "../materiality";
import type { VsmePeriodSnapshot } from "../periodSnapshot";
import type { VsmeUiSchema } from "../vsme.uiSchema";
import {
  validateActiveFieldIds,
  validateKpiPayload,
  validateRequiredToFillConsistency,
  validateSnapshotVsUiSchema,
  type SemanticValidationResult,
} from "./semanticValidator";

const PREFIX = "[VSME Contract]";

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

function emitWarnings(result: SemanticValidationResult, context: string): void {
  for (const msg of result.errors) {
    console.warn(`${PREFIX} ${context}: ${msg}`);
  }
  for (const msg of result.warnings) {
    console.warn(`${PREFIX} ${context}: ${msg}`);
  }
}

/** Warn when KPI-shaped API payloads include deprecated or forbidden keys */
export function guardKpiApiPayload(
  data: Record<string, unknown>,
  endpoint: string
): void {
  if (!isDev()) return;
  emitWarnings(validateKpiPayload(data, endpoint), endpoint);
}

/** Warn when GET datapoint/export rows expose non-v2 fieldIds */
export function guardActiveFieldIds(fieldIds: string[], context: string): void {
  if (!isDev()) return;
  emitWarnings(validateActiveFieldIds(fieldIds, context), context);
}

/** Warn when ui-schema requiredToFill diverges from snapshot required set */
export function guardRequiredToFillAlignment(
  snapshot: VsmePeriodSnapshot,
  employeeCount: number,
  materialityByFieldId: Record<string, VsmeMateriality> = {}
): void {
  if (!isDev()) return;
  emitWarnings(
    validateRequiredToFillConsistency(employeeCount, materialityByFieldId),
    "requiredToFill-rule"
  );
  emitWarnings(
    validateSnapshotVsUiSchema(snapshot, employeeCount, materialityByFieldId),
    "snapshot-vs-ui-schema"
  );
}

/** Warn on ui-schema build drift (dev boot / API) */
export function guardUiSchemaBuild(schema: VsmeUiSchema): void {
  if (!isDev()) return;
  let required = 0;
  for (const section of schema.sections) {
    for (const sub of section.subsections) {
      for (const field of sub.fields) {
        if (field.applicability.requiredToFill) {
          required += 1;
        }
      }
    }
  }
  if (schema.employeeCount < 500 && required > 215) {
    console.warn(
      `${PREFIX} ui-schema: employeeCount=${schema.employeeCount} but ${required} requiredToFill fields (expected ≤215 B-only)`
    );
  }
  if (schema.employeeCount >= 500 && required < 264) {
    console.warn(
      `${PREFIX} ui-schema: employeeCount=${schema.employeeCount} but only ${required} requiredToFill fields (expected 264 at full scope)`
    );
  }
}
