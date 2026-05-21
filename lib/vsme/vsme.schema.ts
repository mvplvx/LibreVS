import type {
  VsmeFieldDef,
  VsmeSchema,
  VsmeSectionDef,
  VsmeSubsectionDef,
} from "./vsme.types";

function field(
  name: string,
  type: VsmeFieldDef["type"],
  excelCell: string,
  label: string,
  unit?: string
): VsmeFieldDef {
  return { name, type, excelCell, label, unit };
}

function subsection(
  id: string,
  title: string,
  fields: VsmeFieldDef[]
): VsmeSubsectionDef {
  return { id, title, fields };
}

function section(
  id: string,
  code: string,
  title: string,
  block: "B" | "C",
  mandatory: boolean,
  subsections: VsmeSubsectionDef[]
): VsmeSectionDef {
  return { id, code, title, block, mandatory, subsections };
}

const B1_GENERAL_INFORMATION = section(
  "B1_GENERAL_INFORMATION",
  "B1",
  "General information",
  "B",
  true,
  [
    subsection("identification", "Identification", [
      field("legal_name", "string", "B1!C5", "Legal name"),
      field("trading_name", "string", "B1!C6", "Trading name"),
      field("registration_number", "string", "B1!C7", "Registration number"),
      field("legal_form", "string", "B1!C8", "Legal form"),
      field("country_of_registration", "string", "B1!C9", "Country of registration"),
      field("registered_address", "string", "B1!C10", "Registered address"),
      field("website", "string", "B1!C11", "Website"),
    ]),
    subsection("reporting", "Reporting parameters", [
      field("reporting_period_start", "string", "B1!C14", "Reporting period start"),
      field("reporting_period_end", "string", "B1!C15", "Reporting period end"),
      field("reporting_currency", "string", "B1!C16", "Reporting currency"),
      field("reporting_language", "string", "B1!C17", "Reporting language"),
      field("reporting_scope_description", "string", "B1!C18", "Reporting scope description"),
    ]),
    subsection("contact", "Contact", [
      field("primary_contact_name", "string", "B1!C21", "Primary contact name"),
      field("primary_contact_email", "string", "B1!C22", "Primary contact email"),
      field("primary_contact_phone", "string", "B1!C23", "Primary contact phone"),
    ]),
  ]
);

const B2_BOUNDARIES = section(
  "B2_BOUNDARIES",
  "B2",
  "Boundaries",
  "B",
  true,
  [
    subsection("consolidation", "Consolidation scope", [
      field("consolidation_approach", "string", "B2!C5", "Consolidation approach"),
      field("operational_control_definition", "string", "B2!C6", "Operational control definition"),
      field("financial_control_definition", "string", "B2!C7", "Financial control definition"),
      field("reporting_boundary_description", "string", "B2!C8", "Reporting boundary description"),
    ]),
    subsection("entities", "Entities in scope", [
      field("parent_entity_name", "string", "B2!C11", "Parent entity name"),
      field("subsidiaries_included_count", "number", "B2!C12", "Subsidiaries included", "count"),
      field("subsidiaries_excluded_count", "number", "B2!C13", "Subsidiaries excluded", "count"),
      field("joint_ventures_included_count", "number", "B2!C14", "Joint ventures included", "count"),
    ]),
    subsection("exclusions", "Exclusions", [
      field("excluded_entities_description", "string", "B2!C17", "Excluded entities description"),
      field("exclusion_rationale", "string", "B2!C18", "Exclusion rationale"),
    ]),
  ]
);

