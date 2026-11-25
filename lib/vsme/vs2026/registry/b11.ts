import type { Vs2026Datapoint, Vs2026Disclosure } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  verifiedXbrl,
  unverifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B11, paragraph 43.
 * Convictions and fines are separate quantities.
 * There is no square-bracket relief. Paragraph 43 is not an Annex II row.
 * The disclosure is aggregate. No case file or personal identifier is stored.
 */

const WHEN_CONVICTIONS = Object.freeze({
  kind: "WHEN_RELEVANT_CONVICTIONS_OCCURRED",
} as const);

const WHEN_FINES = Object.freeze({
  kind: "WHEN_RELEVANT_FINES_INCURRED",
} as const);

const NO_FORMULA = Object.freeze({
  formula: "NOT_IMPLEMENTED" as const,
  emissionFactors: "NONE" as const,
  conversionFactors: "NONE" as const,
  missingInput: "DO_NOT_TREAT_AS_ZERO" as const,
  reportedZero: "DISTINCT_FROM_MISSING" as const,
});

function b11(
  point: Omit<Vs2026Datapoint, "disclosure" | "module" | "employeeSizeRule">,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B11",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    ...point,
  });
}

const ASSESSMENT = b11({
  id: "B11_CONVICTIONS_AND_FINES_ASSESSMENT",
  paragraph: "43",
  regulatoryStatement:
    "In case of convictions and fines in the reporting period, the undertaking shall disclose the number of convictions, and the total amount of fines incurred for the violation of anti-corruption and anti-bribery laws.",
  requirementType: "IF_APPLICABLE",
  applicability: { kind: "ALWAYS" },
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("43"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "PREPARATION_DATA",
  value: {
    kind: "ENUMERATION",
    fullMemberList: "NOT_REPRODUCED",
    members: [
      { id: "CONVICTIONS_OCCURRED", legalText: "Relevant convictions occurred." },
      { id: "FINES_OCCURRED", legalText: "Relevant fines occurred." },
      { id: "BOTH_OCCURRED", legalText: "Relevant convictions and relevant fines both occurred." },
      {
        id: "NEITHER_AFTER_ASSESSMENT",
        legalText: "Neither relevant convictions nor relevant fines occurred, after assessment.",
      },
    ],
  },
  xbrl: unverifiedXbrl("No concept was verified for the event assessment."),
  validationNote:
    "An unanswered assessment is UNASSESSED. UNASSESSED is not NEITHER_AFTER_ASSESSMENT. An unanswered assessment does not generate zero convictions or zero fines. BOTH_OCCURRED satisfies the conviction condition and the fine condition. NEITHER_AFTER_ASSESSMENT does not write zero into either metric. Whether the word and requires both event types before either metric is reported is unresolved. Each metric follows its own assessed event.",
  dataSourceNote:
    "NON-MANDATORY GUIDANCE paragraphs 138-141 discuss convictions and monetary penalties. Aggregate counts only.",
});

const CONVICTIONS = b11({
  id: "B11_CONVICTIONS_COUNT",
  paragraph: "43",
  regulatoryStatement: "the number of convictions",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_CONVICTIONS,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("43"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: {
    kind: "COUNT",
    nonNegativeInteger: true,
    missingCount: "DO_NOT_TREAT_AS_ZERO",
    reportedZero: "DISTINCT_FROM_MISSING",
  },
  xbrl: verifiedXbrl("vs:TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws"),
  calculation: Object.freeze({
    status: "BOUNDARY_ONLY",
    ...NO_FORMULA,
    excludes: Object.freeze(["B11_FINES_AMOUNT"]),
    safeguards: Object.freeze([
      "The conviction count stays separate from the fine amount.",
      "A pending proceeding is not a conviction.",
      "An allegation is not a conviction.",
      "An investigation is not a conviction.",
      "A non-final decision is not a conviction.",
      "A reported zero stays distinct from a missing count.",
      "A missing count is not zero.",
    ]),
  }),
  dataSourceNote:
    "The count is convictions for violation of anti-corruption and anti-bribery laws in the reporting period. Internal discipline, whistleblower reports, and unresolved litigation are outside this count. Aggregate counts only.",
});

const FINES = b11({
  id: "B11_FINES_AMOUNT",
  paragraph: "43",
  regulatoryStatement: "the total amount of fines incurred for the violation of anti-corruption and anti-bribery laws",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_FINES,
  annexII: ANNEX_II_NOT_LISTED,
  knowledgeHub: verifiedParagraph("43"),
  role: "REGULATORY_DATAPOINT",
  informationClass: "REGULATORY_FACT",
  value: { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
  xbrl: verifiedXbrl("vs:TotalAmountOfFinesForTheViolationOfAnticorruptionAndAntibriberyLaws", {
    note: "The amount uses the reporting currency. Euro is not hardcoded.",
  }),
  calculation: Object.freeze({
    status: "BOUNDARY_ONLY",
    ...NO_FORMULA,
    excludes: Object.freeze(["B11_CONVICTIONS_COUNT"]),
    safeguards: Object.freeze([
      "The fine amount stays separate from the conviction count.",
      "A pending penalty is not an incurred fine.",
      "Cash payment is not assumed to be the recognition period.",
      "No automatic currency conversion is applied.",
      "A fine that is not for anti-corruption or anti-bribery laws is outside this amount.",
      "A missing amount is not zero.",
    ]),
  }),
  dataSourceNote:
    "NON-MANDATORY GUIDANCE paragraphs 138-141 discuss monetary penalties and financial-statement recognition. The reporting period is the duration of the fact. Aggregate amounts only.",
});

export const B11_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B11",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title: "Convictions and fines for corruption and bribery",
  paragraphs: Object.freeze(["43"]),
  datapoints: Object.freeze([ASSESSMENT, CONVICTIONS, FINES]),
  repeatingGroups: Object.freeze([]),
  guidanceDatapoints: Object.freeze([]),
});

export function b11Datapoints(): readonly Vs2026Datapoint[] {
  return B11_DISCLOSURE.datapoints;
}

export function b11AnnexIDatapoints(): readonly Vs2026Datapoint[] {
  return b11Datapoints().filter((datapoint) => datapoint.informationClass === "REGULATORY_FACT");
}
