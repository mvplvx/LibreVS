import type { EmployeeCategory } from "../types";
import {
  annexIIMembershipForEmployeeCategory,
  type AnnexIIMembership,
} from "../annexII";
import { B1_DISCLOSURE } from "./b1";
import { B2_DISCLOSURE } from "./b2";
import type {
  AnnexIILink,
  Vs2026Datapoint,
  Vs2026Disclosure,
} from "./types";

export { B1_DISCLOSURE } from "./b1";
export { APPENDIX_B_TOPICS, B2_DISCLOSURE } from "./b2";
export {
  B3_DISCLOSURE,
  B3_FOLDED_BREAKDOWN_IDS,
  B3_NOT_CARRIED_FORWARD,
  B3_REPLACED_SCOPE3_SLOT_IDS,
  b3AnnexIDatapoints,
  b3Datapoints,
} from "./b3";
export {
  B4_DISCLOSURE,
  B4_FOLDED_PROPOSED_IDS,
  B4_NOT_CARRIED_FORWARD,
  b4AnnexIDatapoints,
  b4Datapoints,
} from "./b4";
export {
  B5_DISCLOSURE,
  B5_FOLDED_PROPOSED_IDS,
  B5_NOT_CARRIED_FORWARD,
  b5AnnexIDatapoints,
  b5Datapoints,
} from "./b5";
export {
  B6_DISCLOSURE,
  b6AnnexIDatapoints,
  b6Datapoints,
} from "./b6";
export {
  B7_DISCLOSURE,
  B7_FOLDED_PROPOSED_IDS,
  b7AnnexIDatapoints,
  b7Datapoints,
} from "./b7";
export {
  B8_DISCLOSURE,
  B8_NOT_CARRIED_FORWARD,
  b8AnnexIDatapoints,
  b8Datapoints,
} from "./b8";
export {
  B9_DISCLOSURE,
  b9AnnexIDatapoints,
  b9Datapoints,
} from "./b9";
export {
  B10_DISCLOSURE,
  B10_NOT_CARRIED_FORWARD,
  b10AnnexIDatapoints,
  b10Datapoints,
} from "./b10";
export {
  B11_DISCLOSURE,
  b11AnnexIDatapoints,
  b11Datapoints,
} from "./b11";
export { VERIFIED_KNOWLEDGE_HUB } from "./references";
export type {
  AnnexIILink,
  KnowledgeHubReference,
  Vs2026Datapoint,
  Vs2026Disclosure,
  Vs2026RepeatingGroup,
  XbrlMapping,
} from "./types";

/**
 * Paragraph 18 was filed under B1 in the migration matrix.
 * Annex I places it with the general timing rules, before disclosure B1.
 * Paragraph 14 comparative information is also outside B1 and B2.
 */
export const EXAMINED_OUTSIDE_B1_B2 = Object.freeze([
  Object.freeze({
    matrixId: "B1_PREVIOUS_DISCLOSURES_UNCHANGED",
    paragraph: "18",
    qname:
      "vs:ReportContainsDisclosuresFromThePreviousReportingPeriodThatRemainUnchanged",
    decision:
      "Annex I paragraph 18 allows a reference to unchanged datapoints in the previous report. It is not a B1 or B2 datapoint. Comparative information under paragraph 14 is also deferred.",
  }),
]);

export const B1_B2_DISCLOSURES: readonly Vs2026Disclosure[] = Object.freeze([
  B1_DISCLOSURE,
  B2_DISCLOSURE,
]);

export function disclosureDatapoints(
  disclosure: Vs2026Disclosure,
  includeGuidance = false,
): readonly Vs2026Datapoint[] {
  const grouped = disclosure.repeatingGroups.flatMap((group) => group.components);
  const guidance = includeGuidance ? disclosure.guidanceDatapoints : [];
  return [...disclosure.datapoints, ...grouped, ...guidance];
}

export function b1b2Datapoints(includeGuidance = false): readonly Vs2026Datapoint[] {
  return B1_B2_DISCLOSURES.flatMap((disclosure) =>
    disclosureDatapoints(disclosure, includeGuidance),
  );
}

export function annexIIFor(
  link: AnnexIILink,
  category: EmployeeCategory,
): AnnexIIMembership | { readonly status: "NOT_LISTED" } {
  if (!link.listed) {
    return { status: "NOT_LISTED" };
  }
  return annexIIMembershipForEmployeeCategory(
    { disclosure: link.disclosure, reference: link.reference },
    category,
  );
}
