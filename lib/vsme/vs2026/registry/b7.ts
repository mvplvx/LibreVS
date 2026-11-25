import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure, Vs2026RepeatingGroup } from "./types";
import {
  VOLUNTARY_FOR_EMPLOYEES_LE_10,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, knowledgeHubUnavailable, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B7, paragraphs 38 and 39.
 * Annex II covers paragraph 38, first sentence, and paragraphs 39(a) and 39(b).
 * Paragraph 39(b) is one legal proportion. The taxonomy stores two mass percentages.
 * Paragraph 39(c) is conditional and is not an Annex II row.
 */

const WHEN_CIRCULAR = Object.freeze({
  kind: "WHEN_CIRCULAR_ECONOMY_PRINCIPLES_ARE_APPLIED",
} as const);

const WHEN_MATERIALS = Object.freeze({
  kind: "WHEN_SIGNIFICANT_MATERIAL_FLOWS",
} as const);

const ANNEX_CIRCULAR = Object.freeze({
  listed: true as const,
  disclosure: "B7" as const,
  reference: "Para 38, first sentence",
});

const ANNEX_WASTE = Object.freeze({
  listed: true as const,
  disclosure: "B7" as const,
  reference: "Para 39, point (a)",
});

const ANNEX_PROPORTION = Object.freeze({
  listed: true as const,
  disclosure: "B7" as const,
  reference: "Para 39, point (b)",
});

const NO_PARAGRAPH_39A_URL = knowledgeHubUnavailable(
  "Phase 1B recorded no publishable Knowledge Hub URL for Annex I paragraph 39(a). The legal source remains the Regulation ELI.",
);

const NO_FACTORS = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

const WEIGHT = Object.freeze({
  kind: "QUANTITY" as const,
  reportedUnit: "WEIGHT" as const,
  inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR" as const,
});

const PROPORTION_CHECKS = Object.freeze([
  "The numerator and the denominator use the same unit and the same reporting period.",
  "A missing numerator is not zero.",
  "A missing denominator is not zero percent.",
  "A zero denominator is not a valid percentage.",
  "Hazardous and non-hazardous quantities must not overlap.",
  "Waste counted as recycling is not also counted as preparation for reuse.",
  "The two percentages are not added.",
  "Incompatible units are not added.",
]);

function b7(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B7",
    module: "BASIC",
    employeeSizeRule: VOLUNTARY_FOR_EMPLOYEES_LE_10,
    ...point,
  });
}

const APPLIES = b7({
  id: "B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES",
  paragraph: "38",
  regulatoryStatement:
    "The undertaking shall disclose whether it applies circular economy principles and, if so, how it applies these principles.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_CIRCULAR,
  knowledgeHub: verifiedParagraph("38"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      { id: "YES", legalText: "The undertaking applies circular economy principles." },
      { id: "NO", legalText: "The undertaking does not apply circular economy principles." },
    ],
  },
  xbrl: verifiedXbrl("vs:UndertakingAppliesCircularEconomyPrinciples", {
    note: "Annex II covers the first sentence, whether the principles are applied. The taxonomy boolean does not store UNASSESSED, so an empty registry value is not serialised as false.",
  }),
  validationNote:
    "An unanswered value is not NO. YES does not generate the description. Appendix A principles are the definition, not a mandatory activity list.",
  dataSourceNote:
    "Appendix A circular economy principles are: eliminate waste and pollution by design, circulate products and materials at their highest value, and regenerate nature. Those limbs are not separate datapoints.",
});

const DESCRIPTION = b7({
  id: "B7_CIRCULAR_ECONOMY_DESCRIPTION",
  paragraph: "38",
  regulatoryStatement: "If so, how it applies these principles.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_CIRCULAR,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("38"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: { kind: "NARRATIVE" },
  xbrl: verifiedXbrl("vs:DescriptionOfHowCircularEconomyPrinciplesAreApplied", {
    note: "The how-description is outside the Annex II first sentence.",
  }),
  validationNote: "The description is entered. It is not generated from YES.",
});

