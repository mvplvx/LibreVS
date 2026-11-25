# VS-01 evaluation implementation

Date: 25 November 2026. Isolated module only. The running application was not connected to this function.

Entry point: `evaluateVS2026ReportingState` in `lib/vsme/vs2026/evaluation.ts`.

## 1. Evaluation input contract

`EvaluationInput` carries only caller-supplied state:

- `configuration`: `NOT_CONFIGURED`, or a configured option passed through `resolveModuleSelection`.
- `employeeSize`: `NOT_PROVIDED`, or a measure passed through `classifyEmployeeSize` with kind `VS2026_EMPLOYEE_PROPORTIONALITY`.
- `facts`: scalar presence. `MISSING`, `EMPTY`, `INVALID`, or `PRESENT` with a text, number, boolean, enumeration, reference list, or site-row id.
- `repeatingRows`: open rows. Each row has its own id, group id, and cells. There is no fixed maximum.
- `omissions`: paragraph 22 claims. Each claim names a datapoint, an optional row, a reason, whether it was reassessed for the period, and whether the legal conditions were assessed.
- `applicabilityAssessments`: used only for conditions that have no preparation enumeration. A preparation enumeration stays authoritative.

The function does not read Prisma, `Company.employeeCount`, or `VsmeFieldMateriality`.

## 2. Evaluation output contract

`ReportEvaluation` returns the option, size category, readiness flags, unevaluated Comprehensive disclosures, and one `DatapointEvaluation` per scalar and per repeating cell.

Each datapoint result keeps these dimensions separate:

- `scope` and `inReportingScope`
- `requirementType`
- `applicability`
- `legalApplicability`
- `employeeSizeTreatment`
- `omissionStatus`
- `valueStatus` and `recordedValue`
- `completionStatus`
- `exportInclusion`, `blocksExport`, and `outputRole`
- `informationClass`, `annexII`, and `reasons`

`completionAssessment` and `complianceClaim` are both `NOT_EVALUATED` on every result.

## 3. Evaluation order

1. Configuration. A missing or rejected configuration is not Option A.
2. Disclosure scope, from `resolveModuleSelection`.
3. Information class. Preparation, supplementary, digital, calculated, and guidance facts are not completion targets.
4. Applicability, from the registry condition and the preparation enumeration.
5. Employee-size relief, from the registry flag and the classified category.
6. Paragraph 22 omission. It does not change applicability.
7. Value presence. Zero and false are present. Empty and missing are not.
8. Completion, then output inclusion.

Annex II membership is attached with `annexIIFor` and does not change completion.

## 4. Requirement-type treatment

The registry value is returned unchanged: `ESSENTIAL`, `IF_APPLICABLE`, `VOLUNTARY`, or `SECTOR_CONSIDERATION`. Employee-size relief is `employeeSizeTreatment`, not another requirement type. An essential fact can be `VOLUNTARY` for `EMPLOYEES_LE_10` and still report `requirementType: "ESSENTIAL"`.

## 5. Applicability treatment

Registry member ids decide `CONDITION_MET`, `CONDITION_NOT_MET`, or `CONDITION_UNASSESSED`. An unknown member stays unassessed. `DETERMINATION_UNRESOLVED` stays unassessed.

For an if-applicable fact that is unassessed, `legalApplicability` is `ASSUMED_NOT_APPLICABLE_PARAGRAPH_15`. Completion stays `BLOCKED_UNASSESSED` with reason `INTERNAL_DATA_QUALITY_REQUIREMENT`. That block is an internal control. It is not recorded as an extra sentence of paragraph 15. An essential conditional fact does not receive the paragraph 15 assumption.

`B2_HAS_PRACTICES`, `B2_HAS_POLICIES`, and `B2_HAS_FUTURE_INITIATIVES` are the B2 existence disclosure. Their own applicability is `ALWAYS`, with reason `SELF_DESCRIBING_CONDITION`. Other B2 facts still use those booleans as the condition. A free-floating assessment does not override a preparation enumeration.

