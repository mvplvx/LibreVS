import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure, Vs2026RepeatingGroup } from "./types";
import {
  VOLUNTARY_FOR_EMPLOYEES_LE_10,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B6, paragraphs 36 and 37.
 * Paragraph 36 total withdrawal is the only B6 Annex II row.
 * Paragraph 37 consumption uses the production-process boundary.
 * The square-bracket relief is voluntaryForEmployeesLe10. It is not applicability.
 */

const WHEN_PROCESSES = Object.freeze({
  kind: "WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST",
} as const);

const WHEN_STRESS = Object.freeze({
  kind: "WHEN_SITE_IS_IN_WATER_STRESS",
} as const);

const ANNEX_WITHDRAWAL = Object.freeze({
  listed: true as const,
  disclosure: "B6" as const,
  reference: "Para 36",
});

const WATER = Object.freeze({
  kind: "QUANTITY" as const,
  reportedUnit: "m3" as const,
  inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR" as const,
});

const NO_FACTORS = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

const SITE_VALUE = Object.freeze({
  kind: "SITE_REFERENCE" as const,
  inventory: "B1_SITE" as const,
  identifierDatapointId: "B1_SITE_IDENTIFIER" as const,
  createsSecondInventory: false as const,
});

function b6(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B6",
    module: "BASIC",
    employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
    ...point,
  });
}

const PROCESSES = b6({
  id: "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
  paragraph: "37",
  regulatoryStatement:
    "If the undertaking has production processes in place which significantly consume water (e.g. thermal energy processes like drying or power production, production of goods, agricultural irrigation, etc.), it shall disclose its water consumption.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "PROCESSES_EXIST",
        legalText: "Production processes that significantly consume water have been identified.",
      },
      {
        id: "NO_SUCH_PROCESSES_IDENTIFIED",
        legalText: "No production processes that significantly consume water have been identified.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The process condition is preparation data. The examples in paragraph 37 are not an exhaustive member list.",
  ),
  validationNote:
    "An empty value is UNASSESSED. UNASSESSED is not NO_SUCH_PROCESSES_IDENTIFIED. Company.industry and NACE codes do not select this condition. The examples in paragraph 37 are not an exhaustive list. A missing quantity is not zero.",
});

