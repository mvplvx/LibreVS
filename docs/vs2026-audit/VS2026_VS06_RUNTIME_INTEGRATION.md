# VS-06 — Basic Module runtime integration

VS 2026 Option A now has one reporting-state result. The VS-01 evaluator remains the regulatory decision. This phase does not generate a JSON, XLSX, or PDF report and does not certify conformity.

## 1. Reporting-standard isolation

`ReportingPeriod.vs2026ReportingOption` is the only standard discriminator.

| Stored option | Identity | Workflow |
| --- | --- | --- |
| `null` | Legacy VSME | Existing VSME form, materiality, and exporters |
| `OPTION_A` | VS 2026 Option A | VS 2026 editor and Basic Module review |
| `OPTION_B` | VS 2026 Option B | Unsupported status. The legacy form is not used instead |
| Any other value | Invalid | Fail closed for both workflows |

`schemaVersion` stays `"2.0.0"` for periods created by the current application. It is not read when choosing the standard. The reporting year is not read either. A new period stays legacy until the user saves Option A in the VS 2026 editor. Nothing converts an existing period automatically.

## 2. Reporting-period ownership

`getVS2026ReportingState` and the existing VS 2026 writers resolve the organisation from the Better Auth session and PostgreSQL. The period must belong to that organisation. A foreign or guessed period returns not found. Client identity headers are ignored.

## 3. Legacy API write protection

These mutations reject a period whose option is not null:

- `POST /api/data-point`
- `PUT /api/reporting-period/[id]/materiality`

A null option still accepts the legacy write. A VS 2026 writer still rejects a null option and Option B. `VsmeFieldMateriality` is not an input to VS-01, so a stored `non_material` row does not remove a VS 2026 disclosure from the review. A scalar whose field id is not in the VS 2026 registry is excluded by the loader and is not treated as a VS 2026 fact.

## 4. Shared reporting-state contract

`getVS2026ReportingState({ reportingPeriodId })` checks the editor flag, the session, ownership, and the stored option. For Option A it calls `loadVS2026EvaluationInput` and `evaluateVS2026ReportingState`, then `aggregateReportingReadiness`.

The result carries the period, the standard identity, the option, the employee-size category, B1–B11 disclosure summaries, field-level issues, structurally complete omission count, limitations, and `complianceClaim: "NOT_EVALUATED"`. `conformityStatement` stays `"NOT_PREPARED"`.

There is no public reporting-state route. The editor page is the consumer.

## 5. Completeness and validation

Readiness is one of:

- `NOT_CONFIGURED` — option is null. VS-01 is not run.
- `INVALID_REPORTING_STATE` — the stored option or the loaded facts cannot be evaluated.
- `NEEDS_CORRECTION` — an invalid value, an incomplete paragraph 22 claim, or a data conflict.
- `IN_PROGRESS` — a required in-scope fact is still missing.
- `NEEDS_ASSESSMENT` — an applicability condition or the first-year declaration is still open, and no correction or missing required fact remains.
- `UNSUPPORTED` — Option B, a selected Comprehensive disclosure, or a declared subsequent year whose comparison is not implemented.
- `READY_FOR_REVIEW` — none of the blocking, quality, or unsupported issues remain.

`READY_FOR_REVIEW` means the saved Basic Module information can be reviewed inside LibreVS. It does not mean the report is certified or that the paragraph 27(a) statement exists.

Issue codes:

| Code | Severity | Effect on readiness |
| --- | --- | --- |
| `REQUIRED_FACT_MISSING` | blocking | `IN_PROGRESS` |
| `INVALID_REPORTED_VALUE` | blocking | `NEEDS_CORRECTION` |
| `OMISSION_INCOMPLETE` | blocking | `NEEDS_CORRECTION` |
| `DATA_INTEGRITY_CONFLICT` | blocking | `NEEDS_CORRECTION` |
| `CONDITION_UNASSESSED` | quality | `NEEDS_ASSESSMENT` |
| `UNSUPPORTED_REPORTABLE_FACT` | unsupported | `UNSUPPORTED` |
| `REPORT_FINALISATION_PENDING` | finalisation | Does not block review |
| `UNRECOGNISED_SUPPLEMENTARY_INFORMATION` | warning or optional | Does not block review |

`CONDITION_UNASSESSED` is LibreVS's internal quality gate. Annex I paragraph 15 can treat an omitted conditional disclosure as not applicable. The review says that explicitly.

Missing voluntary information, preparation-only inputs, and digital-only outputs do not block review. An empty repeating group is not rejected only because the structure allows more than one row.

## 6. Regulatory versus internal quality rules

VS-01 decides scope, requirement type, applicability, employee-size relief, omissions, and datapoint completion. The aggregation only classifies that result. It does not add a second rule engine.

The employee-size category comes from `VS2026_EMPLOYEE_PROPORTIONALITY`. `Company.employeeCount`, including a value of 650, does not change Option A and does not apply the former 500-employee rule.

## 7. Remaining calculated-fact limitations

- `B3_SCOPE1_SCOPE2_LOCATION_TOTAL` is a calculated presentation value. Paragraph 33 requires separate Scope 1 and location-based Scope 2 facts. A missing combined total does not make the module incomplete. No emission factors are applied.
- `B9_RECORDABLE_ACCIDENT_RATE` is entered directly. A valid reported rate is accepted. The rate is not calculated from hours, and no working-hours assumption is added.
- The two B7 digital waste percentages and other digital-only outputs are not Annex I completion facts. Paragraph 39(b) remains `B7_WASTE_DIVERTED_PROPORTION`.
- The three cooperative guidance identifiers stay unavailable because their legacy meaning differs. They are preparation guidance, not Annex I completion facts, so their absence does not block review.

