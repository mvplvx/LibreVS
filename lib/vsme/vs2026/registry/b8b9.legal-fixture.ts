/**
 * Independent expected facts for B8 and B9.
 * The registry modules do not import this file.
 */

export const B8_REQUIRED_STATEMENTS = [
  "The undertaking shall disclose the number of employees in headcount or full-time equivalent for the following metrics:",
  "type of employment contract (temporary or permanent)",
  "country of the employment contract, if the undertaking operates in more than one country.",
  "An unanswered assessment is UNASSESSED.",
  "B1 site records do not select this condition.",
  "Headcount and full-time equivalents are not added.",
  "A missing count is not zero.",
  "Do not require this count to equal B1_EMPLOYEES",
  "An employee is an individual who is in an employment relationship with the undertaking according to national law or practice.",
] as const;

export const B9_REQUIRED_STATEMENTS = [
  "the number and rate of recordable work-related accidents",
  "subject to legal restrictions, the sum of the fatalities as a result of recordable work-related accidents and recordable work-related ill health.",
  "A missing accident count is not a finding that no accidents occurred.",
  "Zero hours worked is not a valid accident rate.",
  "Missing hours worked are not zero.",
  "200 000 hours worked",
  "1 000 000 hours worked",
  "Neither basis is mandatory.",
  "The two fatality components are not added without a double-counting check.",
  "This restriction is not paragraph 22.",
  "more than three days of absence from work",
  "Aggregate counts only.",
] as const;

export const B8_COMPLETION_IDS = [
  "B8_EMPLOYEES_PERMANENT",
  "B8_EMPLOYEES_TEMPORARY",
  "B8_EMPLOYEES_MALE",
  "B8_EMPLOYEES_FEMALE",
  "B8_EMPLOYEES_OTHER_GENDER",
  "B8_EMPLOYEES_GENDER_NOT_REPORTED",
  "B8_EMPLOYEES_BY_COUNTRY",
] as const;

export const B8_OUTSIDE_COMPLETION_IDS = [
  "B8_MEASUREMENT_BASIS",
  "B8_MULTI_COUNTRY_OPERATIONS",
  "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
] as const;

export const B9_COMPLETION_IDS = [
  "B9_RECORDABLE_ACCIDENTS",
  "B9_RECORDABLE_ACCIDENT_RATE",
  "B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM",
] as const;

export const B9_OUTSIDE_COMPLETION_IDS = [
  "B9_HOURS_WORKED",
  "B9_HOURS_WORKED_ORIGIN",
  "B9_ACCIDENT_RATE_BASIS",
  "B9_FATALITY_LEGAL_RESTRICTION",
  "B9_FATALITIES_FROM_ACCIDENTS",
  "B9_FATALITIES_FROM_ILL_HEALTH",
] as const;

export const B8_B9_ANNEX_II_REFERENCES = [
  "Para 40, point (a)",
  "Para 40, point (b)",
  "Para 41, point (a)",
] as const;

export const B8_B9_IDS_ADDED_BEYOND_MATRIX = [
  "B8_MEASUREMENT_BASIS",
  "B8_MULTI_COUNTRY_OPERATIONS",
  "B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE",
  "B9_HOURS_WORKED",
  "B9_HOURS_WORKED_ORIGIN",
  "B9_ACCIDENT_RATE_BASIS",
  "B9_FATALITY_LEGAL_RESTRICTION",
  "B9_FATALITIES_FROM_ACCIDENTS",
  "B9_FATALITIES_FROM_ILL_HEALTH",
] as const;
