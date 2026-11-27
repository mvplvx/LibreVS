# VS-07A — Canonical report dataset, finalisation, and JSON export

This phase adds one VS 2026 Option A report dataset, an explicit undertaking declaration, an immutable snapshot, and a downloadable JSON file. XLSX, PDF, and XBRL are not produced. The JSON file is LibreVS's structured report. It is not an EFRAG XBRL filing and it is not an official EFRAG digital template.

The regulatory decisions stay in `evaluateVS2026ReportingState` and `getVS2026ReportingState`. `buildVS2026ReportDataset` does not re-implement module scope, applicability, employee-size relief, completion, materiality, or paragraph 22 validity.

## 1. Canonical dataset contract

`buildVS2026ReportDataset` in `lib/vsme/vs2026/reportDataset.ts` returns `VS2026ReportDataset`:

- `metadata` — format `librevs-vs2026-report`, format version `1`, instrument Commission Delegated Regulation (EU) 2026/1560, regulatory version `EU-2026/1560`, Annex I, draft or final status, period, year, option, and reporting currency.
- `undertaking` — name and currency.
- `basisOfPreparation` — option, comparative basis, currency, organisational boundary from `B1_REPORTING_BASIS` when that fact is published, and explicit `NOT_IMPLEMENTED` markers for paragraph 14 comparative information and paragraph 18 unchanged-information references.
- `disclosures` — B1–B11 in editor order. Each fact keeps the registry id, regulatory statement, paragraph, repeating group, applicability, employee-size treatment, unit, dimension member, row id, and the original recorded value.
- `supplementaryInformation` — stored Scope 3 category rows.
- `omittedDisclosures` — valid paragraph 22 omissions, without the omitted value.
- `validation` — shared review readiness, issues, unsupported disclosure ids, provenance exclusions, and limitations. `complianceClaim` is always `NOT_EVALUATED`.
- `conformityStatement` — present only on a final dataset.

Ordering is disclosure order, registry datapoint order, repeating-row position, row id, then dimension member. It does not follow database insertion order. A missing value stays null. `"0"` stays zero. `"false"` stays false.

## 2. Regulatory data inclusion rules

A fact is copied from the VS-01 evaluation when it is in reporting scope and it is not:

- `B1_EXPLICIT_COMPLIANCE_STATEMENT` (the declaration is attached only after finalisation);
- a calculated fact, including the combined Scope 1 and location-based Scope 2 total;
- a digital-only fact, including the digital B7 mass-recycling percentage;
- supplementary information (Scope 3 is handled separately);
- a valid paragraph 22 omission.

Preparation data, such as the B9 accident-rate basis, B10 wage determination, and the B11 convictions assessment, is included with `publication: "PREPARATION_CONTEXT"`. Other included facts use `publication: "REPORTED_FACT"`. No calculated value is invented. Electricity dimension members, including the evaluator's Total member, are kept in the order above.

## 3. Reporting-period eligibility

`finalisationDecision` allows a snapshot only when all of the following hold:

- the stored option is Option A;
- no additional Comprehensive disclosure is selected;
- every registry scalar used for the report has `reportingOrigin = "VS2026_EDITOR"` and no legacy migration marker;
- the comparative basis is the explicit value `FIRST_YEAR`;
- the shared review status is `READY_FOR_REVIEW`;
- the authenticated user sent `confirmed === true`.

These states are refused: legacy (`null` option) `NOT_CONFIGURED`; an unrecognised option `INVALID_REPORTING_STATE`; Option B `OPTION_B_UNSUPPORTED`; a selected C disclosure `UNSUPPORTED_COMPREHENSIVE`; unmarked or legacy-marked scalars `LEGACY_VALUE_PROVENANCE`; unknown or subsequent comparative basis `COMPARATIVE_BASIS_UNSUPPORTED`; any other review status `NOT_READY`; a missing confirmation `CONFIRMATION_REQUIRED`.

The route reads only `confirmed`. It does not accept a client readiness flag, a client statement, or a client user id. A positive flag in the request body cannot finalise an unready period.

## 4. Legacy-data provenance checks

`SustainabilityDataPoint.reportingOrigin` is nullable. The VS 2026 editor sets it to `VS2026_EDITOR` on create and update. A row is unverified when that origin is absent or when `legacyFieldId`, `migratedFieldId`, or `migrationStatus` is set. Unknown legacy field ids are ignored. `B1_MODULE_OPTION` is not scanned because the evaluator derives it from the saved option.

