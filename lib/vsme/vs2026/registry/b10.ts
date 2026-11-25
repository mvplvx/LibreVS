import type { Vs2026Datapoint, Vs2026Disclosure } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B10, paragraph 42.
 * There is no square-bracket relief.
 * Annex II covers 42(a), 42(c), and 42(d) for both employee profiles.
 * Paragraph 42(b) is conditional and is not an Annex II row.
 * Gender-specific training averages are not recreated.
 */

const WHEN_MINIMUM = Object.freeze({
  kind: "WHEN_APPLICABLE_MINIMUM_REMUNERATION_IS_IDENTIFIED",
} as const);

const WHEN_PAY_GAP = Object.freeze({
  kind: "WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED",
} as const);

const ANNEX_WAGE = Object.freeze({
  listed: true as const,
  disclosure: "B10" as const,
  reference: "Para 42, point (a)",
});

const ANNEX_COVERAGE = Object.freeze({
  listed: true as const,
  disclosure: "B10" as const,
  reference: "Para 42, point (c)",
});

const ANNEX_TRAINING = Object.freeze({
  listed: true as const,
  disclosure: "B10" as const,
  reference: "Para 42, point (d)",
});

const NO_FORMULA = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

const COVERAGE_PERCENT = Object.freeze({
  kind: "PERCENTAGE" as const,
  reportedUnit: "PERCENT" as const,
  bounds: "ZERO_TO_100" as const,
  missingValue: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
  zeroDenominator: "NOT_A_VALID_PERCENTAGE" as const,
});

function b10(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B10",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    ...point,
  });
}

const WAGE_DETERMINATION = b10({
  id: "B10_MINIMUM_WAGE_DETERMINATION",
  paragraph: "42(a)",
  regulatoryStatement:
    "whether the employees receive pay that is equal or above applicable minimum wage for the country it reports on, determined directly by the national minimum wage law or through a collective bargaining agreement",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      { id: "STATUTORY_MINIMUM_WAGE", legalText: "Applicable statutory minimum wage." },
      {
        id: "COLLECTIVELY_AGREED_MINIMUM_REMUNERATION",
        legalText: "Applicable collectively agreed minimum remuneration.",
      },
      {
        id: "NO_APPLICABLE_MINIMUM_IDENTIFIED",
        legalText: "No applicable minimum remuneration identified after assessment.",
      },
      {
        id: "DETERMINATION_UNRESOLVED",
        legalText: "Legal or contractual determination unresolved.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The verified concept is the yes-or-no pay fact. No concept was verified for this determination.",
  ),
  validationNote:
    "An unanswered determination is UNASSESSED. UNASSESSED is not NO and is not NO_APPLICABLE_MINIMUM_IDENTIFIED. Absence of a statutory minimum wage is not a NO. The registered country is not every employee's applicable minimum remuneration.",
  dataSourceNote:
    "NON-MANDATORY GUIDANCE paragraphs 121-122 discuss minimum wage. A country without a general statutory minimum wage is not a negative result. B8_EMPLOYMENT_CONTRACT_COUNTRY is the employment-contract country inventory. The verified digital fact is one response. How results for several countries or agreements combine into that one response is unresolved. Aggregate remuneration only.",
});

const MINIMUM_WAGE = b10({
  id: "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE",
  paragraph: "42(a)",
  regulatoryStatement:
    "whether the employees receive pay that is equal or above applicable minimum wage for the country it reports on, determined directly by the national minimum wage law or through a collective bargaining agreement",
  requirementType: "ESSENTIAL",
  applicability: WHEN_MINIMUM,
  annexII: ANNEX_WAGE,
  knowledgeHub: verifiedParagraph("42(a)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      { id: "YES", legalText: "Applicable minimum remuneration is met." },
      { id: "NO", legalText: "Applicable minimum remuneration is not met." },
    ],
  },
  xbrl: verifiedXbrl(
    "vs:EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement",
    {
      note: "The taxonomy boolean does not store UNASSESSED. An empty value is not serialised as false.",
    },
  ),
  validationNote:
    "An unanswered value is UNASSESSED. UNASSESSED is not NO. NO_APPLICABLE_MINIMUM_IDENTIFIED is not NO.",
  dataSourceNote:
    "Pay includes the ordinary basic or minimum wage or salary and other remuneration in cash or in kind. Aggregate remuneration only.",
});

const PAY_GAP_OBLIGATION = b10({
  id: "B10_GENDER_PAY_GAP_LEGAL_OBLIGATION",
  paragraph: "42(b)",
  regulatoryStatement:
    "if the undertaking is already required by EU law or other national regulations to report the percentage gap in pay between its female and male employees, it shall disclose it",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      {
        id: "LEGALLY_REQUIRED_TO_REPORT",
        legalText: "Already legally required to report the percentage pay gap.",
      },
      {
        id: "NO_IDENTIFIED_REPORTING_REQUIREMENT",
        legalText: "Not subject to an identified reporting requirement.",
      },
    ],
  },
  xbrl: unverifiedXbrl("No concept was verified for the legal-obligation assessment."),
  validationNote:
    "An unanswered assessment is UNASSESSED. UNASSESSED is not NO_IDENTIFIED_REPORTING_REQUIREMENT. Company workforce size does not select this condition. The presence of female and male employees does not select this condition. An entered percentage does not select this condition.",
});