const B3_ENERGY = section(
  "B3_ENERGY",
  "B3",
  "Energy",
  "B",
  true,
  [
    subsection("electricity", "Electricity", [
      field("total", "number", "B3!C5", "Total electricity consumption", "MWh"),
      field("renewable", "number", "B3!C6", "Renewable electricity", "MWh"),
      field("non_renewable", "number", "B3!C7", "Non-renewable electricity", "MWh"),
      field("grid_purchased", "number", "B3!C8", "Grid purchased electricity", "MWh"),
      field("self_generated", "number", "B3!C9", "Self-generated electricity", "MWh"),
      field("solar", "number", "B3!C10", "Solar electricity", "MWh"),
      field("wind", "number", "B3!C11", "Wind electricity", "MWh"),
      field("hydro", "number", "B3!C12", "Hydro electricity", "MWh"),
    ]),
    subsection("heating_cooling", "Heating and cooling", [
      field("natural_gas", "number", "B3!C15", "Natural gas heating/cooling", "MWh"),
      field("district_heating", "number", "B3!C16", "District heating", "MWh"),
      field("district_cooling", "number", "B3!C17", "District cooling", "MWh"),
      field("heating_oil", "number", "B3!C18", "Heating oil", "MWh"),
      field("coal", "number", "B3!C19", "Coal heating", "MWh"),
      field("biomass", "number", "B3!C20", "Biomass heating", "MWh"),
    ]),
    subsection("fuels_mobile", "Mobile fuels", [
      field("petrol", "number", "B3!C23", "Petrol mobile fuels", "litres"),
      field("diesel", "number", "B3!C24", "Diesel mobile fuels", "litres"),
      field("lpg", "number", "B3!C25", "LPG mobile fuels", "litres"),
      field("cng", "number", "B3!C26", "CNG mobile fuels", "litres"),
      field("other_mobile_fuels", "number", "B3!C27", "Other mobile fuels", "litres"),
    ]),
    subsection("fuels_stationary", "Stationary fuels", [
      field("natural_gas", "number", "B3!C30", "Natural gas stationary", "MWh"),
      field("diesel", "number", "B3!C31", "Diesel stationary", "litres"),
      field("heating_oil", "number", "B3!C32", "Heating oil stationary", "litres"),
      field("coal", "number", "B3!C33", "Coal stationary", "tonnes"),
      field("biomass", "number", "B3!C34", "Biomass stationary", "MWh"),
    ]),
    subsection("energy_totals", "Energy totals and intensity", [
      field("total_energy_consumption", "number", "B3!C37", "Total energy consumption", "MWh"),
      field("renewable_share_percentage", "number", "B3!C38", "Renewable share", "%"),
      field("energy_intensity_per_revenue", "number", "B3!C39", "Energy intensity per revenue", "MWh/EUR"),
      field("energy_intensity_per_unit_production", "number", "B3!C40", "Energy intensity per production unit", "MWh/unit"),
    ]),
  ]
);

const B4_EMISSIONS = section(
  "B4_EMISSIONS",
  "B4",
  "Emissions",
  "B",
  true,
  [
    subsection("scope1", "Scope 1 GHG emissions", [
      field("total", "number", "B4!C5", "Scope 1 total", "tCO2e"),
      field("stationary_combustion", "number", "B4!C6", "Stationary combustion", "tCO2e"),
      field("mobile_combustion", "number", "B4!C7", "Mobile combustion", "tCO2e"),
      field("process_emissions", "number", "B4!C8", "Process emissions", "tCO2e"),
      field("fugitive_emissions", "number", "B4!C9", "Fugitive emissions", "tCO2e"),
    ]),
    subsection("scope2_location", "Scope 2 location-based", [
      field("total", "number", "B4!C12", "Scope 2 location-based total", "tCO2e"),
      field("electricity", "number", "B4!C13", "Scope 2 electricity location-based", "tCO2e"),
      field("heating_cooling", "number", "B4!C14", "Scope 2 heating/cooling location-based", "tCO2e"),
      field("steam", "number", "B4!C15", "Scope 2 steam location-based", "tCO2e"),
    ]),
    subsection("scope2_market", "Scope 2 market-based", [
      field("total", "number", "B4!C18", "Scope 2 market-based total", "tCO2e"),
      field("electricity", "number", "B4!C19", "Scope 2 electricity market-based", "tCO2e"),
      field("heating_cooling", "number", "B4!C20", "Scope 2 heating/cooling market-based", "tCO2e"),
      field("renewable_electricity_certificates", "number", "B4!C21", "Renewable electricity certificates", "MWh"),
    ]),
    subsection("scope3", "Scope 3 GHG emissions", [
      field("total", "number", "B4!C24", "Scope 3 total", "tCO2e"),
      field("category1_purchased_goods", "number", "B4!C25", "Cat.1 Purchased goods and services", "tCO2e"),
      field("category2_capital_goods", "number", "B4!C26", "Cat.2 Capital goods", "tCO2e"),
      field("category3_fuel_energy", "number", "B4!C27", "Cat.3 Fuel and energy related", "tCO2e"),
      field("category4_upstream_transport", "number", "B4!C28", "Cat.4 Upstream transport", "tCO2e"),
      field("category5_waste", "number", "B4!C29", "Cat.5 Waste generated", "tCO2e"),
      field("category6_business_travel", "number", "B4!C30", "Cat.6 Business travel", "tCO2e"),
      field("category7_employee_commuting", "number", "B4!C31", "Cat.7 Employee commuting", "tCO2e"),
      field("category9_downstream_transport", "number", "B4!C32", "Cat.9 Downstream transport", "tCO2e"),
      field("category11_use_of_products", "number", "B4!C33", "Cat.11 Use of sold products", "tCO2e"),
      field("category12_end_of_life", "number", "B4!C34", "Cat.12 End-of-life treatment", "tCO2e"),
      field("category15_investments", "number", "B4!C35", "Cat.15 Investments", "tCO2e"),
    ]),
    subsection("emissions_intensity", "Emissions intensity", [
      field("scope1_per_revenue", "number", "B4!C38", "Scope 1 per revenue", "tCO2e/EUR"),
      field("scope2_per_revenue", "number", "B4!C39", "Scope 2 per revenue", "tCO2e/EUR"),
      field("total_per_revenue", "number", "B4!C40", "Total per revenue", "tCO2e/EUR"),
      field("total_per_production_unit", "number", "B4!C41", "Total per production unit", "tCO2e/unit"),
    ]),
  ]
);