## 6. Employee-size relief

`voluntaryForEmployeesLe10` and category `EMPLOYEES_LE_10` set treatment `VOLUNTARY`. The fact stays in scope. A missing value is `VOLUNTARY_MISSING` and does not block export. A reported value is included. B8–B11 have no relief flag, so they stay `NONE`.

`NOT_PROVIDED`, a rejected measure kind, a negative measure, or a non-finite measure leaves treatment `UNRESOLVED` on a relief fact. The category is not defaulted in either direction. A missing relief fact is then `BLOCKED_UNASSESSED`.

## 7. Omission treatment

| Evidence | `omissionStatus` | Completion |
| --- | --- | --- |
| No claim | `NONE` | Value rules |
| Reason `22(a)`–`22(d)`, listed in `B1_OMITTED_DISCLOSURES`, reassessed, and `conditionsAssessed` | `VALID` | `OMITTED` |
| Reason and list present, but conditions not assessed or not reassessed | `UNVERIFIED` | `OMISSION_UNVERIFIED` |
| Reason missing or B1 list incomplete | `INVALID` | `REQUIRED_MISSING` |

A valid omission stays applicable. It is not `NOT_APPLICABLE`. The engine does not decide that paragraph 22(a)–(d) are legally satisfied; `conditionsAssessed: false` remains `OMISSION_REQUIRES_VALIDATION`. A B9 paragraph 41(b) restriction is `LEGALLY_RESTRICTED` and is not a paragraph 22 omission.

## 8. Completion rules

| Situation | Status | Blocks export |
| --- | --- | --- |
| No usable configuration, or disclosure outside the selection | `OUT_OF_SCOPE` | No |
| Preparation, supplementary, digital, calculated, or guidance | `NOT_A_COMPLETION_TARGET` | No |
| Condition assessed and not met | `NOT_APPLICABLE` | No |
| Condition not assessed, completion fact | `BLOCKED_UNASSESSED` | Yes |
| Size category required for relief and not available | `BLOCKED_UNASSESSED` | Yes |
| Required value missing, empty, or invalid | `REQUIRED_MISSING` | Yes |
| Voluntary or size-relief value missing | `VOLUNTARY_MISSING` | No |
| Valid omission | `OMITTED` | No |
| Unverified omission | `OMISSION_UNVERIFIED` | Yes |
| Paragraph 41(b) restriction | `LEGALLY_RESTRICTED` | No |
| Present value, including zero and false | `COMPLETE` | No |

A calculated definition does not create a number. `B3_SCOPE1_SCOPE2_LOCATION_TOTAL` with no stored value stays missing. B3, B6, and B7 totals are not summed. B1, B8, and B10 workforce quantities are not forced equal. Monetary values are not converted.

B1 and B2 facts that still lack `informationClass` are completion targets when their role is a regulatory or derived datapoint. Guidance is excluded. This bridges INT-5 until those labels are added. The registry was not edited.

An open repeating group with zero rows is `COMPLETE` with output role `EMPTY_REPEATING_GROUP`, because the registry cardinality is zero or more. A biodiversity or water-stress condition that is met with no row stays `REQUIRED_MISSING`.

## 9. Output-inclusion rules

- `INCLUDE` when a completion fact, voluntary fact, preparation fact, supplementary fact, or digital fact has a value.
- `INCLUDE_WITH_OMISSION` when the omission is valid. No zero is invented.
- `EXCLUDE` when the value is absent, the fact is not applicable, or the fact is out of scope.

`blocksExport` stays true for `REQUIRED_MISSING`, `BLOCKED_UNASSESSED`, and `OMISSION_UNVERIFIED`, so an excluded required fact is still visible as a completion failure. `readyForReview` is not permission to issue a final report.

## 10. Report-level readiness

`readiness` reports, separately:

- `missingConfiguration`
- `outstandingRequired`
- `unassessedConditions`
- `unresolvedOmissions`
- `unsupportedRequirements`
- `readyForReview`