## 8. Paragraph 22 treatment

The VS-05B.2 omission record is the only omission model. A claim with both attestations and a matching B1 list is structurally complete. The review counts it and states that it is the undertaking's attestation, not an independent legal approval. A claim that is missing an attestation, or whose B1 list is incomplete, is `OMISSION_INCOMPLETE` and blocks review. It is not turned into a conformity statement.

## 9. First-year and comparative limitations

`VS2026_COMPARATIVE_BASIS` is a reserved scalar, excluded from Annex I facts. The user confirms `FIRST_YEAR` or `SUBSEQUENT`. Absence stays `UNKNOWN`. A new database period is not inferred to be a first year.

- `UNKNOWN` blocks `READY_FOR_REVIEW` as an internal limitation.
- `FIRST_YEAR` does not require comparative figures for this pilot. Paragraph 18 references to unchanged earlier datapoints are still unsupported. Missing values stay missing.
- `SUBSEQUENT` is `UNSUPPORTED`. Comparative coverage is not claimed.

Future comparative support needs a prior-report reference chosen by the user, a datapoint-level exception for metrics disclosed for the first time, and an explicit unchanged-information reference. Values must not be copied forward.

## 10. Option B limitations

Option B is stored and then shown as unsupported. Comprehensive disclosures C1–C9 are not evaluated. Selecting an additional Comprehensive disclosure on Option A also leaves the review unsupported. Neither path is presented as a complete Basic Module.

## 11. Review user experience

The Option A editor shows a Basic Module review: period, option, employee-size category, B1–B11 titles, issues grouped by what blocks review, what is an internal check, what is unsupported, what belongs to finalisation, and what is optional. Each issue links to the disclosure or field. The status is not a percentage and is not labelled compliant.

The dashboard and the legacy data-entry page keep the legacy workspace while the option is null, with a link to the editor. After Option A or Option B is saved, those pages show the VS 2026 status and do not present legacy completeness or the legacy exporter as the report. If the editor flag is off, the VS 2026 page says the editor is not enabled. It does not open the legacy form for that period.

## 12. Export guards

A VS 2026 period is rejected before a legacy file or snapshot is built:

- `loadValidatedExportContext` (JSON, XLSX, and PDF routes)
- `GET /api/reporting-period/[id]/export`
- `POST /api/reporting-period/[id]/export-snapshots/[snapshotId]/finalize`

The error states that the legacy exporter cannot produce a VS 2026 report. Legacy periods still use the existing exporter.

Before VS 2026 exports can be enabled, VS-07 has to replace that legacy path. It must not use `assertSystemReadyForExport`, which samples system-wide readiness and can depend on another organisation's data. Organisation-scoped readiness already exists as `runReadinessCheckForOrganization`. VS-06 does not change that health check.

## 13. Authentication and security

Protected reads and writes use the Better Auth session. The organisation comes from PostgreSQL. Period ownership is checked again at the mutation. Forged identity headers do not select the tenant. Anonymous, inactive, foreign, and guessed-period access do not receive another organisation's reporting state. The editor flag must be exactly enabled; a disabled flag returns `EDITOR_DISABLED` and does not fall back to the legacy editor.

Autosave still sends `expectedUpdatedAt`. A mismatch returns a conflict and keeps the draft. Callers that omit the version remain last-write-wins; that path is not treated as conflict-safe. The comparative-basis and employee-measure saves stay explicit confirmations.

## 14. Automated tests

`reportingState.test.ts` covers the readiness classes, including required and missing facts, assessed and unassessed conditions, voluntary relief at 10 employees or fewer, reported zero and false, separate Scope 1 and Scope 2, the absent combined total, the legal waste proportion, a reported accident rate, B10 and B11 assessments, complete and incomplete omissions, invalid values, Scope 3 rows, first-year, unknown, and subsequent history.

`reportingState.integration.test.ts` saves Option A, an employee measure of 8 on a company whose workforce field is 650, a scalar, a site row, and a Scope 3 row, then reads the shared state. It also rejects a legacy datapoint write, a materiality write, and a legacy export for an Option A period, and it still accepts a legacy datapoint write on a null-option period.

## 15. Browser verification

An unrelated Next server already owns port 3000, so the check used a separate copy of the application on port 3016 with the editor flag enabled. It did not share that server's build directory.

Signed in with a dedicated account, opened the 2026 period, and saw the legacy data-entry form with a link to the VS 2026 editor. Saving Option A designated the period. The editor then accepted a legal-form value and a B1 site row through autosave. After reload, both values were still present and the Basic Module review no longer listed the legal form as missing. Entering turnover removed that item from the review on the next load: B1 went from 13 required missing to 12. The legacy data-entry page then showed the Option A notice instead of the legacy form, and the company line no longer applied the old 500-employee module rule. `GET /api/reporting-period/{id}/export` returned 409 with "The legacy exporter cannot produce a VS 2026 report." No export snapshot was stored.

The hydration notice in the browser tools came from the tool's own element attribute on the existing chrome. It is not a reporting-workflow failure.

## 16. Remaining blockers for report generation

- No VS 2026 JSON, XLSX, or PDF generator.
- The paragraph 27(a) conformity statement is not prepared from review readiness.
- Paragraph 18 unchanged-information references are not supported.
- Subsequent-year comparative figures are not supported.
- Option B and C1–C9 are not evaluated.
- Scope 3 is stored and labelled as supplementary with limited evaluation. There is no Scope 3 calculation.
- The combined Scope 1 and Scope 2 total and the accident rate are not calculated.
- Appendix B topic selection remains a deferred optional control. Paragraph 29 is reported through the existence answers.
- XBRL is not generated.
