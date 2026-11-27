# VS-05B.2 — Basic Module input completion, applicability, omissions, and autosave

Status: implemented with documented conditions. Date: 2026-11-27.

This phase completes the Option A data-entry path for the Basic Module. It does not calculate emissions, certify compliance, generate a report, or change the running VSME export engines.

## 1. Regulatory input-gap reconciliation

The earlier inventory had 17 definitions without a verified control. They are not 17 new Annex I obligations.

| Earlier gap | Class | Treatment |
|---|---|---|
| `B1_LEGAL_FORM` | Required Annex I fact, paragraph 27(e)(i) | Entered as the undertaking's own legal-form description. National forms are not reduced to a partial list. This is not the registration number. |
| `B1_NACE_CODES` | Required Annex I fact, paragraph 27(e)(ii) | Multiple codes. Stored as a JSON array. |
| `B1_SITE_COUNTRY`, `B1_SITE_GPS_LOCATION` | Required site facts, paragraph 27(e)(vii) | Entered on the existing B1 site row. |
| `B1_EXPLICIT_COMPLIANCE_STATEMENT` | Required statement, paragraph 27(a) | Left read-only. Saved values do not create it. |
| `B4_PUBLIC_DISCLOSURE_URL` | Optional alternative under paragraph 34 | Entered and syntax-checked. A valid URL is not substantive completeness. |
| `B4_POLLUTANT_IDENTITY` | Conditional fact when direct reporting is selected | The undertaking's pollutant name. Official member QNames are not reproduced. |
| `B7_WASTE_RECYCLING_PERCENT_MASS`, `B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS` | Digital companions | Not entered. The legal proportion is `B7_WASTE_DIVERTED_PROPORTION`. |
| `B8_MULTI_COUNTRY_OPERATIONS`, `B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE` | Applicability and supporting country breakdown | Entered. `Company.country` is not copied onto every contract. |
| `B9_HOURS_WORKED_ORIGIN`, `B9_ACCIDENT_RATE_BASIS`, `B9_FATALITY_LEGAL_RESTRICTION` | Preparation inputs | Entered from the existing registry members. They are not new Annex I metrics. |
| `B10_MINIMUM_WAGE_DETERMINATION`, `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE`, `B10_GENDER_PAY_GAP_LEGAL_OBLIGATION` | Preparation plus the reported yes/no | Entered. Absence of a minimum is not a reported NO. |
| `B11_CONVICTIONS_AND_FINES_ASSESSMENT` | Event assessment | Entered. An empty assessment is not zero. |
| `B2_SUSTAINABILITY_ISSUES_ADDRESSED` | Conditional topic list | Still blocked. The Appendix B topic list is not in the registry. |

Priority followed that split. P0 and P1 controls were added. The two digital waste percentages were not given controls.

## 2. New scalar and structured controls

Closed enumerations use the registry member ids already accepted by VS-01. `fullMemberList` stays `NOT_REPRODUCED`. Empty member lists stay closed unless a structured contract is defined.

| Input | Stored value |
|---|---|
| Legal form | Trimmed text, at most 300 characters, as the enumeration member id. |
| NACE codes | Compact JSON array, order preserved, no duplicates, 1–40 codes. Pattern: division `01`–`99` except `00`, group `01.1`, or class `01.11`. Example: `["01.11","10.20"]`. |
| Site country and employment-contract country | ISO 3166-1 alpha-2. `UK` and `EU` are rejected. Display names come from `Intl.DisplayNames`. |
| Geolocation | One point, `latitude,longitude`, using the entered decimal tokens. Latitude −90..90. Longitude −180..180. |
| Public URL | The trimmed http or https string. Credentials, whitespace, and other protocols are rejected. The server does not fetch the URL. |
| Pollutant identity | The undertaking's name, at most 200 characters. It is not mapped to an XBRL member. |

NACE validation is structural. A well-formed code is not rewritten, and it is not checked against a full official code list. A polygon is rejected and is not converted into a point. An address is not geocoded.

## 3. Applicability assessment support

No second rule engine was added. The existing preparation enumerations are now editable and VS-01 continues to read them:

