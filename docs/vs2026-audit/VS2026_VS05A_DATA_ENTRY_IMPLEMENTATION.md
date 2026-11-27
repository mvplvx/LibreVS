# VS-05A Data Entry

Date: 2026-11-27

Status: **IMPLEMENTED**

The editor stores Option A and supported Basic Module scalar facts. It does not assess compliance. SEC-01 sessions are the only identity source.

## 1. Readiness-endpoint correction

`GET /api/vsme/release/readiness` still requires a signed-in session. `runReadinessCheckForOrganization` limits the legacy-row sample and the latest-snapshot check to that session's organisation. A caller in organisation A receives that organisation's row count only.

`runReadinessCheck` is unchanged and remains the export gate. Export responses were not modified. A blocked export can still include the system-wide sample.

## 2. Editor route

`/vsme/vs2026/edit/[reportingPeriodId]`

The page loads `loadVs2026Editor`. The workspace navigation is unchanged. A period is created with the existing reporting-period flow, then opened at this URL. `schemaVersion` `2.0.0` is not treated as a VS 2026 selection.

## 3. Feature gate

`VS2026_EDITOR_ENABLED` must be the exact string `true`. It is off by default, separate from `VS2026_PREVIEW_ENABLED`, and checked on the page and on every save. A direct call while the flag is off does not write. `.env.example` contains a commented example. The flag is not set in production configuration.

## 4. Authentication and authorization

Saves call `requireAuthenticatedUser`. The organisation comes from the active domain user. `x-user-id`, `x-organization-id`, a client organisation id, and the reporting-period id are not identity. Ownership is `reporting period id` plus `company.organizationId`, read again inside the write transaction. Missing, expired, and inactive sessions are rejected. CSRF and origin checks in Better Auth are unchanged.

## 5. Reporting configuration

Option A is saved only through `saveReportingConfiguration`. An unconfigured period stays unconfigured until that save. A stored Option B period is shown as unsupported and is not converted. Additional Comprehensive disclosure ids already stored on Option A are written back unchanged. There is no Comprehensive data-entry screen. `B1_MODULE_OPTION` is not writable.

## 6. Employee proportionality

The measure is `VS2026_EMPLOYEE_PROPORTIONALITY` on `SustainabilityDataPoint`. The user types it and confirms it. The confirmation is not stored. Empty input deletes the row. It is not taken from the company workforce field, B1, B8, the former 500-employee rule, or the Value Chain Cap. Classification uses `classifyEmployeeSize`: 8 and 10 are `EMPLOYEES_LE_10`, 11 is `EMPLOYEES_GT_10`, and a missing row is `NOT_PROVIDED`. The measure does not change the reporting option. A company workforce figure of 650 can still be on an Option A period.

## 7. Scalar eligibility

The canonical registry is the field list. 112 B1–B11 datapoints, including guidance:

| Result | Count |
|---|---|
| Editable scalars | 61 |
| Repeating or dimensioned | 30 |
| No verified input control | 13 |
| Legacy identifier collision | 3 |
| Digital-only | 3 |
| Derived reporting option | 1 |
| Calculated output | 1 |

Every disclosure B1–B11 has at least one editable scalar. Repeating groups inside those disclosures are still not editable.

Legacy collisions, refused because the same ids are paragraph 79 items in the running VSME catalogue and guidance paragraph 15 items in VS 2026:

- `B2_COOPERATIVE_DISCLOSURES_COOP_INVESTMENT_SOCIAL_ECONOMY`
- `B2_COOPERATIVE_DISCLOSURES_COOP_PROFIT_DISTRIBUTION_LIMITS`
- `B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION`

No verified input control:

- `B1_EXPLICIT_COMPLIANCE_STATEMENT`
- `B1_LEGAL_FORM`
- `B1_NACE_CODES`
- `B2_SUSTAINABILITY_ISSUES_ADDRESSED`
- `B4_PUBLIC_DISCLOSURE_URL`
- `B8_MULTI_COUNTRY_OPERATIONS`
- `B9_HOURS_WORKED_ORIGIN`
- `B9_ACCIDENT_RATE_BASIS`
- `B9_FATALITY_LEGAL_RESTRICTION`
- `B10_MINIMUM_WAGE_DETERMINATION`
- `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE`
- `B10_GENDER_PAY_GAP_LEGAL_OBLIGATION`
- `B11_CONVICTIONS_AND_FINES_ASSESSMENT`

