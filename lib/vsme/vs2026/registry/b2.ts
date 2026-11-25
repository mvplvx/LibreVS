import type { ApplicabilityCondition, Vs2026Datapoint, Vs2026Disclosure } from "./types";
import {
  NO_EMPLOYEE_SIZE_RELIEF,
  VS2026_REGISTRY_STANDARD,
  unverifiedXbrl,
  verifiedXbrl,
} from "./types";
import { ANNEX_II_NOT_LISTED, verifiedParagraph } from "./references";

/**
 * Annex I disclosure B2, paragraphs 29 to 31.
 * Appendix B topics are the regulatory classification list.
 * The three cooperative items are EFRAG guidance paragraph 15, not Annex I.
 */

export const APPENDIX_B_TOPICS = Object.freeze([
  "Climate Change",
  "Pollution",
  "Water",
  "Biodiversity and Ecosystems",
  "Circular Economy and Resource Use",
  "Own Workforce and Workers in the Value Chain",
  "Affected Communities",
  "Consumers and End-users",
  "Business Conduct",
]);

const WHEN_B2 = Object.freeze({
  kind: "WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST",
} as const);

const WHEN_POLICIES = Object.freeze({ kind: "WHEN_POLICIES_EXIST" } as const);

function b2Annex(
  point: Omit<
    Vs2026Datapoint,
    "disclosure" | "module" | "employeeSizeRule" | "annexII" | "role"
  > &
    Partial<Pick<Vs2026Datapoint, "role">>,
): Vs2026Datapoint {
  return Object.freeze({
    disclosure: "B2",
    module: "BASIC",
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    annexII: ANNEX_II_NOT_LISTED,
    role: point.role ?? "REGULATORY_DATAPOINT",
    ...point,
  });
}

const HAS_PRACTICES = b2Annex({
  id: "B2_HAS_PRACTICES",
  paragraph: "29(a)",
  regulatoryStatement:
    "whether it has practices, which in this context may include, for instance, efforts to reduce water and electricity consumption, to reduce GHG emissions or to prevent pollution, and initiatives to improve product safety as well as current initiatives to improve working conditions and equal treatment in the workplace, and partnerships related to sustainability projects",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_B2,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "BOOLEAN" },
  xbrl: unverifiedXbrl(
    "Paragraph 29(a) is distinct from policies and future initiatives. No separate concept QName was verified; the issue enumeration covers practice, policy and future initiative together.",
  ),
});

const HAS_POLICIES = b2Annex({
  id: "B2_HAS_POLICIES",
  paragraph: "29(b)",
  regulatoryStatement: "whether it has policies on sustainability issues",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_B2,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "BOOLEAN" },
  xbrl: unverifiedXbrl(
    "Paragraph 29(b) asks whether the undertaking has policies. No separate concept QName was verified for that yes/no fact.",
  ),
});

const POLICIES_PUBLIC = b2Annex({
  id: "B2_PRACTICE_POLICY_OR_INITIATIVE_IS_PUBLIC",
  paragraph: "29(b)",
  regulatoryStatement: "whether they are publicly available",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_POLICIES,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "BOOLEAN" },
  xbrl: verifiedXbrl("vs:PracticePolicyAndOrFutureInitiativeIsPubliclyAvailable", {
    note: "The legal sentence asks whether policies are publicly available. The concept name also mentions practices and future initiatives. One boolean cannot express mixed availability.",
  }),
  validationNote:
    "Applies when the undertaking has policies. Mixed public and non-public policies are unresolved for this single boolean.",
});

const SEPARATE_ESG_POLICIES = b2Annex({
  id: "B2_SEPARATE_ESG_POLICIES",
  paragraph: "29(b)",
  regulatoryStatement:
    "any separate environmental, social or governance policies for addressing sustainability issues",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_POLICIES,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "NARRATIVE" },
  xbrl: unverifiedXbrl(
    "Paragraph 29(b) asks for any separate environmental, social or governance policies. No concept QName was verified for that statement.",
  ),
});

const FUTURE_INITIATIVES = b2Annex({
  id: "B2_HAS_FUTURE_INITIATIVES",
  paragraph: "29(c)",
  regulatoryStatement:
    "any future initiatives or forward-looking plans that are being implemented on sustainability issues",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_B2,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "BOOLEAN" },
  xbrl: unverifiedXbrl(
    "Paragraph 29(c) is distinct from current practices. No separate concept QName was verified.",
  ),
});