- B2 practice, policy, and initiative existence.
- B3 energy-breakdown availability.
- B4 pollutant reporting condition, method, and public-document flag.
- B5 biodiversity-sensitive site assessment.
- B6 significant water-consuming processes.
- B7 significant material flows.
- B8 multi-country operations.
- B10 gender pay-gap legal obligation.
- B11 conviction and fine events.

An empty value stays unassessed. It is not stored as the negative member. Annex I paragraph 15 is not rewritten by the editor. Where VS-01 withholds review readiness until an assessment is answered, that is the existing internal quality result.

## 4. B7 legal proportion

Paragraph 39(b) is one proportion: waste diverted to recycling or preparation for reuse. `B7_WASTE_DIVERTED_PROPORTION` is entered directly. The two mass percentages are digital facts. They are not added, and a percentage is not derived from a zero denominator. The B7 employee-size relief is unchanged.

## 5. B9 and B10 controls

B9 stores measured or estimated hours, the 200,000-hour or 1,000,000-hour basis, and the reported accident rate as separate values. The rate formula remains `NOT_IMPLEMENTED`. This phase does not calculate a rate.

`B9_FATALITY_LEGAL_RESTRICTION` records whether a restriction has been identified or is claimed to affect the disclosure. A claimed restriction is not a paragraph 22 omission and is not treated as established law. The control does not collect names, medical records, or personal identifiers.

B10 keeps the determination and the reported yes/no apart:

1. Statutory minimum wage.
2. Collectively agreed minimum remuneration.
3. No applicable minimum identified after assessment.
4. Determination unresolved.
5. Assessment not performed, which is an empty value.

A reported YES or NO is only the user's explicit choice. Several wage arrangements are not rolled up. The gender pay-gap obligation is legally required, assessed as not required, or unassessed. `Company.employeeCount` is not used. The pay-gap percentage stays a separate entered value.

## 6. Paragraph 22 omission workflow

The omission cell remains the authoritative record. Its value is the omitted datapoint id. Its dimension member is `22(a)`, `22(b)`, `22(c)`, or `22(d)`. The ordinary cell editor cannot write this group.

`saveOmissionClaim` is an explicit action. It records:

- the datapoint and paragraph 22 reason;
- whether the claimed grounds were assessed;
- whether the claim was reassessed for this reporting period;
- the authenticated user and timestamp when at least one confirmation is true.

The underlying protected information is not stored. There is no free-text field for it.

Status is derived, not stored:

| Grounds assessed | Reassessed for the period | Status |
|---|---|---|
| No | No | `DRAFT` |
| Yes | No | `REASSESSMENT_REQUIRED` |
| No | Yes | `INCOMPLETE` |
| Yes | Yes | `STRUCTURALLY_COMPLETE` |

`STRUCTURALLY_COMPLETE` is the state in which VS-01 can return omission status `VALID`. The editor and the diagnostic preview say that this is a structural record of the undertaking's attestation, not an independent legal approval. The status is not `LEGALLY_APPROVED`.

The repeating-value table could not hold the two confirmations, the user, or the timestamp. Four additive columns were added to `Vs2026RepeatingValue`. Existing cells default to unattested. The loader reads the stored booleans and no longer forces them to false. The B1 listing is that same record. Deleting the row removes it from the listing and from the evaluator input. A second claim for the same datapoint in the same period is rejected.

## 7. Autosave

Ordinary scalar and repeating-cell edits use the existing authenticated write services. The client waits 700 ms after the last change, then sends that field only. One request is in flight per field. A newer draft stays local until its own response arrives.

The visible states are unsaved changes, saving, saved, save failed, and conflict detected. Saved is shown after the server confirms the write. An invalid value is not marked saved. A failed response leaves the draft in the field. Leaving the page with an unresolved draft raises the browser's before-unload warning.

Option A, the employee-proportionality confirmation, omission attestations, row creation, and row deletion stay explicit.

## 8. Concurrency

`Vs2026RepeatingValue` already had `updatedAt`. `SustainabilityDataPoint` had only `createdAt`, which does not change on update, so it could not detect a stale scalar write. An additive `updatedAt` column was added. Existing scalar rows receive the migration timestamp. `createdAt` is unchanged.