const B5_WATER = section(
  "B5_WATER",
  "B5",
  "Water",
  "B",
  true,
  [
    subsection("withdrawal", "Water withdrawal", [
      field("total", "number", "B5!C5", "Total water withdrawal", "m3"),
      field("surface_water", "number", "B5!C6", "Surface water withdrawal", "m3"),
      field("groundwater", "number", "B5!C7", "Groundwater withdrawal", "m3"),
      field("seawater", "number", "B5!C8", "Seawater withdrawal", "m3"),
      field("third_party", "number", "B5!C9", "Third-party water withdrawal", "m3"),
      field("water_stress_areas", "number", "B5!C10", "Withdrawal in water-stress areas", "m3"),
    ]),
    subsection("discharge", "Water discharge", [
      field("total", "number", "B5!C13", "Total water discharge", "m3"),
      field("surface_water", "number", "B5!C14", "Surface water discharge", "m3"),
      field("groundwater", "number", "B5!C15", "Groundwater discharge", "m3"),
      field("seawater", "number", "B5!C16", "Seawater discharge", "m3"),
      field("third_party", "number", "B5!C17", "Third-party water discharge", "m3"),
    ]),
    subsection("consumption", "Water consumption", [
      field("total", "number", "B5!C20", "Total water consumption", "m3"),
      field("recycled", "number", "B5!C21", "Recycled water", "m3"),
      field("reused", "number", "B5!C22", "Reused water", "m3"),
    ]),
  ]
);

const B6_WASTE = section(
  "B6_WASTE",
  "B6",
  "Waste",
  "B",
  true,
  [
    subsection("waste_generated", "Waste generated", [
      field("total", "number", "B6!C5", "Total waste generated", "tonnes"),
      field("hazardous", "number", "B6!C6", "Hazardous waste", "tonnes"),
      field("non_hazardous", "number", "B6!C7", "Non-hazardous waste", "tonnes"),
    ]),
    subsection("waste_treatment", "Waste treatment", [
      field("diverted_recycling", "number", "B6!C10", "Diverted to recycling", "tonnes"),
      field("diverted_composting", "number", "B6!C11", "Diverted to composting", "tonnes"),
      field("incineration_with_energy_recovery", "number", "B6!C12", "Incineration with energy recovery", "tonnes"),
      field("incineration_without_energy_recovery", "number", "B6!C13", "Incineration without energy recovery", "tonnes"),
      field("landfill", "number", "B6!C14", "Landfill", "tonnes"),
      field("other_disposal", "number", "B6!C15", "Other disposal", "tonnes"),
    ]),
  ]
);

const B7_WORKFORCE = section(
  "B7_WORKFORCE",
  "B7",
  "Workforce",
  "B",
  true,
  [
    subsection("headcount", "Headcount", [
      field("total", "number", "B7!C5", "Total headcount", "count"),
      field("fte", "number", "B7!C6", "Full-time equivalents", "FTE"),
      field("permanent", "number", "B7!C7", "Permanent employees", "count"),
      field("temporary", "number", "B7!C8", "Temporary employees", "count"),
      field("full_time", "number", "B7!C9", "Full-time employees", "count"),
      field("part_time", "number", "B7!C10", "Part-time employees", "count"),
    ]),
    subsection("diversity", "Diversity", [
      field("women_percentage", "number", "B7!C13", "Women percentage", "%"),
      field("management_women_percentage", "number", "B7!C14", "Women in management", "%"),
      field("age_under30", "number", "B7!C15", "Employees under 30", "count"),
      field("age_30_to_50", "number", "B7!C16", "Employees 30–50", "count"),
      field("age_over50", "number", "B7!C17", "Employees over 50", "count"),
    ]),
    subsection("turnover", "Turnover", [
      field("voluntary", "number", "B7!C20", "Voluntary turnover", "count"),
      field("involuntary", "number", "B7!C21", "Involuntary turnover", "count"),
      field("rate", "number", "B7!C22", "Turnover rate", "%"),
    ]),
  ]
);