Unverified registry scalars become review issues with code `LEGACY_VALUE_PROVENANCE` and are published as `valueStatus: "EXCLUDED_UNVERIFIED_ORIGIN"` with a null value. Finalisation is blocked. The message tells the user to re-save the value in the VS 2026 editor or to use a clean VS 2026 period. Historical values are not imported or rewritten. Repeating rows are written only by the VS 2026 editor and are not origin-scanned.

## 5. First-year reporting limitation

Finalisation accepts only an explicit `FIRST_YEAR` declaration saved by the user. The reporting year, the database creation time, and the absence of an earlier LibreVS report are not used.

Unknown basis and `SUBSEQUENT` both block finalisation. Paragraph 14 comparative figures and paragraph 18 unchanged-information references are not produced and are not invented. The dataset states that this is a limitation of this LibreVS version, not a limitation of Regulation (EU) 2026/1560.

## 6. Conformity declaration

The proposed text names the undertaking and the reporting year and states that the report is prepared in conformity with Commission Delegated Regulation (EU) 2026/1560, Option A — Basic Module. It also states that the information is supplied by the undertaking, that the undertaking is responsible for its correctness and has reviewed the reporting basis, and that paragraph 22 omissions are the undertaking's own assessments. The last sentence says the statement is the undertaking's declaration and is not an assurance opinion.

The server generates that text again at finalisation from the company name and year. A draft dataset forces the statement to null. The stored object is `{ text, acceptedBy: "AUTHENTICATED_ORGANISATION_USER", legalEffect: "UNDERTAKING_DECLARATION", assuranceOpinion: false }`. `complianceClaim` remains `NOT_EVALUATED`.

## 7. Undertaking approval

The finalisation panel requires a checked confirmation before the button is enabled. The action is `finaliseReportAction(reportingPeriodId, confirmed)`. The finalising user id is the Better Auth session user. An authenticated member of the organisation may finalise for the undertaking. A separate approver role is not implemented; the panel describes it as a future enhancement. Autosave and a positive review status do not finalise the report.

## 8. Paragraph 22 treatment

The existing omission record is reused. A valid omission is removed from the disclosure facts, so the underlying value is not published, and is listed in `omittedDisclosures` with the datapoint id, label, paragraph, row id, reason `22(a)`–`22(d)`, reassessment flags, `attestation: "STRUCTURAL_UNDERTAKING_ATTESTATION"`, and `independentLegalApproval: false`. Internal assessment notes are not exported. `B1_OMITTED_DISCLOSURES` remains the id list. An incomplete omission stays a blocking review issue and prevents finalisation.

## 9. Snapshot structure

`Vs2026ReportSnapshot` is a new table. The legacy `VsmeExportSnapshot` model and its finalisation route are unchanged. A VS 2026 snapshot stores the period, organisation, company, revision, regulatory version `EU-2026/1560`, option, canonical dataset JSON, conformity statement text, content hash, authenticated user id, and timestamp. `ReportingPeriod.schemaVersion` is not used as the regulatory version. The period status stays `draft`. No legacy export snapshot is created.

## 10. Snapshot immutability

Finalisation and every VS 2026 editor write take the same transaction advisory lock, `pg_advisory_xact_lock(hashtext('vs2026-report:' || periodId))`, under Read Committed. The snapshot is built from the state read after that lock. An identical content hash returns the existing revision. A different hash creates the next revision. The unique key is `(reportingPeriodId, revision)`. A finalised row is never updated or deleted by this workflow.

Downloads read the stored JSON. They recompute the hash and check that the dataset statement matches the column. A mismatch returns `INTEGRITY_FAILURE`. A later edit of the live period does not change an earlier revision.

## 11. JSON schema

`renderDraftReportFile` and `renderFinalReportFile` in `lib/vsme/vs2026/reportJson.ts` emit one object, with keys sorted, and a trailing newline. The envelope fields are `format`, `formatVersion`, `regulatoryVersion`, `status`, `description`, `revision`, `snapshotId`, `finalisedAt`, `finalisedByUserId`, `contentHash`, and `dataset`. The description says this is a LibreVS structured VS 2026 report and that it is not an EFRAG XBRL filing or an official EFRAG digital template.