Autosave sends the version it loaded. A mismatch returns `CONFLICT` and does not write. The draft remains. Replace stored value sends `overwrite: true` and is the explicit resolution. A response whose epoch is no longer the in-flight request is ignored.

A caller that omits `expectedUpdatedAt` still uses last-write-wins. That path is not conflict-safe. Autosave does not use it.

## 9. Authentication and tenant isolation

New and modified writes go through the existing editor gate: the `VS2026_EDITOR_ENABLED` flag, the Better Auth session, the organisation read from PostgreSQL, reporting-period ownership, the registry datapoint, and the authorised transaction. Client identity headers are not accepted. Omission claims from another organisation return `PERIOD_NOT_FOUND`. A disabled flag and an expired session do not write.

B1, B5, and B6 site ownership is unchanged. The three legacy cooperative identifiers stay unwritable. `schemaVersion` `2.0.0` is not the VS 2026 switch.

## 10. Browser verification

Browser verification was not completed. Port 3000 is held by an existing root `next-server` (pid 5018) that predates this editor. Its working directory is not readable, so it was not treated as this project's server and it was not stopped. A second `next dev` would share `.next`. No separate build directory was configured, and `next.config` was not changed. The server path was verified by the integration test, not by a browser session.

## 11. Tests

Local checks on 2026-11-27:

- `npx prisma validate`: valid.
- `npx prisma migrate deploy`: applied `20261127120000_vs05b2_omission_assessment` and `20261127121000_vs05b2_scalar_updated_at` to the local `librevs` database.
- VS 2026 suite: 146 passed, 0 failed. The previous baseline was 134.
- `lib/auth.security.test.ts`: 3 passed.
- Targeted ESLint on the changed VS 2026 files: 0 warnings.
- `npx tsc --noEmit --pretty false --incremental false`: the same 17 Deployment Manager errors. No new project errors.

The loader integration test no longer compares global row counts after rollback. Parallel security fixtures were able to change those counts. It now checks that its own rolled-back periods are gone.

There is no separate legacy API suite in this repository. This phase did not edit the JSON, XLSX, or PDF export implementations.

## 12. Functional coverage

112 registry definitions, each counted once:

| Coverage | Count |
|---|---|
| Editable scalar regulatory facts | 47 |
| Preparation inputs | 31 |
| Editable repeating facts | 21 |
| Editable dimensioned facts | 2 |
| Digital only | 3 |
| Legacy collision | 3 |
| Derived from the saved option | 1 |
| Calculated, not entered | 1 |
| Omission workflow, not an ordinary cell | 1 |
| Still without a control | 2 |

The two controls still absent are `B1_EXPLICIT_COMPLIANCE_STATEMENT` and `B2_SUSTAINABILITY_ISSUES_ADDRESSED`.

| Disclosure | Necessary legal input |
|---|---|
| B1 | Legal form, NACE codes, and site country and point coordinates can be entered. The compliance statement waits for report finalisation. Omission claims are structural records. |
| B2 | Existence conditions can be saved. The sustainability-issue topic list cannot be entered. The three cooperative guidance identifiers stay blocked by the legacy collision. |
| B3 | Energy members and gross emissions can be entered. The location-based total is not calculated. Scope 3 rows are stored; the evaluator still ignores that storage group. |
| B4 | The reporting condition, the public URL, the pollutant name, and the masses can be entered. The URL does not prove the document is complete. |
| B5 | Biodiversity-sensitive site conditions can be entered on the existing B1 site relationship. |
| B6 | Significant water-process assessments and the water amounts can be entered. |
| B7 | The paragraph 39(b) proportion can be entered. The two digital percentages and material volume are not entered. The employee-size relief remains. |
| B8 | Multi-country assessment and per-contract country codes can be entered. A blank country list is not treated as one country. |
| B9 | Hours origin, rate basis, the reported rate, and the legal-restriction assessment can be entered. The rate is not calculated. |
| B10 | Wage determination, explicit YES and NO, and pay-gap legal applicability can be entered. There is no multi-country rollup and no pay-gap formula. |
| B11 | Convictions only, fines only, both, neither after assessment, and unassessed are distinct. A conviction count does not require a fine. |

## 13. Remaining blockers for report generation