const B8_HEALTH_SAFETY = section(
  "B8_HEALTH_SAFETY",
  "B8",
  "Health and safety",
  "B",
  true,
  [
    subsection("incidents", "Incidents", [
      field("fatalities_employees", "number", "B8!C5", "Employee fatalities", "count"),
      field("fatalities_contractors", "number", "B8!C6", "Contractor fatalities", "count"),
      field("recordable_injuries", "number", "B8!C7", "Recordable injuries", "count"),
      field("lost_time_injuries", "number", "B8!C8", "Lost-time injuries", "count"),
      field("lost_time_injury_rate", "number", "B8!C9", "Lost-time injury rate", "rate"),
      field("near_misses", "number", "B8!C10", "Near misses", "count"),
    ]),
  ]
);

const B9_TRAINING = section(
  "B9_TRAINING",
  "B9",
  "Training",
  "B",
  true,
  [
    subsection("training", "Training", [
      field("average_hours_per_employee", "number", "B9!C5", "Average training hours per employee", "hours"),
      field("hours_men", "number", "B9!C6", "Training hours men", "hours"),
      field("hours_women", "number", "B9!C7", "Training hours women", "hours"),
      field("employees_trained_percentage", "number", "B9!C8", "Employees trained", "%"),
      field("skills_programs_count", "number", "B9!C9", "Skills development programs", "count"),
    ]),
  ]
);

const B10_SUPPLY_CHAIN = section(
  "B10_SUPPLY_CHAIN",
  "B10",
  "Supply chain",
  "B",
  true,
  [
    subsection("suppliers", "Suppliers", [
      field("total", "number", "B10!C5", "Total suppliers", "count"),
      field("assessed_esg", "number", "B10!C6", "Suppliers assessed for ESG", "count"),
      field("audited", "number", "B10!C7", "Suppliers audited", "count"),
      field("local_percentage", "number", "B10!C8", "Local suppliers", "%"),
      field("critical_suppliers_count", "number", "B10!C9", "Critical suppliers", "count"),
    ]),
  ]
);

const B11_BUSINESS_IMPACTS = section(
  "B11_BUSINESS_IMPACTS",
  "B11",
  "Business impacts",
  "B",
  true,
  [
    subsection("impacts", "Impacts", [
      field("environmental_incidents_count", "number", "B11!C5", "Environmental incidents", "count"),
      field("environmental_fines_amount", "number", "B11!C6", "Environmental fines", "EUR"),
      field("regulatory_non_compliance_count", "number", "B11!C7", "Regulatory non-compliance cases", "count"),
      field("community_complaints_count", "number", "B11!C8", "Community complaints", "count"),
      field("significant_market_impacts_description", "string", "B11!C9", "Significant market impacts description"),
    ]),
  ]
);

const C1_POLICIES = section(
  "C1_POLICIES",
  "C1",
  "Policies",
  "C",
  false,
  [
    subsection("policies", "Policies", [
      field("environmental_policy", "boolean", "C1!C5", "Environmental policy in place"),
      field("social_policy", "boolean", "C1!C6", "Social policy in place"),
      field("governance_policy", "boolean", "C1!C7", "Governance policy in place"),
      field("policy_review_date", "string", "C1!C8", "Last policy review date"),
      field("policy_publicly_available", "boolean", "C1!C9", "Policies publicly available"),
    ]),
  ]
);

const C2_TARGETS = section(
  "C2_TARGETS",
  "C2",
  "Targets",
  "C",
  false,
  [
    subsection("targets", "Targets", [
      field("emissions_reduction_target", "number", "C2!C5", "Emissions reduction target", "%"),
      field("renewable_energy_target", "number", "C2!C6", "Renewable energy target", "%"),
      field("water_reduction_target", "number", "C2!C7", "Water reduction target", "%"),
      field("waste_reduction_target", "number", "C2!C8", "Waste reduction target", "%"),
      field("target_base_year", "number", "C2!C9", "Target base year", "year"),
      field("target_horizon_year", "number", "C2!C10", "Target horizon year", "year"),
    ]),
  ]
);

