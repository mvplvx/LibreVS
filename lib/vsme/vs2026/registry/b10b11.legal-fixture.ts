/**
 * Independent expected facts for B10 and B11.
 * The registry modules do not import this file.
 */

export const B10_REQUIRED_STATEMENTS = [
  "whether the employees receive pay that is equal or above applicable minimum wage for the country it reports on, determined directly by the national minimum wage law or through a collective bargaining agreement",
  "Absence of a statutory minimum wage is not a NO.",
  "The registered country is not every employee's applicable minimum remuneration.",
  "Applicable statutory minimum wage.",
  "Applicable collectively agreed minimum remuneration.",
  "if the undertaking is already required by EU law or other national regulations to report the percentage gap in pay between its female and male employees, it shall disclose it",
  "UNASSESSED is not NO_IDENTIFIED_REPORTING_REQUIREMENT.",
  "Company workforce size does not select this condition.",
  "the percentage of employees covered by collective bargaining agreements",
  "Trade union membership is not collective bargaining coverage.",
  "An employee covered by more than one agreement is counted once.",
  "A reporting band does not replace the percentage.",
  "the average number of annual training hours per employee",
  "Missing training hours are not zero.",
  "An FTE figure is not reused as this denominator.",
] as const;

export const B11_REQUIRED_STATEMENTS = [
  "In case of convictions and fines in the reporting period, the undertaking shall disclose the number of convictions, and the total amount of fines incurred for the violation of anti-corruption and anti-bribery laws.",
  "An unanswered assessment does not generate zero convictions or zero fines.",
  "A pending proceeding is not a conviction.",
  "the total amount of fines incurred for the violation of anti-corruption and anti-bribery laws",
  "No automatic currency conversion is applied.",
  "Aggregate counts only.",
] as const;

export const B10_COMPLETION_IDS = [
  "B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE",
  "B10_GENDER_PAY_GAP_PERCENT",
  "B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT",
  "B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE",
] as const;

export const B10_OUTSIDE_COMPLETION_IDS = [
  "B10_MINIMUM_WAGE_DETERMINATION",
  "B10_GENDER_PAY_GAP_LEGAL_OBLIGATION",
  "B10_AVERAGE_FEMALE_REMUNERATION",
  "B10_AVERAGE_MALE_REMUNERATION",
  "B10_EMPLOYEES_COVERED_BY_COLLECTIVE_BARGAINING",
  "B10_COLLECTIVE_BARGAINING_DENOMINATOR",
  "B10_TOTAL_TRAINING_HOURS",
  "B10_TRAINING_HEADCOUNT",
] as const;

export const B11_COMPLETION_IDS = [
  "B11_CONVICTIONS_COUNT",
  "B11_FINES_AMOUNT",
] as const;

export const B11_OUTSIDE_COMPLETION_IDS = [
  "B11_CONVICTIONS_AND_FINES_ASSESSMENT",
] as const;

export const B10_B11_ANNEX_II_REFERENCES = [
  "Para 42, point (a)",
  "Para 42, point (c)",
  "Para 42, point (d)",
] as const;

export const B10_B11_IDS_ADDED_BEYOND_MATRIX = [
  ...B10_OUTSIDE_COMPLETION_IDS,
  ...B11_OUTSIDE_COMPLETION_IDS,
] as const;
