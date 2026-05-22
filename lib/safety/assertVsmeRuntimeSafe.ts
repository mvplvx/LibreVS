import { validateRegistryAtRuntime } from "@/lib/system/registryHealth";
import { VSME_SCHEMA_VERSION } from "@/lib/vsme/schemaVersion";
import {
  getRegistryEntry,
  isRegisteredFieldId,
} from "@/lib/vsme/vsme.fieldRegistry";
import type { VsmeRegistryEntry } from "@/lib/vsme/vsme.fieldRegistry";

/** Canonical schema version with safe fallback (never throws). */
export function getSafeSchemaVersion(): string {
  return VSME_SCHEMA_VERSION ?? "2.0.0";
}

export function isRegistryFieldId(fieldId: string | null | undefined): boolean {
  if (!fieldId?.trim()) {
    return false;
  }
  return isRegisteredFieldId(fieldId.trim());
}

/** Avoid undefined registry access in UI/API adapters. */
export function safeGetRegistryEntry(
  fieldId: string | null | undefined
): VsmeRegistryEntry | null {
  if (!isRegistryFieldId(fieldId)) {
    return null;
  }
  return getRegistryEntry(fieldId!.trim()) ?? null;
}

export function assertRegistryLoaded(expectedCount = 264): void {
  const health = validateRegistryAtRuntime();
  if (health.fieldCount !== expectedCount) {
    console.warn(
      `[LibreVS] Registry field count ${health.fieldCount} (expected ${expectedCount})`
    );
  }
}
