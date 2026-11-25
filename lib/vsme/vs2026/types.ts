/**
 * VS 2026 regulatory identity for Commission Delegated Regulation (EU) 2026/1560.
 * Directive (EU) 2026/470 supplies the protected-undertaking context for a later
 * phase. Neither instrument is selected at runtime by these constants.
 */
export const VS2026_LEGAL_INSTRUMENTS = {
  voluntaryStandard: {
    name: "Commission Delegated Regulation (EU) 2026/1560",
    celex: "32026R1560",
    eli: "http://data.europa.eu/eli/reg_del/2026/1560/oj",
  },
  valueChainCapDirective: {
    name: "Directive (EU) 2026/470",
    eli: "http://data.europa.eu/eli/dir/2026/470/oj",
  },
} as const;

/**
 * Annex I paragraph 8. These are different kinds of datapoint.
 * Voluntary treatment for undertakings with 10 employees or fewer is not a
 * value of this union. That relief is EmployeeSizeRule.
 */
export type RequirementType =
  | "ESSENTIAL"
  | "IF_APPLICABLE"
  | "VOLUNTARY"
  | "SECTOR_CONSIDERATION";

/**
 * Whether an if-applicable condition has been assessed.
 * NOT_APPLICABLE is an assessed outcome. UNASSESSED is not an omission and
 * is not a missing essential value. Paragraph 22 sensitive omissions are a
 * later workflow: user-entered facts, the conditions in paragraph 22 and
 * B1 paragraph 27(b), and the validation result must stay separate so an
 * incomplete omission can be reported.
 */
export type ApplicabilityState =
  | "APPLICABLE"
  | "NOT_APPLICABLE"
  | "UNASSESSED";

/**
 * Annex I square-bracket relief and the Annex II column split.
 * This is not a micro-undertaking label, not the former 500-employee gate,
 * and not the protected-undertaking threshold in Directive (EU) 2026/470.
 */
export type EmployeeCategory = "EMPLOYEES_LE_10" | "EMPLOYEES_GT_10";

/**
 * Independent of RequirementType. A datapoint may be essential and still
 * be voluntary when EmployeeCategory is EMPLOYEES_LE_10.
 */
export type EmployeeSizeRule = {
  readonly voluntaryForEmployeesLe10: boolean;
};
