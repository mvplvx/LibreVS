import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure, Vs2026RepeatingGroup } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  unverifiedXbrl,
  verifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, knowledgeHubUnavailable } from "./references";

/**
 * Annex I disclosure B5, paragraph 35, with the Appendix A meanings of
 * biodiversity-sensitive area and near.
 * Sites are references to B1_SITE. This disclosure does not create a second site inventory.
 * Paragraph 35 has no square-bracket employee-size relief and is not an Annex II row.
 * Phase 1B recorded no publishable Knowledge Hub URL for paragraph 35.
 */

const PARAGRAPH_35 =
  "If the undertaking has sites or locations in or near a biodiversity-sensitive area (BSA), it shall disclose them, and the name of the BSA.";

const NO_PARAGRAPH_35_URL = knowledgeHubUnavailable(
  "Phase 1B recorded no publishable Knowledge Hub URL for Annex I paragraph 35. The legal source remains the Regulation ELI.",
);

const WHEN_IN_OR_NEAR = Object.freeze({
  kind: "WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA",
} as const);

const SITE_VALUE = Object.freeze({
  kind: "SITE_REFERENCE" as const,
  inventory: "B1_SITE" as const,
  identifierDatapointId: "B1_SITE_IDENTIFIER" as const,
  createsSecondInventory: false as const,
});

function b5(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule" | "annexII" | "knowledgeHub">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B5",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    annexII: ANNEX_II_NOT_LISTED,
    knowledgeHub: NO_PARAGRAPH_35_URL,
    ...point,
  });
}

const ASSESSED_SITE = b5({
  id: "B5_ASSESSED_SITE_REFERENCE",
  paragraph: "35",
  regulatoryStatement:
    "Identity of a B1 site whose relationship to biodiversity-sensitive areas has been assessed.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B5_SITE_ASSESSMENT",
  value: SITE_VALUE,
  xbrl: unverifiedXbrl(
    "The site identity is B1_SITE_IDENTIFIER. IdentifierOfSiteTypedAxis is an axis, not an item concept.",
  ),
  validationNote:
    "This reference does not copy the B1 address. Absence of an assessment record leaves the site UNASSESSED.",
});

const ASSESSMENT_STATE = b5({
  id: "B5_SITE_BSA_ASSESSMENT",
  paragraph: "35",
  regulatoryStatement: PARAGRAPH_35,
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B5_SITE_ASSESSMENT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "RELATIONSHIP_IDENTIFIED",
        legalText:
          "The site has been assessed and at least one biodiversity-sensitive area relationship is identified.",
      },
      {
        id: "NO_IDENTIFIED_RELATIONSHIP",
        legalText:
          "The site has been assessed and no site or location in or near a biodiversity-sensitive area was identified.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The assessment state is preparation data. SiteLocatedInABiodiversitySensitiveArea and SiteLocatedNearABiodiversitySensitiveArea are named in the audit note with mapping status UNVERIFIED, so no QName is stored.",
  ),
  validationNote:
    "Absence of an assessment record is UNASSESSED. UNASSESSED is not NO_IDENTIFIED_RELATIONSHIP. A missing relationship row is not an assessed absence of a biodiversity-sensitive area. No distance threshold is stored.",
});

const RELATIONSHIP_SITE = b5({
  id: "B5_RELATIONSHIP_SITE_REFERENCE",
  paragraph: "35",
  regulatoryStatement: PARAGRAPH_35,
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_IN_OR_NEAR,
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP",
  value: SITE_VALUE,
  xbrl: unverifiedXbrl(
    "The disclosed site is a reference to B1_SITE. SiteLocatedInABiodiversitySensitiveArea and SiteLocatedNearABiodiversitySensitiveArea remain UNVERIFIED in the mapping file, so no QName is stored.",
  ),
});

const BSA_NAME = b5({
  id: "B5_BSA_NAME",
  paragraph: "35",
  regulatoryStatement: `${PARAGRAPH_35} The name of the biodiversity-sensitive area is part of that disclosure.`,
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_IN_OR_NEAR,
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP",
  value: { kind: "TEXT" },
  xbrl: verifiedXbrl("vs:NameOfBiodiversitySensitiveArea", {
    note: "Paragraph 35 requires the name of each biodiversity-sensitive area. The name is repeated with the site relationship.",
  }),
  dataSourceNote:
    "Appendix A defines biodiversity-sensitive areas as areas protected through legal or other effective means, and areas included under the scientifically recognised designations listed in that definition. Those designations are examples in the definition, not separate datapoints.",
});

const RELATIONSHIP = b5({
  id: "B5_BSA_RELATIONSHIP",
  paragraph: "35",
  regulatoryStatement:
    "Near, in the context of B5 – Biodiversity, shall refer to a site that is (partially) overlapping or adjacent to a biodiversity-sensitive area.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_IN_OR_NEAR,
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "LOCATED_IN",
        legalText: "The site or location is in a biodiversity-sensitive area.",
      },
      {
        id: "NEAR_OVERLAPPING_OR_ADJACENT",
        legalText:
          "The site is near a biodiversity-sensitive area, meaning (partially) overlapping or adjacent.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "Located-in and near are the paragraph 35 relationship. The audit names SiteLocatedInABiodiversitySensitiveArea and SiteLocatedNearABiodiversitySensitiveArea with mapping status UNVERIFIED, so no QName is stored.",
  ),
  validationNote:
    "Partial overlap is the Appendix A meaning of near. It is not a distance threshold. A site may have more than one relationship row.",
});

