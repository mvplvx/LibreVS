import { field, section, subsection } from "../schemaHelpers";

const SUSTAINABILITY_ISSUES = [
  { id: "climate_change", label: "Climate change", xbrl: "ClimateChange" },
  { id: "pollution", label: "Pollution", xbrl: "Pollution" },
  { id: "water_marine", label: "Water and marine resources", xbrl: "WaterAndMarineResources" },
  { id: "biodiversity", label: "Biodiversity and ecosystems", xbrl: "BiodiversityAndEcosystems" },
  { id: "circular_economy", label: "Circular economy", xbrl: "CircularEconomy" },
  { id: "own_workforce", label: "Own workforce", xbrl: "OwnWorkforce" },
  { id: "value_chain_workers", label: "Workers in the value chain", xbrl: "WorkersInTheValueChain" },
  { id: "affected_communities", label: "Affected communities", xbrl: "AffectedCommunities" },
  { id: "consumers_end_users", label: "Consumers and end-users", xbrl: "ConsumersAndEndUsers" },
  { id: "business_conduct", label: "Business conduct", xbrl: "BusinessConduct" },
] as const;

function b2IssueFields(
  issueId: string,
  label: string,
  xbrl: string
): ReturnType<typeof field>[] {
  return [
    field(
      `${issueId}_has_practice_policy_or_initiative`,
      "boolean",
      `HasPracticePolicyOrFutureInitiativeFor${xbrl}`,
      "General",
      `${label}: practice, policy or future initiative`,
      { efragParagraph: "26" }
    ),
    field(
      `${issueId}_publicly_available`,
      "boolean",
      `ArePoliciesFor${xbrl}PubliclyAvailable`,
      "General",
      `${label}: policies publicly available`,
      { efragParagraph: "26(b)" }
    ),
    field(
      `${issueId}_has_targets`,
      "boolean",
      `DoPoliciesFor${xbrl}HaveTargets`,
      "General",
      `${label}: policies have targets`,
      { efragParagraph: "26(d)" }
    ),
  ];
}

export const B2_PRACTICES_POLICIES = section(
  "B2_PRACTICES_POLICIES",
  "B2",
  "Practices, policies and future initiatives",
  "B",
  [
    subsection(
      "sustainability_issues_matrix",
      "Sustainability issues matrix (paragraphs 26-27, 78)",
      SUSTAINABILITY_ISSUES.flatMap((i) => b2IssueFields(i.id, i.label, i.xbrl))
    ),
    subsection("cooperative_disclosures", "Cooperative undertakings (paragraph 79)", [
      field(
        "coop_worker_user_participation",
        "string",
        "EffectiveParticipationOfWorkersUsersOrInterestedParties",
        "General",
        "Effective participation of workers/users in governance",
        { efragParagraph: "79(a)" }
      ),
      field(
        "coop_investment_social_economy",
        "number",
        "FinancialInvestmentInSocialEconomyEntities",
        "General",
        "Financial investment in social economy entities",
        { efragParagraph: "79(b)", unit: "EUR" }
      ),
      field(
        "coop_profit_distribution_limits",
        "string",
        "LimitsToProfitDistributionConnectedToMutualisticNature",
        "General",
        "Limits to profit distribution (mutualistic/SGEI)",
        { efragParagraph: "79(c)" }
      ),
    ]),
  ]
);