A draft is built from the current period, has status `DRAFT`, revision null, and no conformity statement. A final file is rendered only from a stored snapshot whose dataset status is `FINAL` and whose statement is present. The hash is SHA-256 of the canonical dataset's stable JSON.

## 12. Download authorization

`POST /api/vsme/vs2026/report/[reportingPeriodId]/finalise`, `GET .../draft`, and `GET /api/vsme/vs2026/report/snapshot/[snapshotId]` require a Better Auth session. The organisation comes from that session. A period or snapshot outside the organisation returns 404, including a guessed snapshot id. The editor flag is checked after authentication and ownership. When the flag is off, an owned download returns 409 `EDITOR_DISABLED` and does not return the file. Unauthenticated access returns 401 even when the flag is off.

Response headers are `content-type: application/json; charset=utf-8`, `content-disposition: attachment`, `cache-control: private, no-store`, and `x-content-type-options: nosniff`. Filenames are `vs2026-option-a-draft.json` and `vs2026-option-a-r{revision}.json`.

## 13. Export readiness

Finalisation calls `runReadinessCheckForOrganization` and ignores the returned system-health colour. A thrown database error becomes `DATABASE_FAILURE` and HTTP 503. `assertSystemReadyForExport` is not used. Another organisation's incomplete legacy reporting data does not block this export. During verification the organisation-scoped check reported system health red, and the Option A snapshot was still created.

The legacy JSON, XLSX, and PDF routes still call their existing readiness check after they refuse a VS 2026 period. Their regulatory behaviour is unchanged.

## 14. Test results

- `npx prisma validate` passed. Migration `20261127143000_vs07a_report_snapshot` is applied.
- `npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts`: 165 tests, 165 passed, 0 failed. The previous baseline was 157.
- `npx tsx --env-file=.env --test lib/auth.security.test.ts`: 3 passed, 0 failed.
- `npx tsc --noEmit --pretty false --incremental false`: the 17 existing Deployment Manager errors only (`@deployment/*` in `deployment/ui`). No VS-07A type error.
- ESLint `--max-warnings 0` passed on the VS-07A source, routes, panel, and tests.
- Dataset tests cover B1–B11 order, currency, zero, false, missing values, voluntary facts, dimensions, sites, pollutants, waste proportion, workforce, B9 rate, B10 wage determination, B11 convictions and fines, a paragraph 22 omission whose value is absent, and Scope 3 supplementary values.
- Integration tests cover the refusal matrix, an explicit confirmation, one snapshot for two concurrent finalisations, a later live edit that leaves revision 1 unchanged, a second revision, hash failure, and a foreign organisation.
- Security tests use real sessions and cover anonymous access, forged identity headers, a foreign period, a guessed snapshot id, a foreign snapshot, the editor flag, an inactive user, and an expired session.

## 15. Remaining blockers for XLSX, PDF, and release

- XLSX and PDF renderers do not exist. They should consume a frozen `VS2026ReportDataset` and should not query Prisma or re-evaluate scope.
- XBRL and the official EFRAG digital template are not implemented.
- C1–C9 is not implemented. A selected additional Comprehensive disclosure blocks finalisation.
- Comparative figures and paragraph 18 references are not implemented. Subsequent-year reports cannot be finalised.
- Values without `VS2026_EDITOR` origin cannot be finalised. There is no automatic migration.
- Any authenticated organisation user may finalise. A distinct approver role is not implemented.
- The JSON report is not a filing format and this workflow is not legal assurance.

Browser check on an isolated server at `http://localhost:3017` (the process on port 3000 was left running): sign-in succeeded, the prepared Option A editor showed no blocking review issue, the proposed statement named the test undertaking and 2026, the confirmation was checked, finalisation created revision 1, and the JSON download returned 200 with `private, no-store`. The live legal form was then changed and autosaved. A second download of revision 1 was byte-identical (SHA-256 `057f6ddf03b991038c7a14d1beece49b3bbe2f2e4a6fb4aebf941b913f7f8647`) and still contained the original legal form. The required facts for that period were written through the VS 2026 editor writers before the browser session; the browser session itself performed sign-in, review, confirmation, finalisation, download, the live edit, and the second download. The temporary account and the isolated server were removed afterwards.
