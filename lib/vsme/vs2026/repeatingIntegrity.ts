import {
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
  disclosureDatapoints,
} from "./registry";
import type { Vs2026Datapoint, Vs2026Disclosure } from "./registry/types";

/**
 * Structural rules for the repeating tables.
 * This module is not imported by routes, autosave, or exports.
 * It does not duplicate regulatory text. Group and datapoint ids come from the registry.
 */

const DISCLOSURES: readonly Vs2026Disclosure[] = [
  B1_DISCLOSURE,
  B2_DISCLOSURE,
  B3_DISCLOSURE,
  B4_DISCLOSURE,
  B5_DISCLOSURE,
  B6_DISCLOSURE,
  B7_DISCLOSURE,
  B8_DISCLOSURE,
  B9_DISCLOSURE,
  B10_DISCLOSURE,
  B11_DISCLOSURE,
];

/** Canonical empty dimension. A database NULL would not keep the unique constraint unique. */
export const NO_DIMENSION_MEMBER = "";

export type RepeatingParent = {
  readonly id: string;
  readonly groupId: string;
  readonly reportingPeriodId: string;
};

export type RepeatingParentRejection =
  | "PARENT_REQUIRED"
  | "PARENT_NOT_ALLOWED"
  | "PARENT_NOT_SITE"
  | "PARENT_PERIOD_MISMATCH";

export type RepeatingParentDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: RepeatingParentRejection };

export function siteReferencingGroupIds(): readonly string[] {
  return DISCLOSURES.flatMap((disclosure) =>
    disclosure.repeatingGroups
      .filter((group) => group.siteInventory === "B1_SITE")
      .map((group) => group.id),
  );
}

/**
 * Registry repeating groups use their group id.
 * A dimensioned or repeating value with no group uses its datapoint id as the storage group.
 * Ordinary scalars stay on SustainabilityDataPoint and return null.
 */
export function repeatingStorageGroupId(datapoint: Vs2026Datapoint): string | null {
  if (datapoint.repeatingGroupId) {
    return datapoint.repeatingGroupId;
  }
  const kind = datapoint.value.kind;
  if (
    kind === "REPEATING_QUANTITY" ||
    kind === "REPEATING_REFERENCES" ||
    kind === "DIMENSIONED_QUANTITY"
  ) {
    return datapoint.id;
  }
  return null;
}

export function normalizeDimensionMember(member: string | null | undefined): string {
  if (member === null || member === undefined) {
    return NO_DIMENSION_MEMBER;
  }
  const trimmed = member.trim();
  return trimmed === "" ? NO_DIMENSION_MEMBER : trimmed;
}

/**
 * B5 and B6 rows must name a B1_SITE row in the same reporting period.
 * PostgreSQL checks that the parent row exists and has the same reportingPeriodId.
 * This function checks that the parent group is B1_SITE and that only site-referencing groups have a parent.
 * Writers must call it in the same transaction as the insert.
 */
export function validateRepeatingParent(input: {
  readonly groupId: string;
  readonly reportingPeriodId: string;
  readonly parent: RepeatingParent | null;
}): RepeatingParentDecision {
  const requiresSite = siteReferencingGroupIds().includes(input.groupId);
  if (!requiresSite) {
    return input.parent === null
      ? { ok: true }
      : { ok: false, reason: "PARENT_NOT_ALLOWED" };
  }
  if (input.parent === null) {
    return { ok: false, reason: "PARENT_REQUIRED" };
  }
  if (input.parent.groupId !== "B1_SITE") {
    return { ok: false, reason: "PARENT_NOT_SITE" };
  }
  if (input.parent.reportingPeriodId !== input.reportingPeriodId) {
    return { ok: false, reason: "PARENT_PERIOD_MISMATCH" };
  }
  return { ok: true };
}

export type RepeatingCellRejection = "UNKNOWN_DATAPOINT" | "SCALAR_DATAPOINT" | "GROUP_MISMATCH";

export type RepeatingCellDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: RepeatingCellRejection };

/**
 * The database accepts any datapoint id string.
 * Callers must use this check so a scalar fact is not stored as a repeating cell,
 * and a cell is not attached to a different group.
 */
export function validateRepeatingCell(input: {
  readonly rowGroupId: string;
  readonly datapointId: string;
}): RepeatingCellDecision {
  const datapoint = registryDatapoint(input.datapointId);
  if (!datapoint) {
    return { ok: false, reason: "UNKNOWN_DATAPOINT" };
  }
  const groupId = repeatingStorageGroupId(datapoint);
  if (groupId === null) {
    return { ok: false, reason: "SCALAR_DATAPOINT" };
  }
  if (groupId !== input.rowGroupId) {
    return { ok: false, reason: "GROUP_MISMATCH" };
  }
  return { ok: true };
}

export function registryDatapoint(datapointId: string): Vs2026Datapoint | undefined {
  for (const disclosure of DISCLOSURES) {
    const found = disclosureDatapoints(disclosure, true).find((item) => item.id === datapointId);
    if (found) {
      return found;
    }
  }
  return undefined;
}
