import { field, section, subsection } from "../schemaHelpers";

export const C1_STRATEGY = section(
  "C1_STRATEGY",
  "C1",
  "Strategy: Business model and sustainability-related initiatives",
  "C",
  [
    subsection("strategy", "Business model and strategy (paragraph 47)", [
      field(
        "products_services_description",
        "string",
        "DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered",
        "General",
        "Significant products and/or services",
        { efragParagraph: "47(a)" }
      ),
      field(
        "markets_description",
        "string",
        "DescriptionOfSignificantMarketsTheUndertakingOperatesIn",
        "General",
        "Significant markets",
        { efragParagraph: "47(b)" }
      ),
      field(
        "business_relationships_description",
        "string",
        "DescriptionOfMainBusinessRelationships",
        "General",
        "Main business relationships",
        { efragParagraph: "47(c)" }
      ),
      field(
        "strategy_sustainability_elements",
        "string",
        "DescriptionOfKeyElementsOfStrategyThatRelateToOrAffectSustainabilityIssues",
        "General",
        "Strategy elements relating to sustainability",
        { efragParagraph: "47(d)" }
      ),
    ]),
  ]
);

export const C2_COMPREHENSIVE_PRACTICES = section(
  "C2_COMPREHENSIVE_PRACTICES",
  "C2",
  "Description of practices, policies and future initiatives",
  "C",
  [
    subsection("comprehensive_practices", "Comprehensive module practices (paragraphs 48-49)", [
      field(
        "comprehensive_practices_description",
        "string",
        "DescriptionOfPracticesPoliciesAndFutureInitiativesForTransitioningTowardsAMoreSustainableEconomy",
        "General",
        "Description of practices, policies and future initiatives",
        { efragParagraph: "48" }
      ),
      field(
        "senior_accountability_level",
        "string",
        "MostSeniorLevelAccountableForImplementingPracticesPoliciesAndFutureInitiatives",
        "General",
        "Most senior level accountable for implementation",
        { efragParagraph: "49" }
      ),
    ]),
  ]
);

export const C3_GHG_TARGETS = section(
  "C3_GHG_TARGETS",
  "C3",
  "GHG reduction targets and climate transition",
  "C",
  [
    subsection("ghg_targets", "GHG emission reduction targets (paragraph 54)", [
      field("ghg_target_year", "number", "GhgEmissionReductionTargetYear", "Environmental", "GHG target year", {
        efragParagraph: "54(a)",
        unit: "year",
      }),
      field("ghg_target_year_value", "number", "GhgEmissionReductionTargetYearValue", "Environmental", "GHG target year value", {
        efragParagraph: "54(a)",
        unit: "tCO2e",
      }),
      field("ghg_base_year", "number", "GhgEmissionReductionBaseYear", "Environmental", "GHG base year", {
        efragParagraph: "54(b)",
        unit: "year",
      }),
      field("ghg_base_year_value", "number", "GhgEmissionReductionBaseYearValue", "Environmental", "GHG base year value", {
        efragParagraph: "54(b)",
        unit: "tCO2e",
      }),
      field("ghg_target_units", "string", "UnitsUsedForGhgEmissionReductionTargets", "Environmental", "Units used for GHG targets", {
        efragParagraph: "54(c)",
      }),
      field(
        "ghg_target_scope_share_description",
        "string",
        "ShareOfScope1Scope2AndScope3ThatGhgEmissionReductionTargetConcerns",
        "Environmental",
        "Share of Scope 1, 2 and 3 covered by target",
        { efragParagraph: "54(d)" }
      ),
      field(
        "ghg_target_main_actions",
        "string",
        "ListOfMainActionsToAchieveGhgEmissionReductionTargets",
        "Environmental",
        "Main actions to achieve GHG targets",
        { efragParagraph: "54(e)" }
      ),
    ]),
    subsection("transition_plan", "Climate transition plan (paragraphs 55-56)", [
      field(
        "transition_plan_description",
        "string",
        "DescriptionOfATransitionPlanForClimateChangeMitigationIncludingAnExplanationOfHowItIsContributingToReduceGhgEmissions",
        "Environmental",
        "Transition plan for climate change mitigation",
        { efragParagraph: "55" }
      ),
      field(
        "transition_plan_adoption_planned",
        "boolean",
        "WillAdoptTransitionPlanForClimateChangeMitigation",
        "Environmental",
        "Will adopt transition plan (if not yet in place)",
        { efragParagraph: "56" }
      ),
      field(
        "transition_plan_adoption_target_date",
        "string",
        "DateWhenTransitionPlanForClimateChangeMitigationWillBeAdopted",
        "Environmental",
        "Date when transition plan will be adopted",
        { efragParagraph: "56" }
      ),
    ]),
  ]
);

