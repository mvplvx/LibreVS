import type { Vs2026Datapoint, Vs2026Disclosure } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B9, paragraph 41.
 * The accident number and the accident rate are separate facts under 41(a).
 * Fatalities are one combined total under 41(b), subject to legal restrictions.
 * There is no square-bracket relief. Annex II covers 41(a) only.
 */

const WHEN_REPORTABLE = Object.freeze({
  kind: "WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED",
} as const);

const ANNEX_ACCIDENTS = Object.freeze({
  listed: true as const,
  disclosure: "B9" as const,
  reference: "Para 41, point (a)",
});

const INTEGER_COUNT = Object.freeze({
  kind: "COUNT" as const,
  nonNegativeInteger: true as const,
  missingCount: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

const NO_FACTORS = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

function b9(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B9",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    ...point,
  });
}

const ACCIDENTS = b9({
  id: "B9_RECORDABLE_ACCIDENTS",
  paragraph: "41(a)",
  regulatoryStatement: "the number and rate of recordable work-related accidents",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_ACCIDENTS,
  knowledgeHub: verifiedParagraph("41(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: INTEGER_COUNT,
  xbrl: verifiedXbrl("vs:NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod"),
  calculation: Object.freeze({
    status: "BOUNDARY_ONLY",
    ...NO_FACTORS,
    safeguards: Object.freeze([
      "A reported zero is a valid accident count.",
      "A missing accident count is not a finding that no accidents occurred.",
      "The number of accidents is not the number of injured employees.",
    ]),
  }),
  dataSourceNote:
    "A work-related accident is a discrete occurrence in the course of work which leads to physical or mental harm. Such an occurrence is recordable if it results in death or more than three days of absence from work. Aggregate counts only.",
  futureValidation: Object.freeze([
    "The count is a non-negative integer.",
    "A missing accident count is not a finding that no accidents occurred.",
  ]),
});

const HOURS = b9({
  id: "B9_HOURS_WORKED",
  paragraph: "41(a)",
  regulatoryStatement: "Hours worked, used as an input to the accident rate.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "HOURS_WORKED",
    originDatapointId: "B9_HOURS_WORKED_ORIGIN",
    missingHours: "DO_NOT_TREAT_AS_ZERO",
    zeroHours: "NOT_A_VALID_RATE_DENOMINATOR",
  },
  xbrl: unverifiedXbrl(
    "Paragraph 41 does not name an hours concept. No hours-worked QName was verified.",
  ),
  validationNote: "Missing hours worked are not zero. Zero hours worked is not a valid accident rate.",
});

const HOURS_ORIGIN = b9({
  id: "B9_HOURS_WORKED_ORIGIN",
  paragraph: "41(a)",
  regulatoryStatement: "Whether the hours worked were measured or estimated.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      { id: "MEASURED", legalText: "Measured hours worked." },
      { id: "ESTIMATED", legalText: "Estimated hours worked." },
    ],
  },
  xbrl: unverifiedXbrl("No concept was verified for the hours-worked origin."),
  validationNote:
    "An unanswered origin is UNASSESSED. UNASSESSED is not MEASURED. Estimated hours stay distinct from measured hours.",
});

const RATE_BASIS = b9({
  id: "B9_ACCIDENT_RATE_BASIS",
  paragraph: "41(a)",
  regulatoryStatement: "Calculation basis the undertaking uses for the accident rate.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      { id: "BASIS_200000_HOURS", legalText: "200 000 hours worked" },
      { id: "BASIS_1000000_HOURS", legalText: "1 000 000 hours worked" },
    ],
  },
  xbrl: unverifiedXbrl(
    "Paragraph 41 does not specify the denominator. No member QName was verified for either hours basis.",
  ),
  validationNote:
    "Neither basis is mandatory. An unanswered basis is UNASSESSED. The selected calculation basis must be known before a rate is calculated.",
  dataSourceNote:
    "NON-MANDATORY GUIDANCE. The two bases are alternatives the undertaking may explain. Paragraph 41 does not select one of them.",
});

const RATE = b9({
  id: "B9_RECORDABLE_ACCIDENT_RATE",
  paragraph: "41(a)",
  regulatoryStatement: "the number and rate of recordable work-related accidents",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_ACCIDENTS,
  knowledgeHub: verifiedParagraph("41(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "ACCIDENT_RATE",
    formula: "NOT_IMPLEMENTED",
    zeroHours: "NOT_A_VALID_RATE",
    missingHours: "NOT_A_VALID_RATE",
    missingAccidents: "DO_NOT_TREAT_AS_ZERO",
  },
  xbrl: verifiedXbrl("vs:RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod", {
    note: "Paragraph 41 requires the rate and does not specify its formula. The rate stays separate from the accident count.",
  }),
  calculation: Object.freeze({
    status: "INCOMPLETE",
    ...NO_FACTORS,
    inputs: Object.freeze([
      "B9_RECORDABLE_ACCIDENTS",
      "B9_HOURS_WORKED",
      "B9_ACCIDENT_RATE_BASIS",
    ]),
    excludes: Object.freeze(["B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM"]),
    safeguards: Object.freeze([
      "Accident rate = number of recordable work-related accidents ÷ hours worked × selected calculation basis.",
      "The selected calculation basis must be known.",
      "Hours worked must be positive when calculating a rate.",
      "Missing hours worked are not zero.",
      "Zero hours worked is not a valid accident rate.",
      "Estimated hours stay distinct from measured hours.",
      "The rate uses the same reporting period and workforce boundary as its inputs.",
      "The number of accidents is not the number of injured employees.",
      "Neither basis is mandatory.",
    ]),
  }),
});

