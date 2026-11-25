import type { Vs2026Datapoint, Vs2026Disclosure } from "./types";
import {
  VS2026_REGISTRY_STANDARD,
  VOLUNTARY_FOR_EMPLOYEES_LE_10,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B3, paragraphs 32 and 33.
 * Paragraphs 49 to 52 are the Scope 3 consideration presented with B3.
 * They are not Basic Module completion items.
 */

const ENERGY_AXES = Object.freeze([
  Object.freeze({
    id: "ENERGY_CARRIER",
    legalMembers: Object.freeze([
      "Electricity (as reflected in utility billings)",
      "Fuels",
    ]),
  }),
  Object.freeze({
    id: "ENERGY_ORIGIN",
    legalMembers: Object.freeze([
      "Renewable energy",
      "Non-renewable energy",
      "Total",
    ]),
  }),
]);

const BREAKDOWN_AVAILABLE = Object.freeze({
  kind: "WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED",
} as const);

const ANNEX_II_ENERGY = Object.freeze({
  listed: true as const,
  disclosure: "B3" as const,
  reference: "Para 32, first sentence",
});

const ANNEX_II_GHG = Object.freeze({
  listed: true as const,
  disclosure: "B3" as const,
  reference: "Para 33",
});

const NO_FACTORS = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
});

function b3(
  point: Omit<Vs2026Datapoint, "disclosure" | "module">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B3",
    module: "BASIC",
    ...point,
  });
}

const TOTAL_ENERGY = b3({
  id: "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
  paragraph: "32",
  regulatoryStatement:
    "The undertaking shall disclose its total energy consumption in MWh.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_ENERGY,
  knowledgeHub: verifiedParagraph("32"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "QUANTITY",
    reportedUnit: "MWh",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:TotalEnergyConsumption", {
    note: "Paragraph 32, first sentence. This fact is not defined as the sum of the breakdown.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    inputs: [
      "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
      "B3_ENERGY_CONSUMPTION_FROM_FUELS",
    ],
    safeguards: [
      "The total remains reportable when the breakdown cannot be obtained.",
      "An empty breakdown cell is not zero consumption.",
      "Energy generated from a purchased fuel is not added again as electricity.",
      "Renewable electricity generated without fuel combustion is not also counted as fuel.",
      "Feedstocks not combusted for energy are outside energy consumption.",
    ],
  },
  validationNote:
    "Unavailable breakdown information does not make this disclosure not applicable.",
});

const BREAKDOWN_INFORMATION = b3({
  id: "B3_ENERGY_BREAKDOWN_INFORMATION",
  paragraph: "32",
  regulatoryStatement:
    "If it can obtain the necessary information to provide such a breakdown, the undertaking shall also disclose a breakdown.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("32"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "CAN_OBTAIN",
        legalText: "can obtain the necessary information",
      },
      {
        id: "CANNOT_OBTAIN",
        legalText: "cannot obtain the necessary information",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "Whether the breakdown information can be obtained is the paragraph 32 condition. No concept QName was verified for that condition.",
  ),
  validationNote:
    "UNASSESSED is not CANNOT_OBTAIN. CANNOT_OBTAIN is not zero consumption and does not remove the total energy fact. Voluntary employee-size treatment is not this condition.",
});

const ELECTRICITY = b3({
  id: "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
  paragraph: "32",
  regulatoryStatement:
    "Electricity (as reflected in utility billings), split by Renewable energy, Non-renewable energy and Total.",
  requirementType: "IF_APPLICABLE",
  applicability: BREAKDOWN_AVAILABLE,
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("32"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "DIMENSIONED_QUANTITY",
    reportedUnit: "MWh",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
    axes: ENERGY_AXES,
  },
  xbrl: verifiedXbrl("vs:EnergyConsumptionFromElectricity", {
    dimensions: ["BreakdownOfEnergyConsumptionAxis"],
    memberNamesFromAudit: ["RenewableEnergyMember"],
    note: "The verified audit attaches RenewableEnergyMember to both the renewable and the non-renewable rows. The non-renewable member QName is therefore unresolved. The Total column is part of the legal table.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    safeguards: [
      "A missing renewable or non-renewable cell is not zero.",
      "Utility electricity is not the same fact as self-generated electricity.",
    ],
  },
});

const FUELS = b3({
  id: "B3_ENERGY_CONSUMPTION_FROM_FUELS",
  paragraph: "32",
  regulatoryStatement:
    "Fuels, split by Renewable energy, Non-renewable energy and Total.",
  requirementType: "IF_APPLICABLE",
  applicability: BREAKDOWN_AVAILABLE,
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("32"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "DIMENSIONED_QUANTITY",
    reportedUnit: "MWh",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
    axes: ENERGY_AXES,
  },
  xbrl: verifiedXbrl("vs:EnergyConsumptionFromFuels", {
    dimensions: ["BreakdownOfEnergyConsumptionAxis"],
    memberNamesFromAudit: ["RenewableEnergyMember"],
    note: "Same unresolved non-renewable member as the electricity concept. Fuel combusted for energy is not counted again when it is used to generate electricity.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    safeguards: [
      "A missing fuel cell is not zero.",
      "Purchased fuel is not also reported as the electricity generated from that fuel.",
    ],
  },
});