export const C4_CLIMATE_RISKS = section(
  "C4_CLIMATE_RISKS",
  "C4",
  "Climate risks",
  "C",
  [
    subsection("climate_risks", "Climate-related risks (paragraphs 57-58)", [
      field(
        "climate_hazards_and_transition_events",
        "string",
        "DescriptionOfClimateRelatedHazardsAndClimateRelatedTransitionEvents",
        "Environmental",
        "Climate-related hazards and transition events",
        { efragParagraph: "57(a)" }
      ),
      field(
        "climate_risk_exposure_assessment",
        "string",
        "DisclosureOfHowExposureAndSensitivityOfAssetsActivitiesAndValueChainToClimateHazardsAndTransitionEventsHaveBeenAssessed",
        "Environmental",
        "Assessment of exposure and sensitivity to climate risks",
        { efragParagraph: "57(b)" }
      ),
      field(
        "climate_risk_time_horizons",
        "string",
        "TimeHorizonsOfClimateRelatedHazardsAndTransitionEventsIdentified",
        "Environmental",
        "Time horizons of identified climate risks",
        { efragParagraph: "57(c)" }
      ),
      field(
        "climate_adaptation_actions",
        "string",
        "DisclosureOfWhetherItHasUndertakenClimateChangeAdaptationActionsForAnyClimateRelatedHazardsAndTransitionEvents",
        "Environmental",
        "Climate change adaptation actions undertaken",
        { efragParagraph: "57(d)" }
      ),
      field(
        "climate_adverse_effects_assessment",
        "string",
        "PotentialAdverseEffectsOfClimateRisksThatMayAffectItsFinancialPerformanceOrBusinessOperationsInTheShortMediumOrLongTermIndicatingWhetherItAssessesTheRisksToBeHighMediumOrLow",
        "Environmental",
        "Potential adverse effects of climate risks (high/medium/low)",
        { efragParagraph: "58" }
      ),
    ]),
  ]
);

export const C5_WORKFORCE_ADDITIONAL = section(
  "C5_WORKFORCE_ADDITIONAL",
  "C5",
  "Additional workforce characteristics",
  "C",
  [
    subsection("workforce_additional", "Additional workforce (paragraphs 59-60)", [
      field(
        "female_to_male_ratio_management",
        "number",
        "FemaleToMaleRatioAtManagementLevel",
        "Social",
        "Female-to-male ratio at management level",
        { efragParagraph: "59", unit: "ratio" }
      ),
      field(
        "self_employed_exclusive_count",
        "number",
        "NumberOfSelfEmployedWithoutPersonnelWorkingExclusivelyForTheUndertaking",
        "Social",
        "Self-employed without personnel working exclusively for undertaking",
        { efragParagraph: "60", unit: "count" }
      ),
      field(
        "temporary_workers_agency_count",
        "number",
        "NumberOfTemporaryWorkersProvidedByUndertakingsPrimarilyEngagedInEmploymentActivities",
        "Social",
        "Temporary workers from employment agencies",
        { efragParagraph: "60", unit: "count" }
      ),
    ]),
  ]
);

export const C6_HUMAN_RIGHTS = section(
  "C6_HUMAN_RIGHTS",
  "C6",
  "Human rights policies and processes",
  "C",
  [
    subsection("human_rights_policies", "Human rights (paragraph 61)", [
      field(
        "code_of_conduct_or_human_rights_policy",
        "boolean",
        "CodeOfConductOrHumanRightsPolicyForOwnWorkforce",
        "Social",
        "Code of conduct or human rights policy for own workforce",
        { efragParagraph: "61(a)" }
      ),
      field("covers_child_labour", "boolean", "PolicyCoversChildLabour", "Social", "Policy covers child labour", {
        efragParagraph: "61(b)(i)",
      }),
      field("covers_forced_labour", "boolean", "PolicyCoversForcedLabour", "Social", "Policy covers forced labour", {
        efragParagraph: "61(b)(ii)",
      }),
      field("covers_human_trafficking", "boolean", "PolicyCoversHumanTrafficking", "Social", "Policy covers human trafficking", {
        efragParagraph: "61(b)(iii)",
      }),
      field("covers_discrimination", "boolean", "PolicyCoversDiscrimination", "Social", "Policy covers discrimination", {
        efragParagraph: "61(b)(iv)",
      }),
      field("covers_accident_prevention", "boolean", "PolicyCoversAccidentPrevention", "Social", "Policy covers accident prevention", {
        efragParagraph: "61(b)(v)",
      }),
      field("covers_other_human_rights", "boolean", "PolicyCoversOtherHumanRights", "Social", "Policy covers other human rights", {
        efragParagraph: "61(b)(vi)",
      }),
      field(
        "other_human_rights_specification",
        "string",
        "SpecificationOfOtherHumanRightsCoveredByPolicy",
        "Social",
        "Specification of other human rights covered",
        { efragParagraph: "61(b)(vi)" }
      ),
      field(
        "complaints_handling_mechanism",
        "boolean",
        "ComplaintsHandlingMechanismForOwnWorkforce",
        "Social",
        "Complaints-handling mechanism for own workforce",
        { efragParagraph: "61(c)" }
      ),
    ]),
  ]
);

