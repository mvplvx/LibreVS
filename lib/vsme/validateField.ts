import { VSME_FIELD_REGISTRY } from "./vsme.fieldRegistry";

export function validateFieldId(fieldId: string): boolean {
  if (!fieldId || typeof fieldId !== "string") {
    return false;
  }
  return fieldId in VSME_FIELD_REGISTRY;
}

export function assertValidFieldId(fieldId: string): void {
  if (!validateFieldId(fieldId)) {
    throw new Error(`Unknown VSME fieldId: ${fieldId}`);
  }
}