const SELF_GENERATED = b3({
  id: "B3_SELF_GENERATED_ELECTRICITY_MWH",
  paragraph: "32",
  regulatoryStatement:
    "Self-generated electricity is collected by the digital template. The Annex I table names utility electricity and fuels.",
  requirementType: "VOLUNTARY",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("32"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "SUPPLEMENTARY",
  value: {
    kind: "QUANTITY",
    reportedUnit: "MWh",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: unverifiedXbrl(
    "The audit records EnergyConsumptionFromSelfGeneratedElectricity with verification_status UNVERIFIED. Legal coverage of the Annex I table is unresolved.",
  ),
  validationNote:
    "Outside the Annex I completion set. Renewable electricity generated without fuel combustion is not a second fuel quantity.",
});

const SCOPE_1 = b3({
  id: "B3_GROSS_SCOPE1_TCO2E",
  paragraph: "33(a)",
  regulatoryStatement:
    "the Scope 1 GHG emissions in tCO2eq (from owned or controlled sources), estimated absolute gross greenhouse gas (GHG) emissions considering the GHG Protocol Corporate Accounting and Reporting Standard (2004)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_GHG,
  knowledgeHub: verifiedParagraph("33"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "QUANTITY",
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:GrossScope1GreenhouseGasEmissions"),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    methodologyReference:
      "GHG Protocol Corporate Accounting and Reporting Standard (2004)",
  },
});

const SCOPE_2_LOCATION = b3({
  id: "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
  paragraph: "33(b)",
  regulatoryStatement:
    "the location-based Scope 2 emissions in tCO2eq (emissions from the generation of purchased energy, such as electricity, heat, steam or cooling)",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_GHG,
  knowledgeHub: verifiedParagraph("33"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "QUANTITY",
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:GrossLocationBasedScope2GreenhouseGasEmissions", {
    note: "Location-based Scope 2 is the paragraph 33 Scope 2 fact. Market-based Scope 2 is a different datapoint.",
  }),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    methodologyReference:
      "GHG Protocol Corporate Accounting and Reporting Standard (2004)",
    excludes: ["B3_GROSS_SCOPE2_MARKET_BASED_TCO2E"],
  },
});

const SCOPE_2_MARKET = b3({
  id: "B3_GROSS_SCOPE2_MARKET_BASED_TCO2E",
  paragraph: "33",
  regulatoryStatement:
    "Market-based Scope 2 is present in the digital template. Annex I paragraph 33 specifies location-based Scope 2.",
  requirementType: "VOLUNTARY",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("33"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "SUPPLEMENTARY",
  value: {
    kind: "QUANTITY",
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: unverifiedXbrl(
    "The audit records GrossMarketBasedScope2GreenhouseGasEmissions with verification_status UNVERIFIED. It does not replace location-based Scope 2.",
  ),
  validationNote: "Outside the Annex I completion set.",
});

const LOCATION_TOTAL = b3({
  id: "B3_SCOPE1_SCOPE2_LOCATION_TOTAL",
  paragraph: "33",
  regulatoryStatement:
    "Calculated total of Scope 1 and location-based Scope 2. Not a separate Annex I sentence.",
  requirementType: "VOLUNTARY",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("33"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "CALCULATED_FACT",
  value: {
    kind: "QUANTITY",
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:TotalGrossLocationBasedScope1AndScope2GHGEmissions", {
    note: "Digital calculation link. The legal facts remain Scope 1 and location-based Scope 2.",
  }),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    inputs: ["B3_GROSS_SCOPE1_TCO2E", "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E"],
    excludes: ["B3_GROSS_SCOPE2_MARKET_BASED_TCO2E", "B3_GROSS_SCOPE3_TCO2E"],
    safeguards: ["A missing Scope 1 or location-based Scope 2 input is not zero."],
  },
});

const SCOPE_3_TOTAL = b3({
  id: "B3_GROSS_SCOPE3_TCO2E",
  paragraph: "49-52",
  regulatoryStatement:
    "Depending on the type of activities carried out by the undertaking, disclosing a quantification of its Scope 3 GHG emissions can be appropriate. Scope 3 emissions are indirect GHG emissions (other than Scope 2).",
  requirementType: "SECTOR_CONSIDERATION",
  applicability: { kind: "ALWAYS" },
  employeeSizeRule: { voluntaryForEmployeesLe10: false },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("49-52"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "SUPPLEMENTARY",
  value: {
    kind: "QUANTITY",
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:GrossScope3GreenhouseGasEmissions", {
    note: "The verified concept is the total. It is not an always-required Basic Module fact.",
  }),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    methodologyReference:
      "GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard",
  },
  validationNote:
    "Not part of paragraph 33 and not an Annex II row. When disclosed, paragraph 52 requires presentation together with B3.",
});