const RELATIONSHIP_BASIS = b5({
  id: "B5_RELATIONSHIP_BASIS",
  paragraph: "35",
  regulatoryStatement:
    "Supporting source or assessment basis for a site relationship to a named biodiversity-sensitive area.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_IN_OR_NEAR,
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B5_SITE_BSA_RELATIONSHIP",
  value: { kind: "TEXT" },
  xbrl: unverifiedXbrl(
    "The assessment basis is supporting metadata. No item concept was verified for it.",
  ),
  validationNote:
    "The basis does not replace the site reference or the area name. No geospatial intersection, map service, or external area database is consulted.",
});

const AREA_OF_INFLUENCE = b5({
  id: "B5_AREA_OF_INFLUENCE_DETERMINATION",
  paragraph: "Appendix A",
  regulatoryStatement:
    "If the undertaking's site is outside but not adjacent to a biodiversity-sensitive area, the undertaking may also determine if it is near such an area by defining the site's area of influence. The area of influence can be determined by applying buffer distances specific to the undertaking's type of activity following regulatory requirements, science-based recommendations and industry best practice.",
  requirementType: "VOLUNTARY",
  applicability: { kind: "WHEN_SITE_IS_OUTSIDE_AND_NOT_ADJACENT" },
  role: "REGULATORY_DATAPOINT",
  informationClass: "SUPPLEMENTARY",
  value: { kind: "NARRATIVE" },
  xbrl: unverifiedXbrl(
    "Appendix A permits an area-of-influence determination. No item concept and no distance threshold were verified.",
  ),
  validationNote:
    "This Appendix A permission does not replace overlapping or adjacent. No distance threshold is stored. It is outside the paragraph 35 shall.",
});

const SITE_ASSESSMENT: Vs2026RepeatingGroup = Object.freeze({
  id: "B5_SITE_ASSESSMENT",
  disclosure: "B5",
  paragraph: "35",
  regulatoryStatement:
    "Assessment of each B1 site. An absent record means the site has not been assessed.",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: { kind: "ALWAYS" } satisfies ApplicabilityCondition,
  siteInventory: "B1_SITE",
  components: Object.freeze([ASSESSED_SITE, ASSESSMENT_STATE]),
});

const SITE_RELATIONSHIPS: Vs2026RepeatingGroup = Object.freeze({
  id: "B5_SITE_BSA_RELATIONSHIP",
  disclosure: "B5",
  paragraph: "35",
  regulatoryStatement: PARAGRAPH_35,
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: WHEN_IN_OR_NEAR satisfies ApplicabilityCondition,
  siteInventory: "B1_SITE",
  relationshipsPerSite: "ZERO_OR_MORE",
  components: Object.freeze([
    RELATIONSHIP_SITE,
    BSA_NAME,
    RELATIONSHIP,
    RELATIONSHIP_BASIS,
  ]),
});

export const B5_FOLDED_PROPOSED_IDS = Object.freeze([
  "B5_SITE_IN_BSA",
  "B5_SITE_NEAR_BSA",
]);

export const B5_NOT_CARRIED_FORWARD = Object.freeze([
  Object.freeze({
    legacyId: "B5_BIODIVERSITY_SITES_SITES_IN_BIODIVERSITY_SENSITIVE_AREA_HA",
    reason:
      "Paragraph 35 requires the sites and the name of the biodiversity-sensitive area. The area in hectares is not an Annex I datapoint.",
  }),
  Object.freeze({
    legacyId: "B5_LAND_USE_LAND_USE_TOTAL_HA",
    reason:
      "Land-use area metrics are not in Annex I paragraph 35. The empty land-use presentation role is not a disclosure.",
  }),
  Object.freeze({
    legacyId: "B5_LAND_USE_LAND_SEALED_AREA_HA",
    reason:
      "Land-use area metrics are not in Annex I paragraph 35. The empty land-use presentation role is not a disclosure.",
  }),
  Object.freeze({
    legacyId: "B5_LAND_USE_LAND_NATURE_ORIENTED_ON_SITE_HA",
    reason:
      "Land-use area metrics are not in Annex I paragraph 35. The empty land-use presentation role is not a disclosure.",
  }),
  Object.freeze({
    legacyId: "B5_LAND_USE_LAND_NATURE_ORIENTED_OFF_SITE_HA",
    reason:
      "Land-use area metrics are not in Annex I paragraph 35. The empty land-use presentation role is not a disclosure.",
  }),
]);

export const B5_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B5",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Biodiversity",
  paragraphs: Object.freeze(["35", "Appendix A"]),
  datapoints: Object.freeze([AREA_OF_INFLUENCE]),
  repeatingGroups: Object.freeze([SITE_ASSESSMENT, SITE_RELATIONSHIPS]),
  guidanceDatapoints: Object.freeze([]),
});

export function b5Datapoints(): readonly Vs2026Datapoint[] {
  return [
    ...B5_DISCLOSURE.repeatingGroups.flatMap((group) => group.components),
    ...B5_DISCLOSURE.datapoints,
  ];
}

export function b5AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b5Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