- The compliance statement and `complianceClaim` are not produced here.
- A structurally complete omission is not a legal opinion.
- `B2_SUSTAINABILITY_ISSUES_ADDRESSED` has no reproduced topic list.
- `B3_SCOPE1_SCOPE2_LOCATION_TOTAL` and the B9 accident rate are not calculated.
- The three digital B7 outputs are not entered.
- The three legacy cooperative identifiers are not VS 2026 facts.
- NACE checking is structural. Geolocation is a point. Pollutant identity is a name.
- The diagnostic preview is not a compliance assessment.
- The new registry is not yet the authority for the running Basic Module workflow. That cutover is VS-06.

## Appendix — definition inventory

### B1

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B1_MODULE_OPTION` | 27(a) | role:DERIVED_FROM_REPORTING_CONFIGURATION | ESSENTIAL | ALWAYS | None | DERIVED |
| `B1_EXPLICIT_COMPLIANCE_STATEMENT` | 27(a) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | BLOCKED_UNVERIFIED_CONTROL |
| `B1_OMITTED_DISCLOSURES` | 27(b) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_PARAGRAPH_22_OMISSION_IS_USED | None | DEFERRED_LEGAL_WORKFLOW |
| `B1_REPORTING_BASIS` | 27(c) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_LEGAL_FORM` | 27(e)(i) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_NACE_CODES` | 27(e)(ii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_BALANCE_SHEET_TOTAL` | 27(e)(iii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_TURNOVER` | 27(e)(iv) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_EMPLOYEES` | 27(e)(v) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_EMPLOYEE_COUNTING_METHODOLOGY` | 27(e)(v) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_COUNTRY_PRIMARY_OPERATIONS` | 27(e)(vi) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B1_SUSTAINABILITY_CERTIFICATIONS` | 28 | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_CERTIFICATION_OR_LABEL_OBTAINED | None | EDITABLE_SCALAR |
| `B1_SUBSIDIARY_NAME` | 27(d) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_REPORTING_BASIS_IS_CONSOLIDATED | None | EDITABLE_REPEATING |
| `B1_SUBSIDIARY_REGISTERED_ADDRESS` | 27(d) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_REPORTING_BASIS_IS_CONSOLIDATED | None | EDITABLE_REPEATING |
| `B1_SITE_IDENTIFIER` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |
| `B1_SITE_ADDRESS` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |
| `B1_SITE_POSTAL_CODE` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |
| `B1_SITE_CITY` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |
| `B1_SITE_COUNTRY` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |
| `B1_SITE_GPS_LOCATION` | 27(e)(vii) | role:REGULATORY_DATAPOINT | ESSENTIAL | ALWAYS | None | EDITABLE_REPEATING |

### B2

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B2_HAS_PRACTICES` | 29(a) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST | None | EDITABLE_SCALAR |
| `B2_HAS_POLICIES` | 29(b) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST | None | EDITABLE_SCALAR |
| `B2_PRACTICE_POLICY_OR_INITIATIVE_IS_PUBLIC` | 29(b) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_POLICIES_EXIST | None | EDITABLE_SCALAR |
| `B2_SEPARATE_ESG_POLICIES` | 29(b) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_POLICIES_EXIST | None | EDITABLE_SCALAR |
| `B2_HAS_FUTURE_INITIATIVES` | 29(c) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST | None | EDITABLE_SCALAR |
| `B2_POLICY_HAS_TARGET` | 29(d) | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_POLICIES_EXIST | None | EDITABLE_SCALAR |
| `B2_SUSTAINABILITY_ISSUES_ADDRESSED` | 30 | role:REGULATORY_DATAPOINT | IF_APPLICABLE | WHEN_PRACTICES_POLICIES_OR_INITIATIVES_EXIST | None | BLOCKED_UNVERIFIED_CONTROL |
| `B2_COOPERATIVE_DISCLOSURES_COOP_WORKER_USER_PARTICIPATION` | guidance-15(a) | role:PREPARATION_GUIDANCE | VOLUNTARY | GUIDANCE_OUTSIDE_ANNEX_I | None | BLOCKED_LEGACY_COLLISION |
| `B2_COOPERATIVE_DISCLOSURES_COOP_INVESTMENT_SOCIAL_ECONOMY` | guidance-15(b) | role:PREPARATION_GUIDANCE | VOLUNTARY | GUIDANCE_OUTSIDE_ANNEX_I | None | BLOCKED_LEGACY_COLLISION |
| `B2_COOPERATIVE_DISCLOSURES_COOP_PROFIT_DISTRIBUTION_LIMITS` | guidance-15(c) | role:PREPARATION_GUIDANCE | VOLUNTARY | GUIDANCE_OUTSIDE_ANNEX_I | None | BLOCKED_LEGACY_COLLISION |

### B3

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B3_TOTAL_ENERGY_CONSUMPTION_MWH` | 32 | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B3_ENERGY_BREAKDOWN_INFORMATION` | 32 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` | 32 | REGULATORY_FACT | IF_APPLICABLE | WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED | 10 or fewer: voluntary | EDITABLE_DIMENSIONED |
| `B3_ENERGY_CONSUMPTION_FROM_FUELS` | 32 | REGULATORY_FACT | IF_APPLICABLE | WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED | 10 or fewer: voluntary | EDITABLE_DIMENSIONED |
| `B3_SELF_GENERATED_ELECTRICITY_MWH` | 32 | SUPPLEMENTARY | VOLUNTARY | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B3_GROSS_SCOPE1_TCO2E` | 33(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B3_GROSS_SCOPE2_LOCATION_BASED_TCO2E` | 33(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B3_GROSS_SCOPE2_MARKET_BASED_TCO2E` | 33 | SUPPLEMENTARY | VOLUNTARY | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B3_SCOPE1_SCOPE2_LOCATION_TOTAL` | 33 | CALCULATED_FACT | VOLUNTARY | ALWAYS | 10 or fewer: voluntary | CALCULATED |
| `B3_GROSS_SCOPE3_TCO2E` | 49-52 | SUPPLEMENTARY | SECTOR_CONSIDERATION | ALWAYS | None | EDITABLE_SCALAR |
| `B3_SCOPE3_SIGNIFICANT_CATEGORIES` | 51 | SUPPLEMENTARY | IF_APPLICABLE | WHEN_SCOPE3_IS_DISCLOSED | None | EDITABLE_REPEATING |

### B4

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B4_REPORTING_CONDITION` | 34 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | PREPARATION_INPUT |
| `B4_DISCLOSURE_METHOD` | 34 | PREPARATION_DATA | IF_APPLICABLE | WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES | None | PREPARATION_INPUT |
| `B4_PUBLIC_DISCLOSURE_FLAG` | 34 | PREPARATION_DATA | IF_APPLICABLE | WHEN_POLLUTANT_REPORTING_CONDITION_APPLIES | None | PREPARATION_INPUT |
| `B4_PUBLIC_DISCLOSURE_URL` | 34 | REGULATORY_FACT | IF_APPLICABLE | WHEN_PUBLIC_DOCUMENT_REFERENCE_IS_SELECTED | None | EDITABLE_SCALAR |
| `B4_POLLUTANT_IDENTITY` | 34 | REGULATORY_FACT | IF_APPLICABLE | WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED | None | EDITABLE_REPEATING |
| `B4_EMISSION_TO_AIR` | 34 | REGULATORY_FACT | IF_APPLICABLE | WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED | None | EDITABLE_REPEATING |
| `B4_EMISSION_TO_WATER` | 34 | REGULATORY_FACT | IF_APPLICABLE | WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED | None | EDITABLE_REPEATING |
| `B4_EMISSION_TO_SOIL` | 34 | REGULATORY_FACT | IF_APPLICABLE | WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED | None | EDITABLE_REPEATING |
| `B4_POLLUTANT_REPORTING_BASIS` | 34 | PREPARATION_DATA | IF_APPLICABLE | WHEN_DIRECT_POLLUTANT_REPORTING_IS_SELECTED | None | PREPARATION_INPUT |

### B5

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B5_AREA_OF_INFLUENCE_DETERMINATION` | Appendix A | SUPPLEMENTARY | VOLUNTARY | WHEN_SITE_IS_OUTSIDE_AND_NOT_ADJACENT | None | EDITABLE_SCALAR |
| `B5_ASSESSED_SITE_REFERENCE` | 35 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | EDITABLE_REPEATING |
| `B5_SITE_BSA_ASSESSMENT` | 35 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | PREPARATION_INPUT |
| `B5_RELATIONSHIP_SITE_REFERENCE` | 35 | REGULATORY_FACT | IF_APPLICABLE | WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA | None | EDITABLE_REPEATING |
| `B5_BSA_NAME` | 35 | REGULATORY_FACT | IF_APPLICABLE | WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA | None | EDITABLE_REPEATING |
| `B5_BSA_RELATIONSHIP` | 35 | REGULATORY_FACT | IF_APPLICABLE | WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA | None | EDITABLE_REPEATING |
| `B5_RELATIONSHIP_BASIS` | 35 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SITE_IS_IN_OR_NEAR_BIODIVERSITY_SENSITIVE_AREA | None | PREPARATION_INPUT |

### B6

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B6_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES` | 37 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B6_TOTAL_WATER_WITHDRAWAL_M3` | 36 | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B6_PRODUCTION_PROCESS_WITHDRAWAL_M3` | 37 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B6_WATER_DISCHARGE_PRODUCTION_M3` | 37 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B6_WATER_CONSUMPTION_PRODUCTION_M3` | 37 | REGULATORY_FACT | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B6_WATER_CONSUMED_WATER_STRESS_M3` | 37 | REGULATORY_FACT | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B6_WATER_STRESS_SITE_REFERENCE` | 37 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | EDITABLE_REPEATING |
| `B6_WATER_STRESS_ASSESSMENT` | 37 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SIGNIFICANT_WATER_CONSUMPTION_PROCESSES_EXIST | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B6_WATER_STRESS_SITE_CONSUMPTION` | 37 | PREPARATION_DATA | IF_APPLICABLE | WHEN_SITE_IS_IN_WATER_STRESS | 10 or fewer: voluntary | PREPARATION_INPUT |

### B7

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B7_APPLIES_CIRCULAR_ECONOMY_PRINCIPLES` | 38 | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_CIRCULAR_ECONOMY_DESCRIPTION` | 38 | REGULATORY_FACT | IF_APPLICABLE | WHEN_CIRCULAR_ECONOMY_PRINCIPLES_ARE_APPLIED | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_WASTE_GENERATED_TOTAL_WEIGHT` | 39(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_WASTE_HAZARDOUS_MASS` | 39(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_WASTE_NON_HAZARDOUS_MASS` | 39(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_WASTE_DIVERTED_PROPORTION` | 39(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | EDITABLE_SCALAR |
| `B7_WASTE_RECYCLING_PERCENT_MASS` | 39(b) | DIGITAL_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | DIGITAL_ONLY |
| `B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS` | 39(b) | DIGITAL_FACT | ESSENTIAL | ALWAYS | 10 or fewer: voluntary | DIGITAL_ONLY |
| `B7_SIGNIFICANT_MATERIAL_FLOWS` | 39(c) | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | 10 or fewer: voluntary | PREPARATION_INPUT |
| `B7_MATERIAL_NAME` | 39(c) | REGULATORY_FACT | IF_APPLICABLE | WHEN_SIGNIFICANT_MATERIAL_FLOWS | 10 or fewer: voluntary | EDITABLE_REPEATING |
| `B7_MATERIAL_WEIGHT` | 39(c) | REGULATORY_FACT | IF_APPLICABLE | WHEN_SIGNIFICANT_MATERIAL_FLOWS | 10 or fewer: voluntary | EDITABLE_REPEATING |
| `B7_MATERIAL_VOLUME` | 39(c) | DIGITAL_FACT | IF_APPLICABLE | WHEN_SIGNIFICANT_MATERIAL_FLOWS | 10 or fewer: voluntary | DIGITAL_ONLY |

### B8

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B8_MEASUREMENT_BASIS` | 40 | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B8_EMPLOYEES_PERMANENT` | 40(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_EMPLOYEES_TEMPORARY` | 40(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_EMPLOYEES_MALE` | 40(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_EMPLOYEES_FEMALE` | 40(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_EMPLOYEES_OTHER_GENDER` | 40(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_EMPLOYEES_GENDER_NOT_REPORTED` | 40(b) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B8_MULTI_COUNTRY_OPERATIONS` | 40(c) | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | PREPARATION_INPUT |
| `B8_EMPLOYMENT_CONTRACT_COUNTRY_CODE` | 40(c) | PREPARATION_DATA | IF_APPLICABLE | WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY | None | PREPARATION_INPUT |
| `B8_EMPLOYEES_BY_COUNTRY` | 40(c) | REGULATORY_FACT | IF_APPLICABLE | WHEN_OPERATES_IN_MORE_THAN_ONE_COUNTRY | None | EDITABLE_REPEATING |

### B9

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B9_RECORDABLE_ACCIDENTS` | 41(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B9_HOURS_WORKED` | 41(a) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B9_HOURS_WORKED_ORIGIN` | 41(a) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B9_ACCIDENT_RATE_BASIS` | 41(a) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B9_RECORDABLE_ACCIDENT_RATE` | 41(a) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B9_FATALITY_LEGAL_RESTRICTION` | 41(b) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B9_FATALITIES_FROM_ACCIDENTS` | 41(b) | PREPARATION_DATA | ESSENTIAL | WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED | None | PREPARATION_INPUT |
| `B9_FATALITIES_FROM_ILL_HEALTH` | 41(b) | PREPARATION_DATA | ESSENTIAL | WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED | None | PREPARATION_INPUT |
| `B9_FATALITIES_ACCIDENTS_AND_ILL_HEALTH_SUM` | 41(b) | REGULATORY_FACT | ESSENTIAL | WHEN_FATALITY_DISCLOSURE_IS_NOT_LEGALLY_RESTRICTED | None | EDITABLE_SCALAR |

### B10

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B10_MINIMUM_WAGE_DETERMINATION` | 42(a) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE` | 42(a) | REGULATORY_FACT | ESSENTIAL | WHEN_APPLICABLE_MINIMUM_REMUNERATION_IS_IDENTIFIED | None | EDITABLE_SCALAR |
| `B10_GENDER_PAY_GAP_LEGAL_OBLIGATION` | 42(b) | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | PREPARATION_INPUT |
| `B10_GENDER_PAY_GAP_PERCENT` | 42(b) | REGULATORY_FACT | IF_APPLICABLE | WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED | None | EDITABLE_SCALAR |
| `B10_AVERAGE_FEMALE_REMUNERATION` | 42(b) | PREPARATION_DATA | IF_APPLICABLE | WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED | None | PREPARATION_INPUT |
| `B10_AVERAGE_MALE_REMUNERATION` | 42(b) | PREPARATION_DATA | IF_APPLICABLE | WHEN_GENDER_PAY_GAP_REPORTING_IS_LEGALLY_REQUIRED | None | PREPARATION_INPUT |
| `B10_COLLECTIVE_BARGAINING_COVERAGE_PERCENT` | 42(c) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B10_EMPLOYEES_COVERED_BY_COLLECTIVE_BARGAINING` | 42(c) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B10_COLLECTIVE_BARGAINING_DENOMINATOR` | 42(c) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B10_AVERAGE_TRAINING_HOURS_PER_EMPLOYEE` | 42(d) | REGULATORY_FACT | ESSENTIAL | ALWAYS | None | EDITABLE_SCALAR |
| `B10_TOTAL_TRAINING_HOURS` | 42(d) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |
| `B10_TRAINING_HEADCOUNT` | 42(d) | PREPARATION_DATA | ESSENTIAL | ALWAYS | None | PREPARATION_INPUT |

### B11

| Registry ID | Paragraph | Class | Requirement | Applicability | Employee-size relief | Coverage |
|---|---|---|---|---|---|---|
| `B11_CONVICTIONS_AND_FINES_ASSESSMENT` | 43 | PREPARATION_DATA | IF_APPLICABLE | ALWAYS | None | PREPARATION_INPUT |
| `B11_CONVICTIONS_COUNT` | 43 | REGULATORY_FACT | IF_APPLICABLE | WHEN_RELEVANT_CONVICTIONS_OCCURRED | None | EDITABLE_SCALAR |
| `B11_FINES_AMOUNT` | 43 | REGULATORY_FACT | IF_APPLICABLE | WHEN_RELEVANT_FINES_INCURRED | None | EDITABLE_SCALAR |
