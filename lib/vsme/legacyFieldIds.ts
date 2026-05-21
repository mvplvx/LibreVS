import { isLegacyFieldId as isKnownLegacyFieldId } from "./migration/v1ToV2FieldMap";
import { isRegisteredFieldId } from "./vsme.fieldRegistry";

const warnedContexts = new Set<string>();

export function partitionFieldIds(fieldIds: string[]): {
  registered: string[];
  legacyOrphans: string[];
} {
  const registered: string[] = [];
  const legacyOrphans: string[] = [];

  for (const fieldId of fieldIds) {
    if (isRegisteredFieldId(fieldId)) {
      registered.push(fieldId);
    } else {
      legacyOrphans.push(fieldId);
    }
  }

  return { registered, legacyOrphans };
}

/**
 * Log unmigrated legacy fieldIds once per context (dev only).
 * Skips rows already classified via migrationStatus on the datapoint.
 */
export function warnLegacyFieldIds(
  fieldIds: string[],
  context: string,
  migrationStatuses?: Array<string | null | undefined>
): string[] {
  const orphans = fieldIds.filter((id, i) => {
    if (isRegisteredFieldId(id)) {
      return false;
    }
    const status = migrationStatuses?.[i];
    if (status === "migrated" || status === "legacy_only") {
      return false;
    }
    return true;
  });

  if (orphans.length === 0) {
    return [];
  }

  const key = `${context}:${[...new Set(orphans)].sort().join(",")}`;
  if (
    process.env.NODE_ENV === "development" &&
    !warnedContexts.has(key)
  ) {
    warnedContexts.add(key);
    console.warn(
      `[LibreVS] Unmigrated legacy fieldId(s) in ${context}: ${[...new Set(orphans)].join(", ")}`
    );
  }

  return [...new Set(orphans)];
}

export { isKnownLegacyFieldId as isLegacyFieldId };