const WASTE_TOTAL = b7({
  id: "B7_WASTE_GENERATED_TOTAL_WEIGHT",
  paragraph: "39(a)",
  regulatoryStatement:
    "The total weight of waste generated, with a breakdown between hazardous and non-hazardous waste.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_WASTE,
  knowledgeHub: NO_PARAGRAPH_39A_URL,
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: WEIGHT,
  xbrl: unverifiedXbrl(
    "Paragraph 39(a) requires total weight. No single total-waste item concept was verified. Volume companions named in the audit were not verified and are not stored.",
  ),
  calculation: {
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    inputs: ["B7_WASTE_HAZARDOUS_MASS", "B7_WASTE_NON_HAZARDOUS_MASS"],
    safeguards: [
      "The total is not calculated in this phase.",
      "Hazardous and non-hazardous quantities must not overlap.",
      "A missing component is not zero.",
      "Reported zero is distinct from missing data.",
      "Incompatible units are not added.",
    ],
  },
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
  futureValidation: [
    "Hazardous and non-hazardous quantities must not overlap.",
    "Where a total is compared with its components, the components use the same weight unit and reporting period.",
    "A missing component is not zero.",
    "Reported zero is distinct from missing data.",
    "Incompatible units are not added.",
  ],
});

function wasteClass(id: string, label: string, definition: string): Vs2026Datapoint {
  return b7({
    id,
    paragraph: "39(a)",
    regulatoryStatement: label,
    requirementType: "ESSENTIAL",
    applicability: { kind: "ALWAYS" },
    annexII: ANNEX_WASTE,
    knowledgeHub: NO_PARAGRAPH_39A_URL,
    role: "REGULATORY_DATAPOINT",
    informationClass: "REGULATORY_FACT",
    value: WEIGHT,
    xbrl: unverifiedXbrl(
      `${definition} The mass concept was not verified as an item QName. A volume companion was named in the audit and is not stored.`,
    ),
    calculation: {
      status: "BOUNDARY_ONLY",
      ...NO_FACTORS,
      safeguards: [
        "Hazardous and non-hazardous quantities must not overlap.",
        "A missing quantity is not zero.",
        "Reported zero is distinct from missing data.",
      ],
    },
    validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
  });
}

const HAZARDOUS = wasteClass(
  "B7_WASTE_HAZARDOUS_MASS",
  "Hazardous waste generated, by weight.",
  "Hazardous waste is waste with one or more hazardous properties listed in Annex III of Directive 2008/98/EC.",
);

const NON_HAZARDOUS = wasteClass(
  "B7_WASTE_NON_HAZARDOUS_MASS",
  "Non-hazardous waste generated, by weight.",
  "Non-hazardous waste is the paragraph 39(a) complement of hazardous waste.",
);

const LEGAL_PROPORTION = b7({
  id: "B7_WASTE_DIVERTED_PROPORTION",
  paragraph: "39(b)",
  regulatoryStatement:
    "The proportion of waste diverted to recycling or preparation for reuse.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_PROPORTION,
  knowledgeHub: verifiedParagraph("39(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "PROPORTION",
    reportedUnit: "PERCENT",
    zeroDenominator: "NOT_A_VALID_PERCENTAGE",
    missingDenominator: "NOT_ZERO_PERCENT",
    missingNumerator: "DO_NOT_TREAT_AS_ZERO",
  },
  xbrl: unverifiedXbrl(
    "Annex I states one proportion. No single combined concept was verified. The taxonomy stores separate mass percentages for recycling and for preparation for reuse.",
  ),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    zeroDenominator: "NOT_A_VALID_PERCENTAGE",
    inputs: [
      "B7_WASTE_RECYCLING_PERCENT_MASS",
      "B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS",
      "B7_WASTE_GENERATED_TOTAL_WEIGHT",
    ],
    safeguards: [
      "The two percentages are not added.",
      "Waste counted as recycling is not also counted as preparation for reuse.",
      "A missing denominator is not zero percent.",
      "A zero denominator is not a valid percentage.",
      "A missing numerator is not zero.",
    ],
    methodologyReference:
      "Annex I paragraph 39(b). Appendix A recycling excludes energy recovery and backfilling. Preparation for reuse is not the Appendix A reuse of products that are not waste.",
  },
  validationNote:
    "A missing denominator is not zero percent. A zero denominator is not a valid percentage. The two percentages are not added.",
  futureValidation: PROPORTION_CHECKS,
});