const WITHDRAWAL = b6({
  id: "B6_TOTAL_WATER_WITHDRAWAL_M3",
  paragraph: "36",
  regulatoryStatement:
    "The undertaking shall disclose its total water withdrawal, i.e. the amount of water drawn into the boundaries of the organisation (or facility).",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_WITHDRAWAL,
  knowledgeHub: verifiedParagraph("36"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: WATER,
  xbrl: verifiedXbrl("vs:TotalAmountOfWaterWithdrawnFromAllSites", {
    note: "Paragraph 36. This fact is water withdrawal, not water consumption. The reporting period is the duration of the fact. The reported unit follows the audited m3 unit.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    safeguards: [
      "A missing quantity is not zero.",
      "Reported zero is distinct from missing data.",
      "This facility withdrawal is not the production-process withdrawal used for paragraph 37.",
    ],
  },
  dataSourceNote:
    "Appendix A: water withdrawal is the sum of all water drawn into the boundaries of the undertaking from all sources for any use over the reporting period. Source, evidence, and estimation method stay attached to this fact and are not a second quantity.",
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const PROCESS_WITHDRAWAL = b6({
  id: "B6_PRODUCTION_PROCESS_WITHDRAWAL_M3",
  paragraph: "37",
  regulatoryStatement:
    "Water withdrawal from the production processes used in the paragraph 37 consumption boundary.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: WATER,
  xbrl: unverifiedXbrl(
    "Paragraph 37 requires production-process withdrawal as a calculation input. No separate item concept was verified for that boundary. It is not vs:TotalAmountOfWaterWithdrawnFromAllSites.",
  ),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    excludes: ["B6_TOTAL_WATER_WITHDRAWAL_M3"],
    safeguards: [
      "A missing quantity is not zero.",
      "This input is not the paragraph 36 total.",
    ],
  },
  validationNote:
    "A missing quantity is not zero. Reported zero is distinct from missing data. The paragraph 36 total is not reused unless the boundaries and periods are the same.",
});

const DISCHARGE = b6({
  id: "B6_WATER_DISCHARGE_PRODUCTION_M3",
  paragraph: "37",
  regulatoryStatement:
    "Water discharge from the undertaking's production processes, used to calculate water consumption.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: WATER,
  xbrl: verifiedXbrl("vs:WaterDischargeFromUndertakingProductionProcesses", {
    note: "Calculation input for paragraph 37. Not the paragraph 36 Annex II metric.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    safeguards: ["Unavailable discharge is not zero."],
  },
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const CONSUMPTION = b6({
  id: "B6_WATER_CONSUMPTION_PRODUCTION_M3",
  paragraph: "37",
  regulatoryStatement:
    "It shall disclose its water consumption calculated as the difference between its water withdrawal and water discharge from its production processes.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: WATER,
  xbrl: verifiedXbrl("vs:TotalWaterConsumption", {
    note: "Paragraph 37 consumption. The formula is not implemented. The reporting period is the duration of the fact.",
  }),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    inputs: ["B6_PRODUCTION_PROCESS_WITHDRAWAL_M3", "B6_WATER_DISCHARGE_PRODUCTION_M3"],
    excludes: ["B6_TOTAL_WATER_WITHDRAWAL_M3", "B6_WATER_CONSUMED_WATER_STRESS_M3"],
    safeguards: [
      "Consumption uses the production-process boundary, not an unrelated facility total.",
      "Unavailable discharge is not zero.",
      "A missing quantity is not zero.",
      "The paragraph 36 withdrawal is excluded unless its boundary and period match the production processes.",
    ],
    methodologyReference:
      "Annex I paragraph 37 and Appendix A water consumption: water drawn into the boundaries and not discharged back to the water environment or a third party over the reporting period.",
  },
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const STRESS_TOTAL = b6({
  id: "B6_WATER_CONSUMED_WATER_STRESS_M3",
  paragraph: "37",
  regulatoryStatement:
    "In addition, these undertakings shall separately present the amount of water consumed at sites located in areas with water stress.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: WATER,
  xbrl: verifiedXbrl("vs:AmountOfWaterConsumedAtSitesLocatedInAreasWithWaterStress", {
    note: "The taxonomy reference linkbase has an empty paragraph for this concept. The legal reference remains Annex I paragraph 37, second sentence. This water-consumption fact is not replaced by a pollutant concept referenced to paragraph 37, and it is not water withdrawal.",
  }),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    inputs: ["B6_WATER_STRESS_SITE_CONSUMPTION"],
    excludes: ["B6_TOTAL_WATER_WITHDRAWAL_M3"],
    safeguards: [
      "This amount is water consumed at sites in water stress, not total water withdrawal.",
      "A missing quantity is not zero.",
      "Site rows are not summed in this phase.",
    ],
  },
  dataSourceNote:
    "Appendix A: water stress considers availability, quality, and accessibility. No geographic service or hardcoded classification is applied. The assessment source stays with the site row.",
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const STRESS_SITE = b6({
  id: "B6_WATER_STRESS_SITE_REFERENCE",
  paragraph: "37",
  regulatoryStatement: "B1 site whose water-stress location is assessed for paragraph 37.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B6_WATER_STRESS_SITE",
  value: SITE_VALUE,
  xbrl: unverifiedXbrl(
    "The site identity is B1_SITE_IDENTIFIER. The water-stress amount concept is not a per-site item concept.",
  ),
  validationNote: "This reference does not copy the B1 address and does not create a second site inventory.",
});

const STRESS_ASSESSMENT = b6({
  id: "B6_WATER_STRESS_ASSESSMENT",
  paragraph: "37",
  regulatoryStatement:
    "Whether the referenced site is located in an area with water stress.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PROCESSES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B6_WATER_STRESS_SITE",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "IN_WATER_STRESS",
        legalText: "The site has been assessed as located in an area with water stress.",
      },
      {
        id: "NOT_IN_WATER_STRESS",
        legalText: "The site has been assessed as not located in an area with water stress.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The site assessment is preparation data. No geographic classification concept was verified.",
  ),
  validationNote:
    "An absent assessment is UNASSESSED. UNASSESSED is not a finding that the site is free from water stress. No geographic service or hardcoded classification is applied.",
});

const STRESS_SITE_CONSUMPTION = b6({
  id: "B6_WATER_STRESS_SITE_CONSUMPTION",
  paragraph: "37",
  regulatoryStatement:
    "Water consumption attributable to a site assessed as located in an area with water stress.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_STRESS,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("37"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B6_WATER_STRESS_SITE",
  value: WATER,
  xbrl: unverifiedXbrl(
    "Per-site consumption attributes the paragraph 37 water-stress amount. The verified concept is the sites total, not this row.",
  ),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    excludes: ["B6_TOTAL_WATER_WITHDRAWAL_M3"],
    safeguards: ["A missing quantity is not zero.", "This row is not added into a total in this phase."],
  },
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const STRESS_SITES: Vs2026RepeatingGroup = Object.freeze({
  id: "B6_WATER_STRESS_SITE",
  disclosure: "B6",
  paragraph: "37",
  regulatoryStatement:
    "Open list of B1 sites assessed for water stress. There is no fixed site maximum.",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: WHEN_PROCESSES satisfies ApplicabilityCondition,
  siteInventory: "B1_SITE",
  components: Object.freeze([STRESS_SITE, STRESS_ASSESSMENT, STRESS_SITE_CONSUMPTION]),
});

export const B6_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B6",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Water",
  paragraphs: Object.freeze(["36", "37"]),
  datapoints: Object.freeze([
    PROCESSES,
    WITHDRAWAL,
    PROCESS_WITHDRAWAL,
    DISCHARGE,
    CONSUMPTION,
    STRESS_TOTAL,
  ]),
  repeatingGroups: Object.freeze([STRESS_SITES]),
  guidanceDatapoints: Object.freeze([]),
});

export function b6Datapoints(): readonly Vs2026Datapoint[] {
  return [
    ...B6_DISCLOSURE.datapoints,
    ...B6_DISCLOSURE.repeatingGroups.flatMap((group) => group.components),
  ];
}

export function b6AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b6Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
