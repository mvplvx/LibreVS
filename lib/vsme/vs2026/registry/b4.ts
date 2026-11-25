import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure, Vs2026RepeatingGroup } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B4, paragraph 34.
 * The disclosure applies when a legal reporting duty or EMS reporting exists.
 * Direct amounts and a public-document reference are alternative methods.
 * Paragraph 34 has no square-bracket employee-size relief and is not an Annex II row.
 */

const WHEN_CONDITION = Object.freeze({
  kind: "WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES",
} as const);

const WHEN_DIRECT = Object.freeze({
  kind: "WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED",
} as const);

const WHEN_PUBLIC = Object.freeze({
  kind: "WHEN_PUBLIC_DOCUMENT_REFERENCE_IS_SELECTED",
} as const);

const POLLUTANT_AXIS = Object.freeze([
  Object.freeze({
    id: "TypeOfPollutantAxis" as const,
    memberList: "NOT_REPRODUCED" as const,
  }),
]);

function b4(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule" | "annexII">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B4",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    annexII: ANNEX_II_NOT_LISTED,
    ...point,
  });
}

const REPORTING_CONDITION = b4({
  id: "B4_REPORTING_CONDITION",
  paragraph: "34",
  regulatoryStatement:
    "The undertaking shall disclose the emissions of pollutants to air, water and soil from its own operations that it is required to report to competent authorities by EU or national law, or that it voluntarily reports according to an Environmental Management System.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "LEGAL_REPORTING_REQUIREMENT",
        legalText:
          "The undertaking is required to report pollutant emissions to competent authorities by EU or national law.",
      },
      {
        id: "EMS_VOLUNTARY_REPORTING",
        legalText:
          "The undertaking voluntarily reports pollutant emissions according to an Environmental Management System.",
      },
      {
        id: "BOTH",
        legalText:
          "Both the legal reporting requirement and voluntary Environmental Management System reporting exist.",
      },
      {
        id: "NEITHER",
        legalText:
          "Neither a legal reporting requirement nor voluntary Environmental Management System reporting has been identified.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The reporting condition is preparation data. PollutionNotRequiredByLawOrRegulation is not a paragraph 34 concept and is not carried forward.",
  ),
  validationNote:
    "An empty value is UNASSESSED. UNASSESSED is not NEITHER. NEITHER is not zero emissions and does not mean pollutant data were entered as zero. Employee count does not select a member. BOTH keeps the legal duty and Environmental Management System reporting as distinct triggers.",
});

const DISCLOSURE_METHOD = b4({
  id: "B4_DISCLOSURE_METHOD",
  paragraph: "34",
  regulatoryStatement:
    "If this information is already publicly available, the undertaking may alternatively refer to the document where it is reported, for example, by providing the relevant URL link or embedding a hyperlink.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_CONDITION,
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "DIRECT_POLLUTANT_REPORTING",
        legalText: "Disclose the pollutant emissions directly.",
      },
      {
        id: "PUBLIC_DOCUMENT_REFERENCE",
        legalText:
          "Refer to the document where the information is already publicly reported.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The method selector is preparation data. It is not itself the public-document concept.",
  ),
  validationNote:
    "An empty value is UNASSESSED and is not a choice of either method. The public-document method does not require the pollutant quantities to be duplicated. NEITHER on the reporting condition does not select a method.",
});

const PUBLIC_FLAG = b4({
  id: "B4_PUBLIC_DISCLOSURE_FLAG",
  paragraph: "34",
  regulatoryStatement:
    "Whether the pollutant information is already publicly available, so that the undertaking may refer to that document instead of repeating the amounts.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_CONDITION,
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: { kind: "BOOLEAN" },
  xbrl: verifiedXbrl("vs:PubliclyAvailableDisclosure", {
    note: "Digital companion to the public-document reference. A true value does not replace the user-provided document reference.",
  }),
  validationNote:
    "An empty value is UNASSESSED and is not false. A true value does not by itself satisfy the disclosure and does not forbid direct pollutant reporting.",
});

const PUBLIC_DOCUMENT = b4({
  id: "B4_PUBLIC_DISCLOSURE_URL",
  paragraph: "34",
  regulatoryStatement:
    "If this information is already publicly available, the undertaking may alternatively refer to the document where it is reported, for example, by providing the relevant URL link or embedding a hyperlink.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PUBLIC,
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "USER_DOCUMENT_REFERENCE",
    referenceRole: "PUBLICLY_AVAILABLE_REPORTING_DOCUMENT",
    distinctFrom: [
      "ANNEX_I_PARAGRAPH_REFERENCE",
      "KNOWLEDGE_HUB_PARAGRAPH_URL",
      "REGULATION_ELI",
    ],
    missingReference: "NOT_A_VALID_PUBLIC_REFERENCE",
    arbitraryUrl: "NOT_SUFFICIENT",
    externalFetch: "NOT_IMPLEMENTED",
  },
  xbrl: verifiedXbrl("vs:URLOrLinkToThePubliclyAvailableDisclosure", {
    note: "User-provided reference to the public reporting document. This concept is not the Knowledge Hub URL and not the Regulation ELI.",
  }),
  validationNote:
    "A missing URL is not a valid public reference. An arbitrary URL does not by itself satisfy the disclosure.",
  futureValidation: [
    "A missing URL is not a valid public reference.",
    "An arbitrary URL does not by itself satisfy the disclosure.",
    "The reference must identify the document where the pollutant information is already publicly reported.",
    "The user-provided document reference stays distinct from the Annex I paragraph, the Knowledge Hub paragraph URL, and the Regulation ELI.",
    "This phase does not fetch or validate the external document.",
  ],
});