function digitalPercent(id: string, qname: `vs:${string}`, statement: string): Vs2026Datapoint {
  return b7({
    id,
    paragraph: "39(b)",
    regulatoryStatement: statement,
    requirementType: "ESSENTIAL",
    applicability: { kind: "ALWAYS" },
    annexII: ANNEX_II_NOT_LISTED,
    knowledgeHub: verifiedParagraph("39(b)"),
    role: "REGULATORY_DATAPOINT",
    informationClass: "DIGITAL_FACT",
    value: {
      kind: "PROPORTION",
      reportedUnit: "PERCENT",
      zeroDenominator: "NOT_A_VALID_PERCENTAGE",
      missingDenominator: "NOT_ZERO_PERCENT",
      missingNumerator: "DO_NOT_TREAT_AS_ZERO",
    },
    xbrl: verifiedXbrl(qname, {
      note: "Digital mass percentage for one treatment. It is not a second Annex I sentence and it is not added to the other treatment percentage. Volume companions are not stored.",
    }),
    calculation: {
      status: "INCOMPLETE",
      ...NO_FACTORS,
      zeroDenominator: "NOT_A_VALID_PERCENTAGE",
      inputs: ["B7_WASTE_GENERATED_TOTAL_WEIGHT"],
      excludes:
        id === "B7_WASTE_RECYCLING_PERCENT_MASS"
          ? ["B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS"]
          : ["B7_WASTE_RECYCLING_PERCENT_MASS"],
      safeguards: [
        "The two percentages are not added.",
        "A zero denominator is not a valid percentage.",
        "A missing denominator is not zero percent.",
      ],
    },
    validationNote:
      "A missing denominator is not zero percent. A zero denominator is not a valid percentage. The two percentages are not added.",
    futureValidation: PROPORTION_CHECKS,
  });
}

const RECYCLING = digitalPercent(
  "B7_WASTE_RECYCLING_PERCENT_MASS",
  "vs:PercentageOfWasteDivertedToRecyclingMass",
  "Digital proportion of waste diverted to recycling, by mass.",
);

const PREPARATION_FOR_REUSE = digitalPercent(
  "B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS",
  "vs:PercentageOfWasteDivertedToPreparationForReuseMass",
  "Digital proportion of waste diverted to preparation for reuse, by mass.",
);

const MATERIAL_CONDITION = b7({
  id: "B7_SIGNIFICANT_MATERIAL_FLOWS",
  paragraph: "39(c)",
  regulatoryStatement:
    "If the undertaking operates in a sector using significant material flows (for example manufacturing, construction, packaging or others), the annual mass-flow of relevant materials used.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("39(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "SIGNIFICANT_FLOWS",
        legalText: "The undertaking's activities use significant material flows.",
      },
      {
        id: "NO_SIGNIFICANT_FLOWS_IDENTIFIED",
        legalText: "No significant material flows have been identified.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The sector condition is preparation data. Manufacturing, construction, and packaging are examples, not a closed list.",
  ),
  validationNote:
    "An empty value is UNASSESSED. UNASSESSED is not NO_SIGNIFICANT_FLOWS_IDENTIFIED. Company.industry and NACE codes do not select this condition. The examples are not an exhaustive list.",
});