const C3_TRANSITION_PLAN = section(
  "C3_TRANSITION_PLAN",
  "C3",
  "Transition plan",
  "C",
  false,
  [
    subsection("transition", "Transition plan", [
      field("transition_plan_exists", "boolean", "C3!C5", "Transition plan exists"),
      field("transition_plan_published", "boolean", "C3!C6", "Transition plan published"),
      field("capex_aligned_transition", "number", "C3!C7", "CapEx aligned to transition", "EUR"),
      field("opex_aligned_transition", "number", "C3!C8", "OpEx aligned to transition", "EUR"),
      field("transition_plan_description", "string", "C3!C9", "Transition plan description"),
    ]),
  ]
);

const C4_RISK = section(
  "C4_RISK",
  "C4",
  "Risk",
  "C",
  false,
  [
    subsection("climate_risk", "Climate risk", [
      field("climate_risk_assessed", "boolean", "C4!C5", "Climate risk assessed"),
      field("physical_risk_description", "string", "C4!C6", "Physical risk description"),
      field("transition_risk_description", "string", "C4!C7", "Transition risk description"),
      field("risk_integration_in_strategy", "boolean", "C4!C8", "Risk integrated in strategy"),
    ]),
  ]
);

const C5_SUPPLIER_SCREENING = section(
  "C5_SUPPLIER_SCREENING",
  "C5",
  "Supplier screening",
  "C",
  false,
  [
    subsection("screening", "Supplier screening", [
      field("screening_policy", "boolean", "C5!C5", "Supplier screening policy"),
      field("screened_suppliers_percentage", "number", "C5!C6", "Screened suppliers", "%"),
      field("high_risk_suppliers_count", "number", "C5!C7", "High-risk suppliers", "count"),
    ]),
  ]
);

const C6_HUMAN_RIGHTS = section(
  "C6_HUMAN_RIGHTS",
  "C6",
  "Human rights",
  "C",
  false,
  [
    subsection("human_rights", "Human rights", [
      field("human_rights_policy", "boolean", "C6!C5", "Human rights policy"),
      field("due_diligence_process", "boolean", "C6!C6", "Due diligence process"),
      field("grievance_mechanism", "boolean", "C6!C7", "Grievance mechanism"),
      field("incidents_count", "number", "C6!C8", "Human rights incidents", "count"),
    ]),
  ]
);

const C7_GOVERNANCE = section(
  "C7_GOVERNANCE",
  "C7",
  "Governance",
  "C",
  false,
  [
    subsection("governance", "Governance", [
      field("board_esg_oversight", "boolean", "C7!C5", "Board ESG oversight"),
      field("independent_directors_count", "number", "C7!C6", "Independent directors", "count"),
      field("esg_linked_compensation", "boolean", "C7!C7", "ESG-linked compensation"),
      field("whistleblower_policy", "boolean", "C7!C8", "Whistleblower policy"),
    ]),
  ]
);

const C8_COMPLIANCE = section(
  "C8_COMPLIANCE",
  "C8",
  "Compliance",
  "C",
  false,
  [
    subsection("compliance", "Compliance", [
      field("compliance_framework", "string", "C8!C5", "Compliance framework"),
      field("audits_conducted", "number", "C8!C6", "Audits conducted", "count"),
      field("non_compliance_incidents", "number", "C8!C7", "Non-compliance incidents", "count"),
      field("remediation_actions", "string", "C8!C8", "Remediation actions"),
    ]),
  ]
);

const C9_DIGITAL_READINESS = section(
  "C9_DIGITAL_READINESS",
  "C9",
  "Digital readiness",
  "C",
  false,
  [
    subsection("digital", "Digital readiness", [
      field("digital_sustainability_tools", "boolean", "C9!C5", "Digital sustainability tools in use"),
      field("data_collection_automation_level", "string", "C9!C6", "Data collection automation level"),
      field("esg_data_system_description", "string", "C9!C7", "ESG data system description"),
      field("api_integration_available", "boolean", "C9!C8", "API integration available"),
    ]),
  ]
);

export const VSME_SCHEMA: VsmeSchema = {
  version: "1.0.0",
  standard: "VSME",
  alignment: "EFRAG",
  sections: [
    B1_GENERAL_INFORMATION,
    B2_BOUNDARIES,
    B3_ENERGY,
    B4_EMISSIONS,
    B5_WATER,
    B6_WASTE,
    B7_WORKFORCE,
    B8_HEALTH_SAFETY,
    B9_TRAINING,
    B10_SUPPLY_CHAIN,
    B11_BUSINESS_IMPACTS,
    C1_POLICIES,
    C2_TARGETS,
    C3_TRANSITION_PLAN,
    C4_RISK,
    C5_SUPPLIER_SCREENING,
    C6_HUMAN_RIGHTS,
    C7_GOVERNANCE,
    C8_COMPLIANCE,
    C9_DIGITAL_READINESS,
  ],
};
