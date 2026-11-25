# VS 2026 implementation blueprint

Phase 1B corrected the audit. This plan is the smallest sequence after that correction. It is not a multi-standard platform and it does not include a legacy-user migration engine.

## What each layer is for

**Required for regulatory correctness**

- Separate types for requirement, applicability, employee category, Annex II membership, protected-undertaking context, request purpose, and output inclusion.
- Employee category `EMPLOYEES_LE_10` or `EMPLOYEES_GT_10`, validated on its own. It is not a micro-undertaking label and it is not the 1 000-employee average.
- The 23 verified Annex II rows, with the employee column stored as data.
- Option A means Basic Module disclosures B1 to B11, including if-applicable items only when the condition applies. Option B means that set plus the Comprehensive Module in its entirety. Paragraph 25 allows extra Comprehensive disclosures after B1 to B11 without turning the report into Option B.
- If-applicable state is one of applicable, not applicable, or not yet assessed. A blank essential value is missing. A paragraph 22 omission is a separate valid omission, with a reason, a B1 paragraph 27(b) entry, and a new assessment for that reporting period.
- Paragraph 53 target components stay. Scope 3 significant categories stay. Market-based Scope 2 stays voluntary. Self-generated electricity stays as a template breakdown row.

**Required for reliable digital mapping**

- Dimensional facts: one employee-count concept with a methodology member; greenhouse-gas concepts with current, baseline-year and target-year members; energy rows with renewable and non-renewable members.
- Repeating rows for sites, subsidiaries, pollutants, materials and countries of employment. The template uses open ranges, including 100 site rows.
- VS Digital Template 2.0.0 named ranges, not template 1.1.0.
- The waste and NACE supporting packages, which are not yet hashed.
- Knowledge Hub links only where `publish_knowledge_hub_url` is `YES`. Otherwise the Annex I citation and `http://data.europa.eu/eli/reg_del/2026/1560/oj`.

**Required before a pilot release**

- The regulatory-correctness items above, switched on so the running report no longer uses the 500-employee gate or materiality as an omission.
- B1 states the selected option and cannot state Option B for a partial Comprehensive set.
- Annex II flags are available to decide a value-chain request. Full request workflow can wait.
- Comparative display from the second reporting year: read the prior period’s values for the same datapoints. Paragraph 14. No comparison product beyond that.
- XBRL generation is not required for the pilot.

**Optional later**

- XBRL or iXBRL generation, the converter’s prior-year upload, PDF merging, and the template’s percentage-reduction display.
- GPS lookup, the full pollutant and waste catalogues, and workbook-identical export.
- A user-data migrator. This installation has no production reporting history.

## Order of work

### Phase A — sources pinned in the manifest

Done for the template, the explanatory note, and the taxonomy package. Still open: the Official Journal PDF checksum, `waste-2026-09-01.zip`, and `nace-2026-05-01.zip`. Those three do not block the regulatory-core commit.

### Phase B — regulatory core, runtime unchanged

Add the modules and tests. Do not import them from validation, the registry, or the UI in this phase.

| File | Change |
| --- | --- |
| `lib/vsme/vs2026/types.ts` | Requirement type, applicability state, employee category, Annex II membership, protected-undertaking context, request purpose, output inclusion. Separate fields. No single status enum. |
| `lib/vsme/vs2026/employeeSize.ts` | Validate `EMPLOYEES_LE_10` and `EMPLOYEES_GT_10`. Reject a classification that was inferred from `Company.employeeCount`, from 500, or from the 1 000 average. |
| `lib/vsme/vs2026/annexII.ts` | The 23 rows from `vs2026-annex-ii-mapping.csv`, including the verified Comprehensive columns. Membership is data, not a function of module or requirement type. |
| `lib/vsme/vs2026/employeeSize.test.ts` | Category validation. |
| `lib/vsme/vs2026/annexII.test.ts` | 23 rows; nine included for 10 employees or fewer; all 23 included for more than 10; the eight Comprehensive rows excluded for 10 or fewer. |

Leave `moduleScope.ts`, `materiality.ts`, `lib/vsme/sections/`, Prisma, the UI, exports, Docker, and the Deployment Manager unchanged. The running report keeps its current behaviour until a later phase switches to this core.

### Phase C — stop the two illegal gates (P0)

