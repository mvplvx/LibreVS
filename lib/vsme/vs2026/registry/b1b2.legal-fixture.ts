/**
 * Independent B1/B2 expectations taken from Annex I and the Phase 1B matrix.
 * The registry modules must not import this file.
 */

export const B1_B2_REQUIRED_STATEMENTS = [
  "OPTION A: Basic Module (only)",
  "OPTION B: Basic Module and Comprehensive Module",
  "explicit statement of compliance",
  "paragraph 22 on omission of information",
  "individual basis",
  "consolidated basis",
  "registered address",
  "legal form",
  "NACE sector classification code(s)",
  "size of the balance sheet",
  "turnover (in monetary units)",
  "headcount or full-time equivalents",
  "country of primary operations and location of significant asset(s)",
  "geolocation of sites owned, leased or managed",
  "sustainability-related certification or label",
  "publicly available",
  "separate environmental, social or governance policies",
  "future initiatives or forward-looking plans",
  "targets to monitor the implementation of the policies",
  "Appendix B provides a list of possible sustainability issues",
  "datapoints found in C2",
] as const;

/** Appendix B topic column. Sub-topics are not separate required datapoints. */
export const APPENDIX_B_TOPIC_FIXTURE = [
  "Climate Change",
  "Pollution",
  "Water",
  "Biodiversity and Ecosystems",
  "Circular Economy and Resource Use",
  "Own Workforce and Workers in the Value Chain",
  "Affected Communities",
  "Consumers and End-users",
  "Business Conduct",
] as const;

/**
 * Registry ids that split a matrix row into one component per verified concept,
 * or that keep a legal distinction the taxonomy concept folds together.
 */
export const B1_B2_IDS_ADDED_BEYOND_MATRIX = [
  "B1_SUBSIDIARY_NAME",
  "B1_SUBSIDIARY_REGISTERED_ADDRESS",
  "B1_SITE_ADDRESS",
  "B1_SITE_POSTAL_CODE",
  "B1_SITE_CITY",
  "B1_SITE_COUNTRY",
  "B2_HAS_PRACTICES",
  "B2_HAS_POLICIES",
  "B2_SEPARATE_ESG_POLICIES",
  "B2_HAS_FUTURE_INITIATIVES",
] as const;

export const MATRIX_IDS_OUTSIDE_B1_B2 = ["B1_PREVIOUS_DISCLOSURES_UNCHANGED"] as const;