function emission(
  id: string,
  medium: "AIR" | "WATER" | "SOIL",
  mediumName: string,
  qname:
    | "vs:AmountOfEmissionToAir"
    | "vs:AmountOfEmissionToWater"
    | "vs:AmountOfEmissionToSoil",
): Vs2026Datapoint {
  return b4({
    id,
    paragraph: "34",
    regulatoryStatement: `Amount of the pollutant emitted to ${mediumName} from the undertaking's own operations.`,
    requirementType: "IF_APPLICABLE",
    applicability: WHEN_DIRECT,
    knowledgeHub: verifiedParagraph("34"),
    role: "REGULATORY_DATAPOINT",
    informationClass: "REGULATORY_FACT",
    repeatingGroupId: "B4_POLLUTANT",
    value: {
      kind: "REPEATING_DIMENSIONED_QUANTITY",
      cardinality: "ZERO_OR_MORE",
      maximum: null,
      environmentalMedium: medium,
      reportedUnit: "MASS_AS_REPORTED",
      aggregation: "DO_NOT_AGGREGATE_INCOMPATIBLE_UNITS",
      missingQuantity: "DO_NOT_TREAT_AS_ZERO",
      axes: POLLUTANT_AXIS,
    },
    xbrl: verifiedXbrl(qname, {
      dimensions: ["TypeOfPollutantAxis"],
      note: "Pollutant-member QNames are not reproduced. A typed axis for other pollutants is not an item concept. The reporting period is the duration of this fact.",
    }),
    validationNote:
      "A missing quantity is not zero. Kilograms and tonnes appear in EFRAG guidance as suitable mass units. They are not separate mandatory units, and quantities in incompatible units are not aggregated. No emission factor is applied.",
  });
}

const POLLUTANT_IDENTITY = b4({
  id: "B4_POLLUTANT_IDENTITY",
  paragraph: "34",
  regulatoryStatement:
    "Identity of a pollutant emitted to air, water or soil from the undertaking's own operations.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_DIRECT,
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B4_POLLUTANT",
  value: {
    kind: "ENUMERATION",
    members: [],
    fullMemberList: "NOT_REPRODUCED",
  },
  xbrl: unverifiedXbrl(
    "TypeOfPollutantAxis is the repeating pollutant axis named in the verified audit. Member QNames were not reproduced, and the typed axis for other pollutants is not an item concept.",
  ),
});

const REPORTING_BASIS = b4({
  id: "B4_POLLUTANT_REPORTING_BASIS",
  paragraph: "34",
  regulatoryStatement:
    "Whether this pollutant amount is reported under the legal duty to competent authorities or under an Environmental Management System.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_DIRECT,
  knowledgeHub: verifiedParagraph("34"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B4_POLLUTANT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      {
        id: "COMPETENT_AUTHORITY_LEGAL_REPORTING",
        legalText: "Reported to competent authorities under EU or national law.",
      },
      {
        id: "ENVIRONMENTAL_MANAGEMENT_SYSTEM",
        legalText: "Voluntarily reported according to an Environmental Management System.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The reporting basis is supporting metadata for a pollutant row. No separate item concept was verified.",
  ),
  validationNote:
    "This basis does not replace the pollutant quantity. A missing basis is not zero emissions.",
});

const POLLUTANTS: Vs2026RepeatingGroup = Object.freeze({
  id: "B4_POLLUTANT",
  disclosure: "B4",
  paragraph: "34",
  regulatoryStatement:
    "Pollutants emitted to air, water and soil from the undertaking's own operations, with no fixed maximum number of pollutants.",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: WHEN_DIRECT satisfies ApplicabilityCondition,
  components: Object.freeze([
    POLLUTANT_IDENTITY,
    emission("B4_EMISSION_TO_AIR", "AIR", "air", "vs:AmountOfEmissionToAir"),
    emission("B4_EMISSION_TO_WATER", "WATER", "water", "vs:AmountOfEmissionToWater"),
    emission("B4_EMISSION_TO_SOIL", "SOIL", "soil", "vs:AmountOfEmissionToSoil"),
    REPORTING_BASIS,
  ]),
});

export const B4_FOLDED_PROPOSED_IDS = Object.freeze(["B4_POLLUTANT_EMISSION"]);

export const B4_NOT_CARRIED_FORWARD = Object.freeze([
  Object.freeze({
    legacyId: "B4_POLLUTION_REFERENCE_POLLUTION_NOT_REQUIRED_BY_LAW",
    reason:
      "A boolean that the undertaking is not required to report is not paragraph 34. The assessed condition is B4_REPORTING_CONDITION, and an empty assessment is UNASSESSED rather than a negative disclosure.",
  }),
]);

export const B4_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B4",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Pollution of air, water and soil",
  paragraphs: Object.freeze(["34"]),
  datapoints: Object.freeze([
    REPORTING_CONDITION,
    DISCLOSURE_METHOD,
    PUBLIC_FLAG,
    PUBLIC_DOCUMENT,
  ]),
  repeatingGroups: Object.freeze([POLLUTANTS]),
  guidanceDatapoints: Object.freeze([]),
});

export function b4Datapoints(): readonly Vs2026Datapoint[] {
  return [
    ...B4_DISCLOSURE.datapoints,
    ...B4_DISCLOSURE.repeatingGroups.flatMap((group) => group.components),
  ];
}

export function b4AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b4Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