| File | Change |
| --- | --- |
| `lib/vsme/moduleScope.ts` | Delete the rule that Comprehensive is mandatory at 500 employees. Module choice comes from B1 Option A or Option B. Basic remains a prerequisite for Comprehensive. |
| `lib/vsme/applicability.ts` | Completion uses requirement type, if-applicable state, and the 10-employee rule. |
| `lib/vsme/materiality.ts` | Stop treating `non_material` as permission to omit an essential datapoint. |
| `lib/vsme/schemaHelpers.ts` | Stop writing `if_employee_count_gt_500` onto every C section. |
| `components/vsme/fieldMaterialityState.ts` and the materiality controls in the workspace | Remove the control that marks a datapoint non-material. |
| `lib/vsme/exportMapping.ts` | Export selection follows the same applicability rules. Add a separate output context for "included in this export" and, later, "requested under the value chain cap". |

`Company.employeeCount` may remain a stored integer for the pilot only if the UI labels it as the reported workforce figure and the 10-employee rule is an explicit category, not a silent comparison. The 1 000-employee protected-undertaking test is request context, not a field on the company that hides disclosures.

### Phase D — replace registry content (P1)

Edit `lib/vsme/sections/` in disclosure order B1 through C9. Use `docs/vs2026-audit/vs2026-migration-matrix.csv` as the work list.

Do in one disclosure at a time:

- Renumber citations to Annex I of Regulation 2026/1560.
- Apply `REMOVE` rows only after the replacement field exists: GHG intensity, land area, feedstock energy, the "not required to report pollution" boolean, and EU benchmark exclusion.
- Add the `NEW` regulatory fields: explicit compliance statement, biodiversity-sensitive area name, single training-hour average, fatality sum, waste proportions, C2 target description, fossil-fuel total, unchanged-datapoint reference.
- Move turnover from B8 to C5.
- Relabel C8 chemicals as NACE Division 20.2 and prohibited weapons as prohibited weapons.
- Set `employee_size_rule` from the square-bracket list, not from module membership.

Keep internal IDs stable where the matrix says the proposed ID replaces a single field. Do not use EFRAG concept names as IDs.

Update `lib/vsme/efragReference.ts` so the stored legal paragraph does not depend on a URL. Show a Knowledge Hub link only when `vs2026-knowledgehub-mapping.csv` marks that exact URL verified. Until then, show the paragraph with no link.

Bump the registry version to a new LibreVS schema version. Do not reuse `2.0.0`.

### Phase E — repeating groups (P1 for sites and subsidiaries, P2 for full taxonomy parity)

The unique key `(reportingPeriodId, fieldId)` cannot store an open list without synthetic IDs.

Smallest schema change that is actually required:

- A child table for repeating rows (site, subsidiary, pollutant, material, employment country) with a stable row key and a field key.
- Keep `SustainabilityDataPoint` for scalar facts.

Do not add this table until Phase D has named the repeating fields. Sites and subsidiaries are P1 because paragraph 27 requires the list, and five slots will silently drop the sixth. Pollutant codes and NACE enumerations are P2.

No migration of the 38 local datapoints is required. They are demo rows. After backup, a development database reset is preferable to a v1-style migrator. Historical code stays in Git.

### Phase F — calculations and validation (P1 where the law states the method, P2 otherwise)

| Rule | Treatment |
| --- | --- |
| Water consumption = withdrawal minus discharge from production processes | P1, paragraph 37 |
| Waste proportions | P1 inputs; do not invent a denominator beyond "proportion of waste generated" |
| Accident rate | Collect the reported rate. Do not calculate it (Q10) |
| Scope 1 + Scope 2 totals | P2, taxonomy calculation |
| Energy renewable / non-renewable breakdown | P1 if the undertaking can obtain it; not an Annex II item |
| Reporting currency | Use `Company.currency`. Remove hard-coded EUR on monetary fields |

### Phase G — exports (P1 filter, P2 template)

Keep `lib/export/xlsxExporter.ts`, `pdfExporter.ts`, and the snapshot tables. Change the row filter in `lib/export/exportMapping.ts` and `lib/vsme/validateEfragExport.ts`.

Named ranges from template 1.1.0 are not VS 2.0.0 ranges. XLSX export for the pilot can be a LibreVS workbook. Compatibility with the EFRAG workbook is P2 and waits on the hashed 2.0.0 template. XBRL generation is not part of the pilot.

### Phase H — delete superseded code (after Phase D is in place)

Candidates, only once nothing imports them:

- `lib/vsme/migration/`
- `lib/vsme/legacyFieldIds.ts`
- `scripts/migrate-vsme-v1-to-v2.ts`
- `COMPREHENSIVE_EMPLOYEE_THRESHOLD` and the 500-employee copy in the UI
- Materiality API routes and `VsmeFieldMateriality` once paragraph 22 omissions have a store
- GHG intensity, land-use, feedstock, benchmark-exclusion and per-gender training fields

## Rules the core has to be able to express

These are specified now so Phase B’s types cover them. They are not implemented in the running app in Phase B.

Comparative information, Annex I paragraph 14: from the second reporting year, metrics carry the previous year’s value, except a metric disclosed for the first time. The template has no comparative column. The explanatory note paragraph 103 puts comparatives in the converter by uploading last year’s file. LibreVS already stores reporting periods. The minimum structure is a read of the previous period’s stored values. Paragraph 18, the list of disclosures that are unchanged, is a separate boolean, list, and link. It is not the comparative figure.

Module completeness, paragraphs 6, 7, 24, 25 and 27: paragraph 24 requires B1 to B11. Paragraph 7 says Basic is a prerequisite for Comprehensive. Paragraph 27 says the selected module is complied with in its entirety, except an if-applicable item that is not applicable. Paragraph 25 allows selected Comprehensive disclosures after B1 to B11. Those extras do not satisfy Option B and must not be labelled as Option B.

If-applicable, paragraph 15: the legal text says that omitting an if-applicable item is assumed to mean it is not applicable. The application model still stores applicable, not applicable, and not yet assessed, so a blank essential field is not given that assumption. Missing means the item is applicable, or essential, and has no value. A paragraph 22 omission is not stored as not applicable.

Sensitive omissions, paragraph 22 and B1 paragraph 27(b): each omitted datapoint has a reason in 22(a) to 22(d), the report lists it under paragraph 27(b), and the omission is reassessed at each reporting date. A new period does not inherit the previous omission.

## First implementation assignment

The next code phase is Phase B only.

Create:

- `lib/vsme/vs2026/types.ts`
- `lib/vsme/vs2026/employeeSize.ts`
- `lib/vsme/vs2026/annexII.ts`
- `lib/vsme/vs2026/employeeSize.test.ts`
- `lib/vsme/vs2026/annexII.test.ts`

Seed Annex II from `docs/vs2026-audit/vs2026-annex-ii-mapping.csv`. The Comprehensive employee flags are verified: not included at 10 employees or fewer, included above 10.

Do not edit:

- `prisma/schema.prisma` or database migrations
- `lib/vsme/sections/`
- `lib/vsme/moduleScope.ts`
- `lib/vsme/materiality.ts`
- UI, API routes, exports, Docker, or the Deployment Manager

Phase C is the following prompt, after the new modules and their tests pass and the running registry is still the current 264-field registry.

## Cutover of the development database

When Phase D is ready:

1. Affected data: 3 demo companies, 5 draft periods, 38 datapoints, 26 materiality rows, 0 snapshots. Volume name `librevs_pgdata`.
2. Backup: `docker exec librevs-db pg_dump -U librevs librevs` to a file outside the container.
3. Procedure: reset the development database and run a new VS 2026 seed. Do not write a VSME 2025 row migrator.
4. Impact: local demo figures for the 500-employee scenario are discarded.
5. Verification: registry count matches the matrix; Option A does not require C; an essential field cannot be dropped as non-material; Annex II flags match the CSV; a ≤10 category does not require the bracketed B3 energy total.
6. Rollback: restore the dump. The old code remains on the previous Git revision.

## Baseline checks (25 November 2026)

`npm ci --ignore-scripts` and `prisma generate` were run so the typecheck could see dependencies. No application source was edited.

- `tsc --noEmit`: application sources compiled. The root config also typechecks `deployment/ui`, which fails on `@deployment/*` aliases (17 errors).
- ESLint: 18 errors, 746 warnings. 735 warnings are the built Deployment Manager bundle.
- `scripts/vsme-contract-test.ts` against `http://localhost:3000`: 264-field registry passed. Export assertion failed with HTTP 503, readiness red. The readiness route reports that `import("@/lib/vsme/exportMapping")` and four sibling specifiers fail inside the container, and that populated required fields still block export.
- `GET /api/librevs/version`: 0.8.0-rc1, schema 2.0.0.
- A second production build was not started. The running container is already that build.

These failures are baseline defects. They were not fixed in this audit.
