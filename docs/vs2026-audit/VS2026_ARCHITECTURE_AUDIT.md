# LibreVS architecture audit for the VS 2026 cutover

Audit date: 25 November 2026. No application source, Prisma schema, or database data was modified.

The current product is a schema-driven VSME reporting application. Its legal content is the EFRAG VSME recommendation lineage (registry `templateVersion` 1.1.0, citations such as paragraph 24 for B1). Regulation (EU) 2026/1560 replaces that recommendation. Recital 5 says Recommendation (EU) 2025/1710 no longer produces legal effects.

LibreVS schema version `2.0.0` and the VS XBRL Taxonomy version `2.0.0` are different artefacts. They must not be treated as the same version.

## Current architecture

Reporting is driven by one registry:

- Schema: `lib/vsme/vsme.schema.ts` and `lib/vsme/sections/`
- Field identity: `lib/vsme/vsme.fieldRegistry.ts`
- Version constant: `lib/vsme/schemaVersion.ts`
- Count verified by loading the registry: **264 fields, 215 in module B, 49 in module C**

| Section | Fields |
| --- | ---: |
| B1 | 61 |
| B2 | 33 |
| B3 | 26 |
| B4 | 34 |
| B5 | 7 |
| B6 | 4 |
| B7 | 20 |
| B8 | 17 |
| B9 | 4 |
| B10 | 7 |
| B11 | 2 |
| C1 | 4 |
| C2 | 2 |
| C3 | 10 |
| C4 | 5 |
| C5 | 3 |
| C6 | 9 |
| C7 | 8 |
| C8 | 7 |
| C9 | 1 |

Each field is a `number`, `string`, or `boolean`. Identity is `{section}_{subsection}_{name}` in uppercase. Repeating facts are fixed slots: 5 subsidiaries, 5 sites, 8 pollutants, 5 materials, 5 employment countries.

The UI (`components/vsme/`, `app/vsme/page.tsx`) renders `buildVsmeUiSchema()`. Saves go through React Query (`components/vsme/queries/useSaveVsmeField.ts`) to `SustainabilityDataPoint` rows keyed by `(reportingPeriodId, fieldId)`. Exports are JSON, XLSX and PDF (`lib/export/`, `lib/vsme/export/`). Docker Compose and the Deployment Manager run the app and Postgres. They do not contain regulatory rules.

## Current regulatory model

The model is employee-gated and materiality-gated.

- Module B is always in scope.
- Module C is mandatory at `employeeCount >= 500` (`lib/vsme/moduleScope.ts`, `COMPREHENSIVE_EMPLOYEE_THRESHOLD`). `COMPREHENSIVE_EMPLOYEE_MAX` is 1000 and is not the legal applicability test.
- `Company.employeeCount` is one integer. It is not a reporting-period average, and it is not distinguished from headcount or FTE.
- A field is required when its module is in scope and its materiality is `material`. Missing materiality defaults to material (`lib/vsme/materiality.ts`). `non_material` removes the field from completion and from export selection.
- There is no `if applicable` condition, no 10-employee proportionality flag, no paragraph 22 omission list, and no Annex II membership.
- Knowledge Hub linkage is one URL for every paragraph: the 30 July 2025 VSME recommendation interactive page (`lib/vsme/efragReference.ts`).
- Excel and XBRL names are the VSME Digital Template 1.1.0 named ranges. Only 36 of those names match a non-abstract VS 2.0.0 fact exactly.

## What is legally wrong

Verified against Annex I of Regulation (EU) 2026/1560 and Directive (EU) 2026/470.

1. **The Comprehensive module is not mandatory at 500 employees.** Paragraphs 6, 7, 25 and 27: the undertaking chooses Option A (Basic only) or Option B (Basic and Comprehensive). Basic is a prerequisite for Comprehensive. A chosen module is applied in full, except items that are not applicable. The 500 threshold has no support in the regulation.

2. **Field-level materiality is not an omission right.** Paragraph 22 allows omission of seriously prejudicial commercial information, trade secrets, classified information, and certain legally protected information. Each omitted datapoint must be identified under B1 paragraph 27(b), and the omission is reassessed each period. Paragraph 15 says an omitted if-applicable item is assumed not applicable. Users can today mark an essential datapoint non-material and drop it from the export.

3. **Ten employees is a proportionality rule, not a micro-undertaking definition.** Square-bracket text makes specified essential datapoints voluntary for undertakings with 10 employees or fewer. That category is not the Accounting Directive micro-undertaking test.