`readyForReview` is true only when the other five flags are false. Option B sets `unsupportedRequirements` because C1–C9 are not in the registry. Option A with a selected C disclosure does the same for that disclosure only, and the option remains Option A. Neither state produces a compliance claim.

## 11. Explicitly deferred functionality

- Repeating-row persistence and any API.
- C1–C9 definitions and Option B completion.
- Paragraphs 14 and 18.
- XBRL generation.
- Arithmetic for B3, B6, B7, B9, and B10 formulas.
- A legal conclusion on the paragraph 43 conjunction. One-event assessments carry `PARAGRAPH_43_CONJUNCTION_UNRESOLVED` and the metrics stay independent.
- A multi-country rollup of paragraph 42(a). The determination member is stored; the yes/no fact follows that member.
- Proof that a caller’s `conditionsAssessed` flag meets paragraph 22. The engine records the flag. It does not reconstruct the legal test.
- Connection to workspace, completeness, validation, or export.

## 12. Scenario-test results

`lib/vsme/vs2026/evaluation.test.ts`, 31 tests, all passed:

| Scenario | Result |
| --- | --- |
| A | Option A, 8 employees. B3 paragraphs 32–33, B6, and B7 missing facts are voluntary. Water consumption, pollutant quantities, and biodiversity names are not applicable after the stated assessments. B8, B9, and B10 essentials still block. B11 stays unassessed. |
| B | 50 employees. Total energy, Scope 1, and location-based Scope 2 are `REQUIRED_MISSING`. A missing breakdown assessment is `BLOCKED_UNASSESSED`. A reported zero is present. |
| C | 600 employees and Option A produce the same completion statuses as 50 employees. Comprehensive stays out. |
| D | Option B lists C1–C9 as `NOT_YET_EVALUATED`. A supplied C fact is ignored. Compliance stays `NOT_EVALUATED`. |
| E | Selected C5 stays additional. `B1_MODULE_OPTION` remains Option A. |
| F | No claim, unverified claim, missing B1 list, and a complete claim are distinct. Only the complete claim is `OMITTED`. |
| G | Missing `B4_REPORTING_CONDITION` stays `CONDITION_UNASSESSED` even if a side assessment says not applicable. |
| H | Six site rows and six material rows each remain addressable. |
| I | No applicable minimum wage is not a stored NO. Unassessed pay-gap and event assessments stay blocked. A conviction does not require a fine, and a fine does not require a conviction. Neither event writes a zero. |

## 13. Future persistence integration contract

A later loader should pass stored rows into `EvaluationInput` and consume `ReportEvaluation`. It should not reimplement these rules.

- Scalars on `SustainabilityDataPoint` become `facts`. Absence is `MISSING`. The string `0` is a reported zero.
- `Vs2026RepeatingRow` and `Vs2026RepeatingValue` become `repeatingRows`. The row id is the identity. B5 and B6 site cells carry the B1 site row id.
- `ReportingPeriod.vs2026ReportingOption` becomes `configuration` through the existing configuration reader. `B1_MODULE_OPTION` is not a second stored option.
- The explicit size measure becomes `employeeSize`. `Company.employeeCount` does not.
- Paragraph 22 rows become `omissions`. `B1_OMITTED_DISCLOSURES` becomes the reference fact. A materiality flag is not an omission.
- Preparation enumerations become facts. A blank enumeration is `MISSING`, which the evaluator treats as unassessed.

The loader is VS-03. The tables it reads are VS-02. This function does not create either.

## Verification

Command: `npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts`

Result: 85 passed, 0 failed. That is the previous 54 tests plus 31 evaluation tests. The database configuration test passed. Passing these tests does not make a reporting period complete.

`npx eslint lib/vsme/vs2026 --max-warnings 0` completed with no warnings.

`npx tsc --noEmit --pretty false --incremental false` reported the existing 17 Deployment Manager `@deployment/*` errors. None are in `lib/vsme/vs2026`.
