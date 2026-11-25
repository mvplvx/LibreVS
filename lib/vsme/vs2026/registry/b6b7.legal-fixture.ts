/**
 * Independent legal checkpoints for B6 and B7.
 * The registry implementation does not import this file.
 */

export const B6_REQUIRED_STATEMENTS = Object.freeze([
  "total water withdrawal, i.e. the amount of water drawn into the boundaries",
  "production processes in place which significantly consume water",
  "difference between its water withdrawal and water discharge from its production processes",
  "water consumed at sites located in areas with water stress",
  "A missing quantity is not zero.",
  "An absent assessment is UNASSESSED.",
]);

export const B7_REQUIRED_STATEMENTS = Object.freeze([
  "whether it applies circular economy principles",
  "how it applies these principles",
  "An unanswered value is not NO.",
  "total weight of waste generated, with a breakdown between hazardous and non-hazardous waste",
  "proportion of waste diverted to recycling or preparation for reuse",
  "The two percentages are not added.",
  "A zero denominator is not a valid percentage.",
  "A missing denominator is not zero percent.",
  "annual mass-flow of relevant materials used",
]);

export const B6_COMPLETION_IDS = Object.freeze([
  "B6_TOTAL_WATER_WITHDRAWAL_M3",
  "B6_WATER_CONSUMPTION_PRODUCTION_M3",
  "B6_WATER_CONSUMED_WATER_STRESS_M3",
]);

export const B6_OUTSIDE_COMPLETION_IDS = Object.freeze([
  "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
  "B6_PRODUCTION_PROCESS_WITHDRAWAL_M3",
  "B6_WATER_DISCHARGE_PRODUCTION_M3",
  "B6_WATER_STRESS_SITE_REFERENCE",
  "B6_WATER_STRESS_ASSESSMENT",
  "B6_WATER_STRESS_SITE_CONSUMPTION",
]);

export const B7_COMPLETION_IDS = Object.freeze([
  "B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES",
  "B7_CIRCULAR_ECONOMY_DESCRIPTION",
  "B7_WASTE_GENERATED_TOTAL_WEIGHT",
  "B7_WASTE_HAZARDOUS_MASS",
  "B7_WASTE_NON_HAZARDOUS_MASS",
  "B7_WASTE_DIVERTED_PROPORTION",
  "B7_MATERIAL_NAME",
  "B7_MATERIAL_WEIGHT",
]);

export const B7_OUTSIDE_COMPLETION_IDS = Object.freeze([
  "B7_WASTE_RECYCLING_PERCENT_MASS",
  "B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS",
  "B7_SIGNIFICANT_MATERIAL_FLOWS",
  "B7_MATERIAL_VOLUME",
]);

export const B6_B7_ANNEX_II_REFERENCES = Object.freeze([
  "Para 36",
  "Para 38, first sentence",
  "Para 39, point (a)",
  "Para 39, point (b)",
]);

export const B6_B7_IDS_ADDED_BEYOND_MATRIX = Object.freeze([
  "B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES",
  "B6_PRODUCTION_PROCESS_WITHDRAWAL_M3",
  "B6_WATER_STRESS_SITE_REFERENCE",
  "B6_WATER_STRESS_ASSESSMENT",
  "B6_WATER_STRESS_SITE_CONSUMPTION",
  "B7_WASTE_GENERATED_TOTAL_WEIGHT",
  "B7_WASTE_DIVERTED_PROPORTION",
  "B7_SIGNIFICANT_MATERIAL_FLOWS",
  "B7_MATERIAL_NAME",
  "B7_MATERIAL_WEIGHT",
  "B7_MATERIAL_VOLUME",
]);