4. **The value chain cap is Annex II, for a defined request.** Article 3: the cap is only the Annex II datapoints. Directive 2026/470: a protected undertaking has no more than an average of 1 000 employees in the preceding financial year and is in the value chain of a reporting undertaking. The cap applies to information requested for sustainability reporting under the Accounting Directive. It does not cap due diligence, risk management, or a voluntary report the undertaking chooses to publish. Annex II membership must not be derived from module, essential status, or taxonomy membership.

5. **Several metrics changed.** GHG intensity is gone. Land-area biodiversity metrics are gone. Training hours are one average, not four gender averages. Fatalities are one sum of accidents and ill health. Employee turnover is C5 paragraph 58, not B8. Water stress is consumption, not withdrawal. Waste diversion is a proportion, split in the taxonomy between recycling and preparation for reuse. EU climate-benchmark exclusion is gone. C8 uses the prohibited-weapons industry and NACE Division 20.2 for chemicals. B1 requires an explicit compliance statement.

6. **Comparatives and unchanged datapoints are not modelled.** Paragraph 14 requires prior-year comparatives from the second year, except metrics disclosed for the first time. Paragraph 18 allows a reference back when a datapoint is unchanged.

## Digital model gap

The VS taxonomy date 2026-10-16 (package `2.0.0+2026-11-03.gha-31`) has:

- 392 elements, 123 non-abstract facts after excluding domain members, 14 enumerations
- Namespace `https://xbrl.efrag.org/taxonomy/vs/2026-10-16/vs`
- Period type `duration` on every element that declares one
- Typed axes for sites, subsidiaries, materials and other pollutants
- Explicit dimensions for energy breakdown, waste type, pollutant type, gender, contract, and country of employment
- Enumeration sets for NACE, legal form, omitted disclosures, sustainability issues, human-rights policy content, and incident types

LibreVS stores those as independent scalars and fixed slots. That loses open-list length, controlled pollutant codes, and the distinction between a fact and a dimension member. Calculated taxonomy totals (Scope 1 + Scope 2, waste totals, material totals) are mixed with entered values or absent.

Two taxonomy reference defects are recorded rather than silently corrected: the water-stress concept has an empty paragraph, and an "other pollutant to soil" concept is referenced to B6 paragraph 37.

## Component classification

| Component | Class | Why |
| --- | --- | --- |
| Next.js App Router, React Query, autosave, reporting periods | KEEP | Independent of the legal text |
| Prisma models for organisation, user, company, period, datapoint value | KEEP | A string value per field still works for the pilot |
| `ReportingPeriod.schemaVersion` | MODIFY | Keep the column. Stop storing the VSME registry version `2.0.0` as if it were the VS taxonomy version |
| Docker Compose, Deployment Manager, health checks | KEEP | No regulatory logic |
| JSON, XLSX and PDF export pipeline | MODIFY | Keep the renderers. Replace selection rules and named ranges |
| `lib/vsme/sections/*` field catalogue | REPLACE | Content is the 2025 recommendation, including removed metrics |
| `lib/vsme/moduleScope.ts`, `applicability.ts`, `materiality.ts` | REPLACE | 500-employee mandate and materiality-as-omission |
| `lib/vsme/efragReference.ts` | REPLACE | Single outdated recommendation URL |
| `lib/vsme/migration/*`, `legacyFieldIds.ts` | REMOVE later | v1-to-v2 VSME migration. The local database has no legacy migration status |
| Fixed slot helpers in `schemaHelpers.ts` | REPLACE | Open lists need a repeating group, not five hard-coded copies |
| XBRL generation | not present | Do not add it in the first pilot |
| Field-level materiality UI | REMOVE later | Replace with if-applicable state and paragraph 22 omissions |
| `VsmeFieldMateriality` rows | INVESTIGATE | 26 local rows. Disposable. Do not delete until the replacement omission model exists |

## Local data

Read-only inventory of the running `librevs-db` container on 25 November 2026:

| Table | Rows |
| --- | ---: |
| Organization | 1 |
| User | 1 |
| Company | 3 |
| ReportingPeriod | 5, all `draft`, all schema `2.0.0` |
| SustainabilityDataPoint | 38, no migration status |
| VsmeFieldMateriality | 26 |
| VsmeExportSnapshot | 0 |
| VsmeFeedback | 0 |

Companies are `LibreVS Demo Company` (120 employees, SEK), `Nordic SME Pilot (<500)` (120, EUR) and `Growth Corp Pilot (≥500)` (650, EUR). The names exist to exercise the 500-employee rule. This is disposable development data. No reset was performed.

