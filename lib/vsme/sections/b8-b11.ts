import { field, section, subsection } from "../schemaHelpers";

const COUNTRY_EMPLOYMENT_SLOTS = 5;

function countryEmploymentSlot(slot: number) {
  const n = String(slot);
  return [
    field(`employees_country_${n}_code`, "string", `CountryOfEmploymentContract${n}`, "Social", `Country ${n} of employment contract`, {
      efragParagraph: "39(c)",
    }),
    field(`employees_country_${n}_count`, "number", `NumberOfEmployeesCountry${n}`, "Social", `Employees in country ${n}`, {
      efragParagraph: "39(c)",
      unit: "count",
    }),
  ];
}

export const B8_WORKFORCE_GENERAL = section(
  "B8_WORKFORCE_GENERAL",
  "B8",
  "Workforce – General characteristics",
  "B",
  [
    subsection("employment_contract", "Employment contract type (paragraph 39(a))", [
      field("employees_permanent", "number", "NumberOfPermanentContactEmployees", "Social", "Permanent employees", {
        efragParagraph: "39(a)",
        unit: "count",
      }),
      field("employees_temporary", "number", "NumberOfTemporaryContractEmployees", "Social", "Temporary contract employees", {
        efragParagraph: "39(a)",
        unit: "count",
      }),
    ]),
    subsection("gender", "Employees by gender (paragraph 39(b))", [
      field("employees_male", "number", "NumberOfMaleEmployees", "Social", "Male employees", {
        efragParagraph: "39(b)",
        unit: "count",
      }),
      field("employees_female", "number", "NumberOfFemaleEmployees", "Social", "Female employees", {
        efragParagraph: "39(b)",
        unit: "count",
      }),
      field("employees_other_gender", "number", "NumberOfOtherGenderEmployees", "Social", "Other gender employees", {
        efragParagraph: "39(b)",
        unit: "count",
      }),
      field(
        "employees_gender_not_reported",
        "number",
        "NumberOfNonReportedGenderEmployees",
        "Social",
        "Gender not reported employees",
        { efragParagraph: "39(b)", unit: "count" }
      ),
    ]),
    subsection(
      "country_employment",
      "Employees by country (paragraph 39(c))",
      Array.from({ length: COUNTRY_EMPLOYMENT_SLOTS }, (_, i) => countryEmploymentSlot(i + 1)).flat()
    ),
    subsection("turnover", "Employee turnover (paragraph 40)", [
      field("employee_turnover_rate", "number", "EmployeeTurnoverRate", "Social", "Employee turnover rate", {
        efragParagraph: "40",
        unit: "%",
      }),
    ]),
  ]
);

export const B9_HEALTH_SAFETY = section(
  "B9_HEALTH_SAFETY",
  "B9",
  "Workforce – Health and safety",
  "B",
  [
    subsection("health_safety", "Health and safety (paragraph 41)", [
      field(
        "recordable_work_related_accidents",
        "number",
        "NumberOfRecordableWorkRelatedAccidents",
        "Social",
        "Recordable work-related accidents",
        { efragParagraph: "41(a)", unit: "count" }
      ),
      field(
        "recordable_accident_rate",
        "number",
        "RateOfRecordableWorkRelatedAccidents",
        "Social",
        "Rate of recordable work-related accidents",
        { efragParagraph: "41(a)", unit: "rate" }
      ),
      field(
        "fatalities_work_related_injuries",
        "number",
        "NumberOfFatalitiesAsAResultOfWorkRelatedInjuries",
        "Social",
        "Fatalities from work-related injuries",
        { efragParagraph: "41(b)", unit: "count" }
      ),
      field(
        "fatalities_work_related_ill_health",
        "number",
        "NumberOfFatalitiesAsAResultOfWorkRelatedIllHealth",
        "Social",
        "Fatalities from work-related ill health",
        { efragParagraph: "41(b)", unit: "count" }
      ),
    ]),
  ]
);

export const B10_REMUNERATION_TRAINING = section(
  "B10_REMUNERATION_TRAINING",
  "B10",
  "Workforce – Remuneration, collective bargaining and training",
  "B",
  [
    subsection("remuneration", "Remuneration and collective bargaining (paragraph 42(a)-(c))", [
      field(
        "pay_at_or_above_minimum_wage",
        "boolean",
        "EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement",
        "Social",
        "Pay equal or above applicable minimum wage",
        { efragParagraph: "42(a)" }
      ),
      field(
        "pay_gap_female_male_percent",
        "number",
        "PercentageGapInPayBetweenFemaleAndMaleEmployees",
        "Social",
        "Pay gap between female and male employees",
        { efragParagraph: "42(b)", unit: "%" }
      ),
      field(
        "collective_bargaining_coverage_percent",
        "number",
        "PercentageOfEmployeesCoveredByCollectiveBargainingAgreements",
        "Social",
        "Employees covered by collective bargaining",
        { efragParagraph: "42(c)", unit: "%" }
      ),
    ]),
    subsection("training_by_gender", "Training hours by gender (paragraph 42(d))", [
      field(
        "training_hours_female",
        "number",
        "AverageNumberOfAnnualTrainingHoursPerFemaleEmployee",
        "Social",
        "Average annual training hours – female employees",
        { efragParagraph: "42(d)", unit: "hours" }
      ),
      field(
        "training_hours_male",
        "number",
        "AverageNumberOfAnnualTrainingHoursPerMaleEmployee",
        "Social",
        "Average annual training hours – male employees",
        { efragParagraph: "42(d)", unit: "hours" }
      ),
      field(
        "training_hours_other_gender",
        "number",
        "AverageNumberOfAnnualTrainingHoursPerOtherGenderEmployee",
        "Social",
        "Average annual training hours – other gender",
        { efragParagraph: "42(d)", unit: "hours" }
      ),
      field(
        "training_hours_gender_not_reported",
        "number",
        "AverageNumberOfAnnualTrainingHoursPerNonReportedGenderEmployee",
        "Social",
        "Average annual training hours – gender not reported",
        { efragParagraph: "42(d)", unit: "hours" }
      ),
    ]),
  ]
);

export const B11_CONVICTIONS = section(
  "B11_CONVICTIONS",
  "B11",
  "Convictions and fines for corruption and bribery",
  "B",
  [
    subsection("convictions", "Convictions and fines (paragraph 43)", [
      field(
        "convictions_corruption_bribery_count",
        "number",
        "NumberOfConvictionsForViolationOfAntiCorruptionAndAntiBriberyLaws",
        "Governance",
        "Convictions for anti-corruption/anti-bribery violations",
        { efragParagraph: "43", unit: "count" }
      ),
      field(
        "fines_corruption_bribery_eur",
        "number",
        "TotalAmountOfFinesForViolationOfAntiCorruptionAndAntiBriberyLaws",
        "Governance",
        "Total fines for anti-corruption/anti-bribery violations",
        { efragParagraph: "43", unit: "EUR" }
      ),
    ]),
  ]
);