const PAY_GAP = b10({
  id: "B10_GENDER_PAY_GAP_PERCENT",
  paragraph: "42(b)",
  regulatoryStatement: "the percentage gap in pay between its female and male employees",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PAY_GAP,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "PERCENTAGE",
    reportedUnit: "PERCENT",
    bounds: "NOT_ASSUMED",
    missingValue: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
    zeroDenominator: "NOT_A_VALID_PERCENTAGE",
  },
  xbrl: verifiedXbrl("vs:PercentageGapInPayBetweenFemaleAndMaleEmployees"),
  calculation: Object.freeze({
    status: "INCOMPLETE",
    ...NO_FORMULA,
    inputs: Object.freeze([
      "B10_AVERAGE_FEMALE_REMUNERATION",
      "B10_AVERAGE_MALE_REMUNERATION",
    ]),
    safeguards: Object.freeze([
      "The percentage is the reportable fact. The averages are calculation inputs.",
      "An applicable-law methodology is preserved. The guidance average is not substituted for that methodology.",
      "A missing remuneration input is not zero.",
      "Aggregate remuneration inputs only.",
    ]),
  }),
  dataSourceNote:
    "NON-MANDATORY GUIDANCE paragraphs 123-131 describe average female and male remuneration. The sign and components follow the methodology required by the applicable law. Aggregate remuneration inputs only.",
});

const FEMALE_PAY = b10({
  id: "B10_AVERAGE_FEMALE_REMUNERATION",
  paragraph: "42(b)",
  regulatoryStatement: "Average female remuneration used as a pay-gap input.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PAY_GAP,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
  xbrl: unverifiedXbrl("No separate average-remuneration concept was verified."),
  dataSourceNote: "Aggregate remuneration inputs only. The reporting currency is the company currency.",
});

const MALE_PAY = b10({
  id: "B10_AVERAGE_MALE_REMUNERATION",
  paragraph: "42(b)",
  regulatoryStatement: "Average male remuneration used as a pay-gap input.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_PAY_GAP,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(b)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
  xbrl: unverifiedXbrl("No separate average-remuneration concept was verified."),
  dataSourceNote: "Aggregate remuneration inputs only. The reporting currency is the company currency.",
});

const COVERAGE = b10({
  id: "B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT",
  paragraph: "42(c)",
  regulatoryStatement: "the percentage of employees covered by collective bargaining agreements",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_COVERAGE,
  knowledgeHub: verifiedParagraph("42(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: COVERAGE_PERCENT,
  xbrl: verifiedXbrl("vs:PercentageOfEmployeesCoveredByCollectiveBargainingAgreements"),
  calculation: Object.freeze({
    status: "INCOMPLETE",
    ...NO_FORMULA,
    zeroDenominator: "NOT_A_VALID_PERCENTAGE",
    inputs: Object.freeze([
      "B10_EMPLOYEES_COVERED_BY_COLLECTIVE_BARGAINING",
      "B10_COLLECTIVE_BARGAINING_DENOMINATOR",
    ]),
    safeguards: Object.freeze([
      "Trade union membership is not collective bargaining coverage.",
      "An employee covered by more than one agreement is counted once.",
      "Covered employees cannot exceed the headcount denominator.",
      "The coverage result is from 0 to 100 percent.",
      "A zero denominator is not a valid percentage.",
      "A missing coverage figure is not zero.",
      "A verified zero percent is a valid result.",
      "A reporting band does not replace the percentage.",
      "Headcount is not mixed with full-time equivalents unless a methodology justifies it.",
    ]),
  }),
  dataSourceNote:
    "Collective bargaining is negotiation between an employer side and a worker side for working conditions or their relations. NON-MANDATORY GUIDANCE paragraphs 132-135 use headcount and discuss percentage ranges. No reporting-band concept was verified, so no band is stored.",
});

const COVERED = b10({
  id: "B10_EMPLOYEES_COVERED_BY_COLLECTIVE_BARGAINING",
  paragraph: "42(c)",
  regulatoryStatement: "Number of employees covered by collective bargaining agreements.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "COUNT",
    nonNegativeInteger: true,
    missingCount: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
  },
  xbrl: unverifiedXbrl(
    "The verified concept is the coverage percentage. No covered-employee concept was verified.",
  ),
  validationNote:
    "An employee covered by more than one agreement is counted once. A missing count is not zero.",
});