## Changes that are not justified

- A second reporting engine for VSME 2025
- A standard selector
- A general multi-standard platform
- Rewriting Next.js, Prisma, Docker, or the Deployment Manager because the legal text changed
- Generating XBRL in the first implementation slice
- Inventing Knowledge Hub URLs by concatenating paragraph numbers
- Treating Annex II as the maximum dataset for every export

## Verification of this audit

| Check | Result |
| --- | --- |
| Registry load | VERIFIED, 264 / 215 / 49 |
| Taxonomy package hash | VERIFIED, see the source manifest |
| Annex I disclosure text | VERIFIED from the Official Journal extraction |
| Annex II, all 23 rows and both employee columns | VERIFIED from the EUR-Lex HTML of CELEX 32026R1560 on 25 November 2026 |
| VS Digital Template 2.0.0 | VERIFIED, SHA-256 `6de5209bb247317b5632332396f2787e4ad533b7ff15c5e6ae958eaa4b9dcdab` |
| Explanatory note, 4 November 2026 | VERIFIED, SHA-256 `f02da8dff73cda8bfe43010b8ad10e92809f6debb6cde83e2e05a2513ab01e6f` |
| Official Journal PDF file hash | BLOCKED, WAF empty body. The HTML rendering was readable. |
| Host `tsc --noEmit` after `prisma generate` | Application code compiled. Root project fails on `deployment/ui/*` path aliases (`@deployment/*`), 17 errors. The root `tsconfig.json` includes those files and excludes only `node_modules`. |
| ESLint | 18 errors and 746 warnings. 735 warnings are in `deployment/dist/assets/index-BiZtJoUC.js`. The other issues are in existing app, hook, and script files. Not introduced by this audit. |
| Contract test `scripts/vsme-contract-test.ts` | Registry and UI-schema checks passed. Export check stopped with HTTP 503 because readiness is red. |
| Running app | `GET /api/librevs/version` returned 0.8.0-rc1, schema 2.0.0, production. Readiness blockers include dynamic `import("@/lib/vsme/...")` failures inside the container and populated required fields. |
| Container `tsc` | BLOCKED, the production image has no `tsconfig.json` |
| Host production rebuild | Not re-run. The container already serves a production build of this revision. |
| Database | Read-only counts only. Not reset. |

## Phase 1B correction

The first audit classified every existing field as MODIFY, REMOVE, or UNVERIFIED, and KEEP was 0. That mixed a new Knowledge Hub URL with a change to the legal obligation. Phase 1B splits the two.

Of the 264 existing fields:

| Regulatory result | Fields |
| --- | ---: |
| Unchanged obligation, technical metadata or structure only | 105 |
| Regulatory change, excluding removals | 149 |
| Removed | 10 |

The 12 proposed additions are separate rows. They are not part of the 264.

Primary regulatory classes for the 264: unchanged 105, merged 63, applicability change 48, requirement change 13, scope change 12, removed 10, unit change 9, split 2, moved 1, text change 1. Nine further rows have applicability change as a second class because they are also voluntary for undertakings with 10 employees or fewer. These primary classes sum to 264.

The earlier spoken breakdown of 132 logic changes, 63 merges, 42 citation updates, 8 unit changes, 4 scope changes, 2 splits and 1 move sums to 252 because it mixed two cuts. The class column on all 276 matrix rows was 132 logic, 63 merged, 44 text, 12 new, 10 remove, 8 unit, 4 scope, 2 split and 1 moved. The summary then excluded 10 removals and 17 unverified rows from MODIFY, leaving 237. The “42 citation updates” were the 44 text-class rows minus the 2 unverified text rows. The 132 logic count still included 15 unverified rows. No field had two values in the old class column. The totals disagreed because the sentence combined the full logic count with the MODIFY-only citation count.

Every existing field still needs a technical Knowledge Hub and citation update. That technical change does not make the regulatory class MODIFY.

Granularity is not 1:1. LibreVS has 264 registry fields. The taxonomy parse found 392 elements and 123 non-abstract item facts, excluding domain members. One concept plus `ReportingScopesAxis` is three facts: current, baseline year, and target year. Energy rows add renewable and non-renewable members. Sites, subsidiaries, pollutants, materials and employment countries are fixed slots in LibreVS and open or typed ranges in the template. Field count is not a reason to delete a disclosure.

The B5 role titled land-use remains in `vs-all.xsd` and has no presentation arcs. It does not preserve the deleted land-area metrics.