const MATERIAL_NAME = b7({
  id: "B7_MATERIAL_NAME",
  paragraph: "39(c)",
  regulatoryStatement: "Identity of a relevant material used.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_MATERIALS,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("39(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B7_MATERIAL",
  value: { kind: "TEXT" },
  xbrl: verifiedXbrl("vs:NameOfMaterialUsed", {
    note: "IdentifierOfMaterialTypedAxis is the repeating axis named in the audit. It is not stored as an item QName. Material member names are not reproduced.",
  }),
});

const MATERIAL_WEIGHT = b7({
  id: "B7_MATERIAL_WEIGHT",
  paragraph: "39(c)",
  regulatoryStatement: "Annual mass-flow of the relevant material used.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_MATERIALS,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("39(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B7_MATERIAL",
  value: WEIGHT,
  xbrl: verifiedXbrl("vs:WeightOfMaterialUsed", {
    note: "Legal mass-flow. The reporting period is the duration of the fact. Weight is not added to volume.",
  }),
  calculation: {
    status: "INCOMPLETE",
    ...NO_FACTORS,
    excludes: ["B7_MATERIAL_VOLUME"],
    safeguards: [
      "Purchased material, internally sourced material, and material used in production are not given a formula.",
      "Weight is not added to volume.",
      "A missing quantity is not zero.",
      "Reported zero is distinct from missing data.",
    ],
  },
  validationNote: "A missing quantity is not zero. Reported zero is distinct from missing data.",
});

const MATERIAL_VOLUME = b7({
  id: "B7_MATERIAL_VOLUME",
  paragraph: "39(c)",
  regulatoryStatement: "Digital volume companion for the same material row.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_MATERIALS,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("39(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "DIGITAL_FACT",
  repeatingGroupId: "B7_MATERIAL",
  value: {
    kind: "QUANTITY",
    reportedUnit: "VOLUME",
    inputUnit: "UNCONVERTED_UNTIL_VERIFIED_FACTOR",
  },
  xbrl: verifiedXbrl("vs:VolumeOfMaterialUsed", {
    note: "Digital companion. Paragraph 39(c) requires mass-flow. Volume is not added to weight.",
  }),
  validationNote: "Volume is not added to weight. A missing quantity is not zero.",
});

const MATERIALS: Vs2026RepeatingGroup = Object.freeze({
  id: "B7_MATERIAL",
  disclosure: "B7",
  paragraph: "39(c)",
  regulatoryStatement:
    "Open list of relevant materials. There is no fixed material maximum.",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: WHEN_MATERIALS satisfies ApplicabilityCondition,
  components: Object.freeze([MATERIAL_NAME, MATERIAL_WEIGHT, MATERIAL_VOLUME]),
});

export const B7_FOLDED_PROPOSED_IDS = Object.freeze([
  "B7_WASTE_DIVERTED_PROPORTIONS",
  "B7_MATERIAL_FLOW",
]);

export const B7_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B7",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Resource use, circular economy and waste management",
  paragraphs: Object.freeze(["38", "39(a)", "39(b)", "39(c)"]),
  datapoints: Object.freeze([
    APPLIES,
    DESCRIPTION,
    WASTE_TOTAL,
    HAZARDOUS,
    NON_HAZARDOUS,
    LEGAL_PROPORTION,
    RECYCLING,
    PREPARATION_FOR_REUSE,
    MATERIAL_CONDITION,
  ]),
  repeatingGroups: Object.freeze([MATERIALS]),
  guidanceDatapoints: Object.freeze([]),
});

export function b7Datapoints(): readonly Vs2026Datapoint[] {
  return [
    ...B7_DISCLOSURE.datapoints,
    ...B7_DISCLOSURE.repeatingGroups.flatMap((group) => group.components),
  ];
}

export function b7AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b7Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
