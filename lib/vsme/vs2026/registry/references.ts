import type { AnnexIILink, KnowledgeHubReference } from "./types";
import { VS2026_REGISTRY_STANDARD } from "./types";

const ELI = VS2026_REGISTRY_STANDARD.eli;

/**
 * Paragraph URLs that Phase 1B marked publishable.
 * Each URL is a shared paragraph page, not a datapoint deep link.
 * URLs are copied in full. They are not assembled from a pattern.
 */
export const VERIFIED_KNOWLEDGE_HUB = {
  "27(a)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/a",
  "27(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/b",
  "27(c)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/c",
  "27(d)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/d",
  "27(e)(i)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/i",
  "27(e)(iii)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/iii",
  "27(e)(iv)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/iv",
  "27(e)(v)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/v",
  "27(e)(vi)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/vi",
  "27(e)(vii)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/27/e/vii",
  "28":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/28",
  "29-31":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/29-31",
  "32":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/32",
  "33":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/33",
  "34":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/34",
  "36":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/36",
  "37":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/37",
  "38":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/38",
  "39(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/39/b",
  "39(c)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/39/c",
  "40(a)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/a",
  "40(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/b",
  "40(c)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/40/c",
  "41(a)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/41/a",
  "41(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/41/b",
  "42(a)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/a",
  "42(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/b",
  "42(c)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/c",
  "42(d)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/42/d",
  "43":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/43",
  "49-52":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard/standard-for-voluntary-use/da/49-52",
  "guidance-15(a)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard-non-mandatory-efrag-guidance/voluntary-standard-non-mandatory-efrag-guidance/2026-efrag-guidance/15/a",
  "guidance-15(b)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard-non-mandatory-efrag-guidance/voluntary-standard-non-mandatory-efrag-guidance/2026-efrag-guidance/15/b",
  "guidance-15(c)":
    "https://knowledgehub.efrag.org/eng/interactive/voluntary-standard-non-mandatory-efrag-guidance/voluntary-standard-non-mandatory-efrag-guidance/2026-efrag-guidance/15/c",
} as const;

export function verifiedParagraph(
  paragraph: keyof typeof VERIFIED_KNOWLEDGE_HUB,
): KnowledgeHubReference {
  return Object.freeze({
    status: "VERIFIED_PARAGRAPH",
    paragraph,
    url: VERIFIED_KNOWLEDGE_HUB[paragraph],
    sharedByDatapointsInParagraph: true,
  });
}

export function knowledgeHubUnavailable(reason: string): KnowledgeHubReference {
  return Object.freeze({
    status: "UNAVAILABLE",
    legalSourceUrl: ELI,
    reason,
  });
}

/** Annex II references copied from the canonical dataset keys, not a second table. */
export const ANNEX_II_B1 = {
  moduleOption: Object.freeze({
    listed: true,
    disclosure: "B1",
    reference: "Para 27, point (a), subpoints (i) and (ii)",
  }),
  reportingBasis: Object.freeze({
    listed: true,
    disclosure: "B1",
    reference: "Para 27, point (c)",
  }),
  undertakingInformation: Object.freeze({
    listed: true,
    disclosure: "B1",
    reference: "Para 27, point (e), subpoints from (i) to (vii)",
  }),
} as const satisfies Record<string, AnnexIILink>;

export const ANNEX_II_NOT_LISTED: AnnexIILink = Object.freeze({ listed: false });