export const C7_HUMAN_RIGHTS_INCIDENTS = section(
  "C7_HUMAN_RIGHTS_INCIDENTS",
  "C7",
  "Severe negative human rights incidents",
  "C",
  [
    subsection("incidents_own_workforce", "Incidents in own workforce (paragraph 62)", [
      field("incident_child_labour", "boolean", "ConfirmedIncidentChildLabourOwnWorkforce", "Social", "Confirmed child labour incident", {
        efragParagraph: "62(a)(i)",
      }),
      field("incident_forced_labour", "boolean", "ConfirmedIncidentForcedLabourOwnWorkforce", "Social", "Confirmed forced labour incident", {
        efragParagraph: "62(a)(ii)",
      }),
      field("incident_human_trafficking", "boolean", "ConfirmedIncidentHumanTraffickingOwnWorkforce", "Social", "Confirmed human trafficking incident", {
        efragParagraph: "62(a)(iii)",
      }),
      field("incident_discrimination", "boolean", "ConfirmedIncidentDiscriminationOwnWorkforce", "Social", "Confirmed discrimination incident", {
        efragParagraph: "62(a)(iv)",
      }),
      field("incident_other_human_rights", "boolean", "ConfirmedIncidentOtherHumanRightsOwnWorkforce", "Social", "Confirmed other human rights incident", {
        efragParagraph: "62(a)(v)",
      }),
      field(
        "incident_other_specification",
        "string",
        "SpecificationOfOtherHumanRightsRelatedToTheConfirmedIncident",
        "Social",
        "Specification of other confirmed incident",
        { efragParagraph: "62(a)(v)" }
      ),
      field(
        "actions_addressing_incidents",
        "string",
        "DescriptionOfActionsBeingTakenToAddressConfirmedIncidents",
        "Social",
        "Actions taken to address confirmed incidents",
        { efragParagraph: "62(b)" }
      ),
      field(
        "value_chain_incidents_awareness",
        "string",
        "AwarenessOfConfirmedIncidentsInvolvingWorkersInValueChainAffectedCommunitiesConsumersAndEndUsers",
        "Social",
        "Awareness of value chain / stakeholder incidents",
        { efragParagraph: "62(c)" }
      ),
    ]),
  ]
);

export const C8_REVENUES_BENCHMARKS = section(
  "C8_REVENUES_BENCHMARKS",
  "C8",
  "Revenues from certain sectors and EU benchmark exclusion",
  "C",
  [
    subsection("sector_revenues", "Sector revenues (paragraph 63)", [
      field(
        "revenue_controversial_weapons_eur",
        "number",
        "RevenueDerivedFromControversialWeaponsAntiPersonnelMinesClusterMunitionsChemicalWeaponsAndBiologicalWeapons",
        "Governance",
        "Revenue from controversial weapons",
        { efragParagraph: "63(a)", unit: "EUR" }
      ),
      field(
        "revenue_tobacco_eur",
        "number",
        "RevenueDerivedFromCultivationAndProductionOfTobacco",
        "Governance",
        "Revenue from tobacco",
        { efragParagraph: "63(b)", unit: "EUR" }
      ),
      field("revenue_coal_eur", "number", "RevenueDerivedFromCoal", "Governance", "Revenue from coal", {
        efragParagraph: "63(c)",
        unit: "EUR",
      }),
      field("revenue_oil_eur", "number", "RevenueDerivedFromOil", "Governance", "Revenue from oil", {
        efragParagraph: "63(c)",
        unit: "EUR",
      }),
      field("revenue_gas_eur", "number", "RevenueDerivedFromGas", "Governance", "Revenue from gas", {
        efragParagraph: "63(c)",
        unit: "EUR",
      }),
      field(
        "revenue_chemicals_pesticides_eur",
        "number",
        "RevenueDerivedFromChemicalProduction",
        "Governance",
        "Revenue from pesticides/agrochemical production",
        { efragParagraph: "63(d)", unit: "EUR" }
      ),
    ]),
    subsection("benchmark_exclusion", "EU benchmark exclusion (paragraph 64)", [
      field(
        "excluded_from_paris_aligned_benchmarks",
        "boolean",
        "ExcludedFromEUReferenceBenchmarksAlignedWithParisAgreement",
        "Governance",
        "Excluded from Paris-aligned EU reference benchmarks",
        { efragParagraph: "64" }
      ),
    ]),
  ]
);

export const C9_GENDER_DIVERSITY = section(
  "C9_GENDER_DIVERSITY",
  "C9",
  "Gender diversity ratio in the governance body",
  "C",
  [
    subsection("governance_diversity", "Governance body gender diversity (paragraph 65)", [
      field(
        "gender_diversity_governance_ratio",
        "number",
        "GenderDiversityRatioInGovernanceBody",
        "Governance",
        "Gender diversity ratio in governance body",
        { efragParagraph: "65", unit: "%" }
      ),
    ]),
  ]
);