Calculated: `B3_SCOPE1_SCOPE2_LOCATION_TOTAL`.

Digital-only: `B7_WASTE_RECYCLING_PERCENT_MASS`, `B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS`, `B7_MATERIAL_VOLUME`.

Derived: `B1_MODULE_OPTION`.

Repeating or dimensioned ids include sites, subsidiaries, omitted-disclosure references, electricity and fuel members, Scope 3 categories, pollutant rows, biodiversity relationships, water-stress rows, materials, and country breakdown rows. The editor lists those group ids. It does not present them as complete.

Preparation inputs can be saved. The screen states that saving one does not complete a disclosure. B1 and B2 fields without `informationClass` stay on the VS-01 rule: a regulatory datapoint remains a completion target, and preparation guidance does not.

## 8. Supported input controls

Text, narrative, boolean (yes, no, unanswered), number, percentage, enumeration, and monetary amount. The registry has no date shape. Enumeration options use member ids. Concrete quantity units `MWh`, `tCO2eq`, and `m3` are stored as given. `WEIGHT` and `VOLUME` are not converted and are stored without an invented unit. Percentage bounds follow the registry: `ZERO_TO_100` or unbounded. Counts are whole numbers from zero upward. Other numeric shapes accept a negative value when the registry does not forbid one. Zero is not implied by an empty field.

## 9. Validation

The server checks the feature gate, the session, the active user, organisation membership, period ownership, Option A, the registry datapoint, scalar eligibility, the value type, enumeration membership, numeric form, and the stored unit. Browser field metadata is not accepted. Invalid numbers and empty strings are not stored as zero. `false` is stored as `false`.

## 10. Legacy data collision

Equal field ids are not treated as equal meanings. The three overlapping ids cannot be written. A row with `legacyFieldId`, `migratedFieldId`, or `migrationStatus` is not updated or deleted. The check and the write run in one transaction, and the update predicate requires those markers to be null. Two clean concurrent edits use last-write-wins. A unique-constraint conflict aborts the transaction rather than overwriting a protected row. Existing rows are not migrated or deleted. The current loader can still read a parseable value on a protected row whose id is a VS 2026 scalar. This editor will not replace that row.

## 11. Save and clear

Each field has an explicit save. The screen shows saving, success, validation, and authorization text only after the server replies. Clear deletes that field's row. It does not delete other facts and does not store an empty string. Read-after-write confirms the stored value or the deleted row before success is returned.

## 12. Preview

The editor links to `/vsme/vs2026/preview/[reportingPeriodId]`. That page keeps `VS2026_PREVIEW_ENABLED`. The editor does not calculate a second completion status. `completionAssessment` and `complianceClaim` remain `NOT_EVALUATED`.

## 13. Automated tests

- Registry eligibility and the editor source boundary.
- Editor presentation.
- Persistence: unconfigured period, Option A, reload, Option B unchanged, additional C5 preserved, employee measures 8, 10, 11, missing, and invalid, boolean false, numeric zero, text, enumeration, update, clear, read-after-write, cross-period, cross-organisation, legacy protection, materiality ignored by the evaluation, and a workforce figure of 650 still on Option A.
- Session security: valid write, no session, expired session, inactive user, forged headers, other organisation, foreign period, guessed id, disabled flag, direct disabled call, unknown field, derived field, wrong type, invalid enumeration, legacy overwrite.
- Readiness: organisation A does not receive organisation B's row count. An anonymous request is 401.

Tests use rolled-back transactions or delete the rows they create. The development database is not reset.

## 14. Unsupported fields

Repeating rows, dimensioned energy, the unsafe shapes listed above, calculated and digital outputs, the derived module option, and the three legacy collisions. Comprehensive C1–C9 data entry is not available. Paragraph 22 omissions are not approved. B3, B6, B7, B9, and B10 are not calculated.

## 15. Remaining VS-05B work

Repeating rows, dimensioned facts, and autosave are not implemented. The export readiness sample is still system-wide. A protected legacy row with a parseable value can still be read by the existing loader. The editor flag stays off until it is explicitly enabled for a process.
