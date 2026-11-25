# VS 2026 rule evaluation and scenarios

Design only. No evaluation module was added. The running completeness engine still uses employee count and materiality.

## Evaluation contract

One pure function produces the result that workspace, API, completeness, validation, and export must share. It does not read Prisma. Callers pass the stored facts in.

```typescript
type SizeState =
  | { status: "NOT_PROVIDED" }
  | { status: "CLASSIFIED"; category: "EMPLOYEES_LE_10" | "EMPLOYEES_GT_10" };

type ApplicabilityState =
  | "ALWAYS"
  | "CONDITION_MET"
  | "CONDITION_NOT_MET"
  | "CONDITION_UNASSESSED";

type CompletionState =
  | "OUT_OF_SCOPE"
  | "NOT_APPLICABLE"
  | "BLOCKED_UNASSESSED"
  | "VOLUNTARY_MISSING"
  | "REQUIRED_MISSING"
  | "OMITTED"
  | "COMPLETE";

type ExportInclusion = "EXCLUDE" | "INCLUDE" | "INCLUDE_WITH_OMISSION";

type DatapointEvaluation = {
  datapointId: string;
  inReportingScope: boolean;
  requirementType: "ESSENTIAL" | "IF_APPLICABLE" | "VOLUNTARY";
  applicability: ApplicabilityState;
  employeeSizeRelief: "NONE" | "VOLUNTARY";
  omission: "NONE" | "VALID" | "INVALID";
  valuePresence: "MISSING" | "PRESENT";
  completion: CompletionState;
  exportInclusion: ExportInclusion;
};
```

Inputs, all explicit:

1. Reporting configuration: `NOT_CONFIGURED` or Option A with a list of additional Comprehensive ids, or Option B. `NOT_CONFIGURED` does not become Option A.
2. Employee-size state from `VS2026_EMPLOYEE_PROPORTIONALITY` only.
3. The registry definition, including requirement type, applicability kind, size flag, information class, and Annex II link.
4. The preparation enumerations needed by that applicability kind.
5. Paragraph 22 rows for this period: datapoint id plus one reason `22(a)`–`22(d)`.
6. Whether a value row exists. The numeric contents are not interpreted as zero when the row is absent.

Order of tests:

1. Scope. Basic disclosures are in scope for Option A and Option B. Comprehensive disclosures are in scope for Option B, or for Option A only when the id is in the additional list. Unconfigured periods are out of scope for completion. They are not Option A.
2. Information class. Preparation, supplementary, and digital facts are not completion targets. They may still be stored and exported as supporting data.
3. Applicability. `ALWAYS` is `CONDITION_MET`. A preparation enum that is absent is `CONDITION_UNASSESSED`. A negative member is `CONDITION_NOT_MET`. `CONDITION_UNASSESSED` is not `NOT_APPLICABLE`.
4. Size relief. `voluntaryForEmployeesLe10` and category `EMPLOYEES_LE_10` mark the fact voluntary. It stays in scope. `NOT_PROVIDED` does not grant relief and does not remove the fact.
5. Omission. A paragraph 22 row with one reason makes `omission` `VALID` for that datapoint. It does not change applicability. `non_material` is ignored.
6. Completion. Out of scope, condition not met, valid omission, or a present value each finish as named above. Condition unassessed on a completion fact is `BLOCKED_UNASSESSED`. Voluntary and missing is `VOLUNTARY_MISSING`, which does not block export. Essential or applicable and missing is `REQUIRED_MISSING`.
7. Export. `COMPLETE` and `VOLUNTARY_MISSING` include the fact when a value exists. `OMITTED` includes the omission list, not a fabricated zero. `REQUIRED_MISSING` and `BLOCKED_UNASSESSED` exclude a successful export. `NOT_APPLICABLE` and `OUT_OF_SCOPE` are excluded.

Annex II membership is a separate query, `annexIIFor`. It does not change completion. A listed row does not mean a buyer request is capped.

Compliance claim stays `NOT_EVALUATED`. Option B cannot be called compliant while C1–C9 are unimplemented.

## Invariants the tests must lock

- Missing configuration is not Option A.
- 500 employees do not select Option B.
- `non_material` does not remove an essential fact.
- A paragraph 22 omission is not `NOT_APPLICABLE`.
- Voluntary missing data can remain in the report as absent. It is not deleted from the model.
- A missing number is not zero.
- An unassessed condition is not a negative finding.
- In scope is not complete.
- Preparation data is not a completion fact.

## Scenario matrix

No runtime test is added in this phase. Future tests belong next to the evaluation function and must not import the running `moduleScope`.

### Scenario A — 8 employees, Option A

Input: size measure 8, kind `VS2026_EMPLOYEE_PROPORTIONALITY`, Option A, no additional C ids. Water-process assessment `NO_SUCH_PROCESSES_IDENTIFIED`. Pollution condition `NEITHER`. Biodiversity assessment `NO_IDENTIFIED_RELATIONSHIP` for each assessed site.