const TARGETS = b2Annex({
  id: "B2_POLICY_HAS_TARGET",
  paragraph: "29(d)",
  regulatoryStatement: "targets to monitor the implementation of the policies",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_POLICIES,
  knowledgeHub: verifiedParagraph("29-31"),
  value: { kind: "BOOLEAN" },
  xbrl: verifiedXbrl("vs:UndertakingHasSetATargetWhichIsRelatedToAPolicy", {
    note: "This is whether a target exists. Narrative target content belongs to disclosure C2, which is not defined here.",
  }),
});

const ISSUES = b2Annex({
  id: "B2_SUSTAINABILITY_ISSUES_ADDRESSED",
  paragraph: "30",
  regulatoryStatement:
    "Appendix B provides a list of possible sustainability issues that could be covered in this disclosure",
  requirementType: "IF_APPLICABLE",
  applicability: WHEN_B2,
  knowledgeHub: verifiedParagraph("29-31"),
  value: {
    kind: "ENUMERATION_SET",
    classification: "APPENDIX_B_TOPICS",
    fullMemberList: "REGULATORY_TOPIC_LIST",
  },
  xbrl: verifiedXbrl(
    "vs:SustainabilityIssueAddressedByPracticePolicyAndOrFutureInitiative",
    {
      note: "Concept QName is verified. Taxonomy member QNames for the Appendix B topics were not re-read and are not listed.",
    },
  ),
});

function guidance(
  id: string,
  paragraph: "guidance-15(a)" | "guidance-15(b)" | "guidance-15(c)",
  regulatoryStatement: string,
  value: Vs2026Datapoint["value"],
  qname: `vs:${string}`,
): Vs2026Datapoint {
  return Object.freeze({
    id,
    disclosure: "B2",
    module: "BASIC",
    paragraph,
    regulatoryStatement,
    requirementType: "VOLUNTARY",
    applicability: { kind: "GUIDANCE_OUTSIDE_ANNEX_I" } satisfies ApplicabilityCondition,
    employeeSizeRule: NO_EMPLOYEE_SIZE_RELIEF,
    annexII: ANNEX_II_NOT_LISTED,
    knowledgeHub: verifiedParagraph(paragraph),
    role: "PREPARATION_GUIDANCE",
    value,
    xbrl: verifiedXbrl(qname, {
      note: "EFRAG non-mandatory guidance paragraph 15. Not Annex I paragraph 15 and not an Annex I completion item.",
    }),
  });
}

const GUIDANCE: readonly Vs2026Datapoint[] = Object.freeze([
  guidance(
    "B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION",
    "guidance-15(a)",
    "effective participation of workers, users or other interested parties or communities in governance",
    { kind: "NARRATIVE" },
    "vs:DescriptionOfTheEffectiveParticipationOfWorkersUsersOrOtherInterestedPartiesOrCommunitiesInGovernance",
  ),
  guidance(
    "B2_COOPERATIVE_DISCLOSURES_COOP_INVESTMENT_SOCIAL_ECONOMY",
    "guidance-15(b)",
    "financial investment in the capital or assets of social economy entities",
    { kind: "MONETARY", currency: "REPORTING_CURRENCY" },
    "vs:FinancialInvestmentInTheCapitalOrAssetsOfSocialEconomyEntities",
  ),
  guidance(
    "B2_COOPERATIVE_DISCLOSURES_COOP_PROFIT_DISTRIBUTION_LIMITS",
    "guidance-15(c)",
    "limits to the distribution of profits connected to the mutualistic nature or to services of general economic interest",
    { kind: "NARRATIVE" },
    "vs:DescriptionOfLimitsToTheDistributionOfProfitsConnectedToTheMutualisticNatureOrToTheNatureOfTheActivitiesConsistingInServicesOfGeneralEconomicInterestSGEI",
  ),
]);

export const B2_DISCLOSURE: Vs2026Disclosure = Object.freeze({
  id: "B2",
  module: "BASIC",
  standard: VS2026_REGISTRY_STANDARD,
  title:
    "Practices, policies and future initiatives for transitioning towards a more sustainable economy",
  paragraphs: Object.freeze(["29", "30", "31"]),
  datapoints: Object.freeze([
    HAS_PRACTICES,
    HAS_POLICIES,
    POLICIES_PUBLIC,
    SEPARATE_ESG_POLICIES,
    FUTURE_INITIATIVES,
    TARGETS,
    ISSUES,
  ]),
  repeatingGroups: Object.freeze([]),
  guidanceDatapoints: GUIDANCE,
  relations: Object.freeze([
    Object.freeze({
      paragraph: "31",
      statement:
        "If the undertaking also reports on the Comprehensive module, it shall complement the information provided under B2 with the datapoints found in C2.",
      targetDisclosure: "C2",
      whenReportingOption: "OPTION_B",
      paragraph25Selection: "UNRESOLVED",
    }),
  ]),
});
