import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure, Vs2026RepeatingGroup } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, knowledgeHubUnavailable, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B8, paragraph 40.
 * Contract, gender, and country are three requirements.
 * There is no square-bracket relief. Annex II covers 40(a) and 40(b) for both employee profiles.
 * Paragraph 40(c) is not an Annex II row.
 * Employee turnover is Comprehensive C5 paragraph 58 and is not defined here.
 */

const WHEN_MULTI_COUNTRY = Object.freeze({
  kind: "WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY",
} as const);

const ANNEX_CONTRACT = Object.freeze({
  listed: true as const,
  disclosure: "B8" as const,
  reference: "Para 40, point (a)",
});

const ANNEX_GENDER = Object.freeze({
  listed: true as const,
  disclosure: "B8" as const,
  reference: "Para 40, point (b)",
});

const WORKFORCE = Object.freeze({
  kind: "WORKFORCE_COUNT" as const,
  measurementBasisDatapointId: "B8_MEASUREMENT_BASIS" as const,
  sharedEnumerationDatapointId: "B1_EMPLOYEE_COUNTING_METHODOLOGY" as const,
  headcountAndFte: "DO_NOT_ADD" as const,
  silentConversion: "NOT_PERMITTED" as const,
  oneFteEqualsOneEmployee: false as const,
  distinctFromEmployeeSizeMeasure: "VS2026_EMPLOYEE_PROPORTIONALITY" as const,
  missingCount: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

const COUNT_CHECKS = Object.freeze([
  "A missing count is not zero.",
  "A reported zero stays distinct from a missing count.",
  "Headcount and full-time equivalents are not added.",
  "Headcount is not silently converted to full-time equivalents.",
  "One full-time equivalent is not assumed to equal one employee.",
  "Comparable counts use one measurement basis.",
  "Headcount is a non-negative integer. Full-time equivalents may use a decimal.",
  "Totals are compared only when the reporting boundary and the basis are the same.",
  "An employee is not counted twice inside one breakdown.",
  "An identifier outside the verified categories is invalid.",
  "Do not require this count to equal B1_EMPLOYEES when the measurement basis, reporting period, organisational boundary, or methodology differs.",
]);

const NO_FORMULA = Object.freeze({
  status: "BOUNDARY_ONLY" as const,
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
  safeguards: COUNT_CHECKS,
});

function b8(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B8",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    ...point,
  });
}

const MEASUREMENT_BASIS = b8({
  id: "B8_MEASUREMENT_BASIS",
  paragraph: "40",
  regulatoryStatement:
    "The undertaking shall disclose the number of employees in headcount or full-time equivalent for the following metrics:",
  requirementType: "ESSENTIAL",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: knowledgeHubUnavailable(
    "Paragraph 40 has no separate publishable Knowledge Hub URL. The verified pages are the 40(a), 40(b), and 40(c) subpoint pages.",
  ),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "VERIFIED",
    members: [
      { id: "HEADCOUNT", legalText: "headcount", xbrlMember: "HeadcountMember" },
      {
        id: "FULL_TIME_EQUIVALENT",
        legalText: "full-time equivalents",
        xbrlMember: "Full-TimeEquivalentFTEMember",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "The member identifiers match B1_EMPLOYEE_COUNTING_METHODOLOGY. No separate B8 concept was verified, so that B1 concept is not copied onto this datapoint.",
  ),
  validationNote:
    "The selected basis is preserved with each reported workforce quantity. An unanswered basis is UNASSESSED. The reporting period is the duration of the fact. A period-end snapshot is not hardcoded.",
  dataSourceNote:
    "Member identifiers match B1_EMPLOYEE_COUNTING_METHODOLOGY. The paragraph 40 basis is not forced to equal the paragraph 27(e)(v) basis. This selection is not the Phase 2A measure VS2026_EMPLOYEE_PROPORTIONALITY.",
  futureValidation: COUNT_CHECKS,
});

function contractCount(id: "B8_EMPLOYEES_PERMANENT" | "B8_EMPLOYEES_TEMPORARY", qname: `vs:${string}`, legalText: string): Vs2026Datapoint {
  return b8({
    id,
    paragraph: "40(a)",
    regulatoryStatement: "type of employment contract (temporary or permanent)",
    requirementType: "ESSENTIAL",
    applicability: { kind: "ALWAYS" },
    annexII: ANNEX_CONTRACT,
    knowledgeHub: verifiedParagraph("40(a)"),
    role: "REGULATORY_DATAPOINT",
    informationClass: "REGULATORY_FACT",
    value: WORKFORCE,
    xbrl: verifiedXbrl(qname),
    calculation: NO_FORMULA,
    validationNote: `${legalText} A missing count is not zero. An identifier outside permanent and temporary is invalid.`,
    dataSourceNote:
      "An employee is an individual who is in an employment relationship with the undertaking according to national law or practice. Permanent and temporary are the Annex I categories. National law supplies the meaning of those categories. Aggregate counts only.",
    futureValidation: COUNT_CHECKS,
  });
}

const PERMANENT = contractCount(
  "B8_EMPLOYEES_PERMANENT",
  "vs:NumberOfPermanentContractEmployees",
  "Permanent employment contract.",
);

const TEMPORARY = contractCount(
  "B8_EMPLOYEES_TEMPORARY",
  "vs:NumberOfTemporaryContractEmployees",
  "Temporary employment contract.",
);

function genderCount(id: "B8_EMPLOYEES_MALE" | "B8_EMPLOYEES_FEMALE" | "B8_EMPLOYEES_OTHER_GENDER" | "B8_EMPLOYEES_GENDER_NOT_REPORTED", qname: `vs:${string}`, category: string): Vs2026Datapoint {
  return b8({
    id,
    paragraph: "40(b)",
    regulatoryStatement: "gender",
    requirementType: "ESSENTIAL",
    applicability: { kind: "ALWAYS" },
    annexII: ANNEX_GENDER,
    knowledgeHub: verifiedParagraph("40(b)"),
    role: "REGULATORY_DATAPOINT",
    informationClass: "REGULATORY_FACT",
    value: WORKFORCE,
    xbrl: verifiedXbrl(qname, {
      note: "Annex I requires a gender breakdown. This verified concept is one aggregate category in that breakdown. No separate member QName was verified.",
    }),
    calculation: NO_FORMULA,
    validationNote: `${category} A missing count is not zero. Gender not reported is a category, not a missing value. An unanswered field is not this category.`,
    dataSourceNote:
      "Aggregate counts only. National law may not use the same gender categories. These categories are the verified digital model for paragraph 40(b), not a list of mandatory activities beyond the gender breakdown.",
    futureValidation: COUNT_CHECKS,
  });
}

const MALE = genderCount("B8_EMPLOYEES_MALE", "vs:NumberOfMaleEmployees", "Male.");
const FEMALE = genderCount("B8_EMPLOYEES_FEMALE", "vs:NumberOfFemaleEmployees", "Female.");
const OTHER_GENDER = genderCount(
  "B8_EMPLOYEES_OTHER_GENDER",
  "vs:NumberOfOtherGenderEmployees",
  "Other.",
);
const GENDER_NOT_REPORTED = genderCount(
  "B8_EMPLOYEES_GENDER_NOT_REPORTED",
  "vs:NumberOfNonReportedGenderEmployees",
  "Not reported.",
);

const MULTI_COUNTRY = b8({
  id: "B8_MULTI_COUNTRY_OPERATIONS",
  paragraph: "40(c)",
  regulatoryStatement:
    "country of the employment contract, if the undertaking operates in more than one country.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("40(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      {
        id: "OPERATES_IN_MORE_THAN_ONE_COUNTRY",
        legalText: "The undertaking operates in more than one country.",
      },
      {
        id: "DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY",
        legalText: "The undertaking does not operate in more than one country.",
      },
    ],
  },
  xbrl: unverifiedXbrl(
    "Paragraph 40(c) states the condition. No concept was verified for the assessment itself.",
  ),
  validationNote:
    "An unanswered assessment is UNASSESSED. UNASSESSED is not DOES_NOT_OPERATE_IN_MORE_THAN_ONE_COUNTRY. B1 site records do not select this condition. The registered country is not treated as every employment-contract country.",
});

