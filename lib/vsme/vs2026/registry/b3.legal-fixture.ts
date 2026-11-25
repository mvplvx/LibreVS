/**
 * Independent B3 expectations from Annex I paragraphs 32, 33 and 49 to 52.
 * The registry module must not import this file.
 */

export const B3_REQUIRED_STATEMENTS = [
  "total energy consumption in MWh",
  "If it can obtain the necessary information",
  "Electricity (as reflected in utility billings)",
  "Renewable energy",
  "Non-renewable energy",
  "Fuels",
  "Scope 1 GHG emissions in tCO2eq",
  "location-based Scope 2 emissions in tCO2eq",
  "GHG Protocol Corporate Accounting and Reporting Standard (2004)",
  "present it together with the information specified under B3",
] as const;

export const B3_ANNEX_II_REFERENCES = [
  "Para 32, first sentence",
  "Para 33",
] as const;

export const B3_REMOVED_LEGACY_IDS = [
  "B3_GHG_INTENSITY_GHG_INTENSITY_LOCATION_BASED",
  "B3_GHG_INTENSITY_GHG_INTENSITY_MARKET_BASED",
  "B3_TOTALS_FEEDSTOCK_FUEL_NON_ENERGY_MWH",
] as const;

export const B3_COMPLETION_IDS = [
  "B3_TOTAL_ENERGY_CONSUMPTION_MWH",
  "B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY",
  "B3_ENERGY_CONSUMPTION_FROM_FUELS",
  "B3_GROSS_SCOPE1_TCO2E",
  "B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E",
] as const;

export const B3_OUTSIDE_COMPLETION_IDS = [
  "B3_ENERGY_BREAKDOWN_INFORMATION",
  "B3_SELF_GENERATED_ELECTRICITY_MWH",
  "B3_GROSS_SCOPE2_MARKET_BASED_TCO2E",
  "B3_SCOPE1_SCOPE2_LOCATION_TOTAL",
  "B3_GROSS_SCOPE3_TCO2E",
  "B3_SCOPE3_SIGNIFICANT_CATEGORIES",
] as const;