const RESTRICTION = b9({
  id: "B9_FATALITY_LEGAL_RESTRICTION",
  paragraph: "41(b)",
  regulatoryStatement:
    "subject to legal restrictions, the sum of the fatalities as a result of recordable work-related accidents and recordable work-related ill health.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      {
        id: "NO_RESTRICTION_IDENTIFIED",
        legalText: "No legal restriction on this disclosure has been identified.",
      },
      {
        id: "RESTRICTION_AFFECTS_DISCLOSURE",
        legalText: "A legal restriction affects disclosure of the combined fatality total.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "Paragraph 41(b) states the restriction. No separate restriction concept was verified.",
  ),
  validationNote:
    "An unassessed restriction is not NO_RESTRICTION_IDENTIFIED. A restriction affecting disclosure is not missing information and is not a reported zero. This restriction is not paragraph 22.",
  dataSourceNote:
    "The paragraph 41(b) restriction is recorded here. A restricted-disclosure workflow is not implemented in this phase.",
});

const FATALITY_ACCIDENTS = b9({
  id: "B9_FATALITIES_FROM_ACCIDENTS",
  paragraph: "41(b)",
  regulatoryStatement: "Fatalities resulting from recordable work-related accidents.",
  requirementType: "ESSENTIAL",
  applicability: WHEN_REPORTABLE,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: INTEGER_COUNT,
  xbrl: unverifiedXbrl(
    "This component is a preparation input. The verified concept is the combined total, and that QName is not copied here.",
  ),
  dataSourceNote: "Aggregate counts only. This input is not a second mandatory fatality total.",
});

const FATALITY_ILL_HEALTH = b9({
  id: "B9_FATALITIES_FROM_ILL_HEALTH",
  paragraph: "41(b)",
  regulatoryStatement: "Fatalities resulting from recordable work-related ill health.",
  requirementType: "ESSENTIAL",
  applicability: WHEN_REPORTABLE,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: INTEGER_COUNT,
  xbrl: unverifiedXbrl(
    "This component is a preparation input. The verified concept is the combined total, and that QName is not copied here.",
  ),
  dataSourceNote:
    "A case of work-related ill health is recordable if it results in death or absence from work. Aggregate counts only. This input is not a second mandatory fatality total.",
});

const FATALITY_SUM = b9({
  id: "B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM",
  paragraph: "41(b)",
  regulatoryStatement:
    "subject to legal restrictions, the sum of the fatalities as a result of recordable work-related accidents and recordable work-related ill health.",
  requirementType: "ESSENTIAL",
  applicability: WHEN_REPORTABLE,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("41(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: INTEGER_COUNT,
  xbrl: verifiedXbrl(
    "vs:SumOfFatalitiesAsAResultOfRecordableWorkRelatedAccidentsAndRecordableWorkRelatedIllHealth",
    {
      note: "One combined total. The accident-fatality and ill-health-fatality figures stay preparation inputs.",
    },
  ),
  calculation: Object.freeze({
    status: "INCOMPLETE",
    ...NO_FACTORS,
    inputs: Object.freeze([
      "B9_FATALITIES_FROM_ACCIDENTS",
      "B9_FATALITIES_FROM_ILL_HEALTH",
    ]),
    excludes: Object.freeze(["B9_RECORDABLE_ACCIDENTS"]),
    safeguards: Object.freeze([
      "The reported quantity is one combined total.",
      "The two fatality components are preparation inputs.",
      "The two fatality components are not added without a double-counting check.",
      "A missing fatality figure is not zero.",
      "A reported zero is distinct from missing information.",
      "Separate fatality reporting remains even when a fatality is also a recordable accident.",
      "This restriction is not paragraph 22.",
    ]),
  }),
  dataSourceNote: "Aggregate counts only.",
});

export const B9_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B9",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Workforce – Health and safety",
  paragraphs: Object.freeze(["41(a)", "41(b)"]),
  datapoints: Object.freeze([
    ACCIDENTS,
    HOURS,
    HOURS_ORIGIN,
    RATE_BASIS,
    RATE,
    RESTRICTION,
    FATALITY_ACCIDENTS,
    FATALITY_ILL_HEALTH,
    FATALITY_SUM,
  ]),
  repeatingGroups: Object.freeze([]),
  guidanceDatapoints: Object.freeze([]),
});

export function b9Datapoints(): readonly Vs2026Datapoint[] {
  return B9_DISCLOSURE.datapoints;
}

export function b9AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b9Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