const SCOPE_3_CATEGORIES = b3({
  id: "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
  paragraph: "51",
  regulatoryStatement:
    "When it reports on Scope 3 GHG emissions, the undertaking shall include significant Scope 3 categories based on its own assessment. The categories are the 15 types identified by the GHG Protocol.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "WHEN_SCOPE3_IS_DISCLOSED" },
  employeeSizeRule: { voluntaryForEmployeesLe10: false },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("49-52"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "SUPPLEMENTARY",
  value: {
    kind: "REPEATING_QUANTITY",
    cardinality: "ZERO_OR_MORE",
    maximum: null,
    reportedUnit: "tCO2eq",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
    categorySource: "GHG_PROTOCOL_SCOPE3_FIFTEEN_CATEGORIES",
    categoryNames: "NOT_REPRODUCED",
  },
  xbrl: unverifiedXbrl(
    "No Scope 3 category concept was verified. ReportingScopesAxis members in the audit are CurrentlyStated, BaselineYear and TargetYear, not the 15 categories.",
  ),
  validationNote:
    "An open list replaces fixed category slots. Categories that the previous registry omitted stay reportable. A missing category is not zero.",
});

export const B3_FOLDED_BREAKDOWN_IDS = Object.freeze([
  "B3_ELECTRICITY_ELECTRICITY_RENEWABLE_MWH",
  "B3_ELECTRICITY_ELECTRICITY_NON_RENEWABLE_MWH",
  "B3_ELECTRICITY_TOTAL_MWH",
  "B3_FUELS_FUELS_RENEWABLE_MWH",
  "B3_FUELS_FUELS_NON_RENEWABLE_MWH",
  "B3_FUELS_TOTAL_MWH",
]);

export const B3_REPLACED_SCOPE3_SLOT_IDS = Object.freeze([
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT1_PURCHASED_GOODS_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT2_CAPITAL_GOODS_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT3_FUEL_ENERGY_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT4_UPSTREAM_TRANSPORT_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT5_WASTE_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT6_BUSINESS_TRAVEL_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT7_COMMUTING_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT9_DOWNSTREAM_TRANSPORT_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT11_USE_OF_SOLD_PRODUCTS_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT12_END_OF_LIFE_TCO2E",
  "B3_GHG_SCOPE3_COMPREHENSIVE_SCOPE3_CAT15_INVESTMENTS_TCO2E",
]);

export const B3_NOT_CARRIED_FORWARD = Object.freeze([
  Object.freeze({
    legacyId: "B3_GHG_INTENSITY_GHG_INTENSITY_LOCATION_BASED",
    reason:
      "VSME intensity per turnover is not in Annex I. Paragraph 33 requires estimated absolute gross emissions.",
  }),
  Object.freeze({
    legacyId: "B3_GHG_INTENSITY_GHG_INTENSITY_MARKET_BASED",
    reason:
      "VSME intensity per turnover is not in Annex I. Paragraph 33 requires estimated absolute gross emissions.",
  }),
  Object.freeze({
    legacyId: "B3_TOTALS_FEEDSTOCK_FUEL_NON_ENERGY_MWH",
    reason:
      "Feedstocks not combusted for energy are outside paragraph 32. They remain a double-counting safeguard, not a datapoint.",
  }),
]);

export const B3_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B3",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Energy and greenhouse gas emissions",
  paragraphs: Object.freeze(["32", "33", "49", "50", "51", "52"]),
  datapoints: Object.freeze([
    TOTAL_ENERGY,
    BREAKDOWN_INFORMATION,
    ELECTRICITY,
    FUELS,
    SELF_GENERATED,
    SCOPE_1,
    SCOPE_2_LOCATION,
    SCOPE_2_MARKET,
    LOCATION_TOTAL,
    SCOPE_3_TOTAL,
    SCOPE_3_CATEGORIES,
  ]),
  repeatingGroups: Object.freeze([]),
  guidanceDatapoints: Object.freeze([]),
  presentationNotes: Object.freeze([
    Object.freeze({
      paragraph: "52",
      statement:
        "When reporting its Scope 1 and Scope 2 emissions, if the undertaking discloses entity-specific information on its Scope 3 emissions, it shall present it together with the information specified under B3 – Energy and greenhouse gas emissions.",
      implemented: false,
    }),
  ]),
});

export function b3Datapoints(): readonly Vs2026Datapoint[] {
  return B3_DISCLOSURE.datapoints;
}

export function b3AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return B3_DISCLOSURE.datapoints.filter(
    (datapoint) => datapoint.informationClass === "REGULATORY_FACT",
  );
}