Rules: category `EMPLOYEES_LE_10`. B3 paragraphs 32–33, B6, and B7 are voluntary. B4, B5, B8, B9, B10, and B11 are not. Water consumption is `NOT_APPLICABLE`. Pollution quantities are `NOT_APPLICABLE` when the method is not direct reporting. Biodiversity names are `NOT_APPLICABLE` when every assessed site has no relationship. Unassessed sites would be `BLOCKED_UNASSESSED` instead.

Expected: Option A. Comprehensive out of scope. Voluntary environmental facts do not block export when blank. B8 contract and gender counts still block when blank.

Gap: no evaluator. The running app would put this undertaking in Basic only because 8 is below 500, and would still require B3.

### Scenario B — 50 employees, Option A, incomplete B3

Input: size 50, Option A. Total energy and Scope 1 absent. Scope 2 location-based absent.

Rules: no size relief. Those three facts are essential and `REQUIRED_MISSING`.

Expected: export blocked. Breakdown cells stay conditional on whether the breakdown can be obtained. A missing breakdown assessment is `BLOCKED_UNASSESSED`, not zero energy.

Gap: running completeness uses the VSME field list and materiality, not these ids.

### Scenario C — 600 employees, Option A

Input: size 600, Option A, no additional C ids.

Rules: `resolveModuleSelection` keeps Comprehensive out. 600 is not a threshold.

Expected: same Basic completion set as scenario B. C1–C9 out of scope.

Gap: `isModuleCInReportingScope(600)` is true today. This is the cutover defect INT-2.

### Scenario D — 50 employees, Option B, partial C

Input: size 50, Option B.

Rules: Basic plus the full Comprehensive list is the selected scope. `completionAssessment` stays `NOT_EVALUATED`.

Expected: the evaluator marks every C id in scope. It must not mark the report complete. Assertions that name C datapoints wait until that registry exists. The only assertion that can be written now is: Option B does not become compliant because some C values are filled.

Gap: C1–C9 definitions are not in the registry.

### Scenario E — Option A plus C5

Input: Option A, additional id for C5 only.

Rules: the stored selection stays Option A. C5 is in scope. Other C disclosures are out of scope. `B1_MODULE_OPTION` still reads Option A.

Expected: saving C5 does not flip the option.

Gap: the configuration module already rejects that flip. The workspace does not read it.

### Scenario F — paragraph 22 omission

Input: an essential B3 total is absent, and a paragraph 22 row names that datapoint with one of 22(a)–22(d). `B1_OMITTED_DISCLOSURES` lists it.

Rules: applicability of the energy total stays `ALWAYS`. Omission is `VALID`. Completion is `OMITTED`. If the reason or the B1 list is missing, omission is `INVALID` and completion stays `REQUIRED_MISSING`.

Expected: export can proceed only with the omission disclosed. `non_material` alone does not.

Gap: no paragraph 22 store. `VsmeFieldMateriality` is the only current omission-like flag.

### Scenario G — B4 not assessed

Input: `B4_REPORTING_CONDITION` has no row.

Rules: applicability `CONDITION_UNASSESSED`. Completion `BLOCKED_UNASSESSED`. Pollutant quantities are not required and are not `NOT_APPLICABLE`.

Expected: the period cannot be exported as complete.

Gap: the running B4 boolean "not required by law" is a different field and is not this assessment.

### Scenario H — more than five sites and materials

Input: six `B1_SITE` rows and six `B7_MATERIAL` rows, each with its own id.

Rules: cardinality zero or more, maximum null.

Expected: each row remains addressable in the API and in the export JSON. No slot `6` is dropped.

Gap: the unique `(reportingPeriodId, fieldId)` constraint cannot store this. The VSME section files still use five material slots. Those files stay until cutover.

### Scenario I — conditional B10 and B11

Input one: minimum-wage determination `NO_APPLICABLE_MINIMUM_IDENTIFIED`. Pay-gap obligation has no row. No conviction assessment.

Expected: the yes/no wage fact is `NOT_APPLICABLE`. It is not `NO`. The pay-gap percentage is `BLOCKED_UNASSESSED`, not `NOT_APPLICABLE`. Conviction and fine facts are `BLOCKED_UNASSESSED` until the event assessment exists. No zeros are written.

Input two: assessment `CONVICTIONS_OCCURRED`, count present, fine amount absent.

Expected: the count can be `COMPLETE`. The fine stays `NOT_APPLICABLE` for the fine condition. The open reading of paragraph 43 "and" is not resolved by requiring the fine as well. Export does not invent a zero fine.

Input three: assessment `FINES_OCCURRED`, amount present, count absent. Symmetric to input two.

Gap: no evaluator and no store. The legal conjunction remains unresolved and must be stated beside the export, not encoded as a forced pair.