const COUNTRY_CODE = b8({
  id: "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
  paragraph: "40(c)",
  regulatoryStatement: "country of the employment contract",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_MULTI_COUNTRY,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("40(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  repeatingGroupId: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
  value: {
    kind: "COUNTRY_CODE",
    codeList: "NOT_REPRODUCED",
    axis: "CountryOfEmploymentContractAxis",
  },
  xbrl: unverifiedXbrl(
    "CountryOfEmploymentContractAxis is the axis named in the audit. Country member QNames are not reproduced. The count concept is separate.",
  ),
});

const BY_COUNTRY = b8({
  id: "B8_EMPLOYEES_BY_COUNTRY",
  paragraph: "40(c)",
  regulatoryStatement:
    "country of the employment contract, if the undertaking operates in more than one country.",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_MULTI_COUNTRY,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("40(c)"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  repeatingGroupId: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
  value: WORKFORCE,
  xbrl: verifiedXbrl("vs:NumberOfEmployeesForCountryOfEmploymentContract", {
    dimensions: ["CountryOfEmploymentContractAxis"],
    note: "One concept repeated by country. The five fixed country slots are not reproduced.",
  }),
  calculation: NO_FORMULA,
  validationNote: "A missing count is not zero. There is no fixed country maximum.",
  dataSourceNote:
    "Each row is the country of the employment contract and the employee number on the selected basis. Aggregate counts only.",
  futureValidation: COUNT_CHECKS,
});

const COUNTRIES: Vs2026RepeatingGroup = Object.freeze({
  id: "B8_EMPLOYMENT_CONTRACT_COUNTRY",
  disclosure: "B8",
  paragraph: "40(c)",
  regulatoryStatement:
    "Open list of employment-contract countries. There is no fixed country maximum.",
  cardinality: "ZERO_OR_MORE",
  maximum: null,
  applicability: WHEN_MULTI_COUNTRY satisfies ApplicabilityCondition,
  components: Object.freeze([COUNTRY_CODE, BY_COUNTRY]),
});

/** Legacy B8 turnover field. It moves to C5 paragraph 58 and is not a B8 datapoint. */
export const B8_NOT_CARRIED_FORWARD = Object.freeze([
  "B8_TURNOVER_EMPLOYEE_TURNOVER_RATE",
]);

export const B8_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B8",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Workforce – General characteristics",
  paragraphs: Object.freeze(["40(a)", "40(b)", "40(c)"]),
  datapoints: Object.freeze([
    MEASUREMENT_BASIS,
    PERMANENT,
    TEMPORARY,
    MALE,
    FEMALE,
    OTHER_GENDER,
    GENDER_NOT_REPORTED,
    MULTI_COUNTRY,
  ]),
  repeatingGroups: Object.freeze([COUNTRIES]),
  guidanceDatapoints: Object.freeze([]),
});

export function b8Datapoints(): readonly Vs2026Datapoint[] {
  return [
    ...B8_DISCLOSURE.datapoints,
    ...B8_DISCLOSURE.repeatingGroups.flatMap((group) => group.components),
  ];
}

export function b8AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b8Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
