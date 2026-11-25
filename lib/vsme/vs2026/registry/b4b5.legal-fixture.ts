/**
 * Independent legal checkpoints for B4 and B5.
 * The registry implementation does not import this file.
 */

export const B4_REQUIRED_STATEMENTS = Object.freeze([
  "The undertaking shall disclose the emissions of pollutants to air, water and soil from its own operations",
  "required to report to competent authorities by EU or national law",
  "voluntarily reports according to an Environmental Management System",
  "If this information is already publicly available, the undertaking may alternatively refer to the document where it is reported",
  "A missing URL is not a valid public reference.",
  "An arbitrary URL does not by itself satisfy the disclosure.",
]);

export const B5_REQUIRED_STATEMENTS = Object.freeze([
  "If the undertaking has sites or locations in or near a biodiversity-sensitive area (BSA), it shall disclose them, and the name of the BSA.",
  "(partially) overlapping or adjacent",
  "A missing relationship row is not an assessed absence of a biodiversity-sensitive area.",
  "area of influence",
]);

export const B4_COMPLETION_IDS = Object.freeze([
  "B4_PUBLIC_DISCLOSURE_URL",
  "B4_POLLUTANT_IDENTITY",
  "B4_EMISSION_TO_AIR",
  "B4_EMISSION_TO_WATER",
  "B4_EMISSION_TO_SOIL",
]);

export const B4_OUTSIDE_COMPLETION_IDS = Object.freeze([
  "B4_REPORTING_CONDITION",
  "B4_DISCLOSURE_METHOD",
  "B4_PUBLIC_DISCLOSURE_FLAG",
  "B4_POLLUTANT_REPORTING_BASIS",
]);

export const B5_COMPLETION_IDS = Object.freeze([
  "B5_RELATIONSHIP_SITE_REFERENCE",
  "B5_BSA_NAME",
  "B5_BSA_RELATIONSHIP",
]);

export const B5_OUTSIDE_COMPLETION_IDS = Object.freeze([
  "B5_ASSESSED_SITE_REFERENCE",
  "B5_SITE_BSA_ASSESSMENT",
  "B5_RELATIONSHIP_BASIS",
  "B5_AREA_OF_INFLUENCE_DETERMINATION",
]);

export const B4_B5_REMOVED_LEGACY_IDS = Object.freeze([
  "B4_POLLUTION_REFERENCE_POLLUTION_NOT_REQUIRED_BY_LAW",
  "B5_BIODIVERSITY_SITES_SITES_IN_BIODIVERSITY_SENSITIVE_AREA_HA",
  "B5_LAND_USE_LAND_USE_TOTAL_HA",
  "B5_LAND_USE_LAND_SEALED_AREA_HA",
  "B5_LAND_USE_LAND_NATURE_ORIENTED_ON_SITE_HA",
  "B5_LAND_USE_LAND_NATURE_ORIENTED_OFF_SITE_HA",
]);

export const B4_B5_IDS_ADDED_BEYOND_MATRIX = Object.freeze([
  "B4_REPORTING_CONDITION",
  "B4_DISCLOSURE_METHOD",
  "B4_POLLUTANT_IDENTITY",
  "B4_EMISSION_TO_AIR",
  "B4_EMISSION_TO_WATER",
  "B4_EMISSION_TO_SOIL",
  "B4_POLLUTANT_REPORTING_BASIS",
  "B5_ASSESSED_SITE_REFERENCE",
  "B5_SITE_BSA_ASSESSMENT",
  "B5_RELATIONSHIP_SITE_REFERENCE",
  "B5_BSA_RELATIONSHIP",
  "B5_RELATIONSHIP_BASIS",
  "B5_AREA_OF_INFLUENCE_DETERMINATION",
]);