const COVERAGE_DENOMINATOR = b10({
  id: "B10_COLLECTIVE_BARGAINING_DENOMINATOR",
  paragraph: "42(c)",
  regulatoryStatement: "Headcount denominator for collective bargaining coverage.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "COUNT",
    nonNegativeInteger: true,
    missingCount: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
  },
  xbrl: unverifiedXbrl("No denominator concept was verified. Guidance uses employee headcount."),
  validationNote:
    "The denominator is headcount. An FTE figure is not reused as this denominator. A zero denominator is not zero percent.",
  dataSourceNote:
    "Reuse a B8 headcount only when the reporting period, organisational boundary, and measurement basis are the same headcount. This count is not the Phase 2A employee-size measure.",
});

const TRAINING = b10({
  id: "B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE",
  paragraph: "42(d)",
  regulatoryStatement: "the average number of annual training hours per employee",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_TRAINING,
  knowledgeHub: verifiedParagraph("42(d)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "HOURS_AVERAGE",
    reportedUnit: "HOURS_PER_EMPLOYEE",
    denominator: "HEADCOUNT",
    missingValue: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
    doNotReuseFte: true,
  },
  xbrl: verifiedXbrl("vs:AverageNumberOfAnnualTrainingHoursPerEmployee", {
    note: "One average per employee. Gender-specific averages are not separate legal metrics.",
  }),
  calculation: Object.freeze({
    status: "INCOMPLETE",
    ...NO_FORMULA,
    inputs: Object.freeze(["B10_TOTAL_TRAINING_HOURS", "B10_TRAINING_HEADCOUNT"]),
    safeguards: Object.freeze([
      "Average annual training hours = total relevant training hours ÷ employee headcount.",
      "Missing training hours are not zero.",
      "A verified zero stays distinct from missing training information.",
      "An FTE figure is not reused as this denominator.",
      "Reuse a B8 headcount only when the period, boundary, and basis match this headcount.",
    ]),
  }),
  dataSourceNote:
    "Training is an initiative to maintain or improve skills and knowledge of the undertaking's own workforce. NON-MANDATORY GUIDANCE paragraphs 136-137 describe the headcount average. Gender-specific training averages are not mandatory.",
});

const TRAINING_HOURS = b10({
  id: "B10_TOTAL_TRAINING_HOURS",
  paragraph: "42(d)",
  regulatoryStatement: "Total relevant employee training hours.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(d)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "HOURS_AVERAGE",
    reportedUnit: "HOURS_PER_EMPLOYEE",
    denominator: "HEADCOUNT",
    missingValue: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
    doNotReuseFte: true,
  },
  xbrl: unverifiedXbrl("No total-training-hours concept was verified. The verified concept is the average."),
  validationNote: "Missing training hours are not zero. This input is not the reported average.",
});

const TRAINING_HEADCOUNT = b10({
  id: "B10_TRAINING_HEADCOUNT",
  paragraph: "42(d)",
  regulatoryStatement: "Employee headcount used as the training-hours denominator.",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("42(d)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "COUNT",
    nonNegativeInteger: true,
    missingCount: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
  },
  xbrl: unverifiedXbrl("No training-headcount concept was verified."),
  validationNote:
    "The denominator is headcount. An FTE figure is not reused as this denominator. A zero denominator is not a valid average.",
  dataSourceNote:
    "Reuse a B8 headcount only when the reporting period, organisational boundary, and measurement basis are the same headcount.",
});

/** Legacy gender-split training fields. Paragraph 42(d) is one average. */
export const B10_NOT_CARRIED_FORWARD = Object.freeze([
  "B10_TRAINING_BY_GENDER_TRAINING_HOURS_FEMALE",
  "B10_TRAINING_BY_GENDER_TRAINING_HOURS_MALE",
  "B10_TRAINING_BY_GENDER_TRAINING_HOURS_OTHER_GENDER",
  "B10_TRAINING_BY_GENDER_TRAINING_HOURS_GENDER_NOT_REPORTED",
]);

export const B10_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B10",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Workforce – Remuneration, collective bargaining and training",
  paragraphs: Object.freeze(["42(a)", "42(b)", "42(c)", "42(d)"]),
  datapoints: Object.freeze([
    WAGE_DETERMINATION,
    MINIMUM_WAGE,
    PAY_GAP_OBLIGATION,
    PAY_GAP,
    FEMALE_PAY,
    MALE_PAY,
    COVERAGE,
    COVERED,
    COVERAGE_DENOMINATOR,
    TRAINING,
    TRAINING_HOURS,
    TRAINING_HEADCOUNT,
  ]),
  repeatingGroups: Object.freeze([]),
  guidanceDatapoints: Object.freeze([]),
});

export function b10Datapoints(): readonly Vs2026Datapoint[] {
  return B10_DISCLOSURE.datapoints;
}

export function b10AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b10Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
