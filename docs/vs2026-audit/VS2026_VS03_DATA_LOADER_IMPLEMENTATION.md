# VS-03 Reporting Data Loader

Date: 2026-11-25

Status: the approved repeating-data migration is applied to the local development database. The loader is internal and is not mounted on a route.

## Migration

Target: PostgreSQL database `librevs` at `localhost:5432`. `NODE_ENV`, `APP_ENV`, and `VERCEL_ENV` were unset. The host is not a remote provider.

Before `prisma migrate deploy`, 14 migrations were applied, including `20261125140000_vs2026_reporting_configuration`. The only pending migration was `20261125160000_vs2026_repeating_data`.

A plain SQL dump was written to `/home/mvp/Hämtningar/librevs-backups/librevs-before-vs2026-repeating-20261125.sql` (26,330 bytes). It did not replace an existing file.

`npx prisma migrate deploy` applied that migration. Status afterwards: database schema is up to date. No other migration was applied.

| Count | Before | After |
|---|---:|---:|
| Companies | 3 | 3 |
| Reporting periods | 5 | 5 |
| Sustainability datapoints | 38 | 38 |
| Materiality rows | 26 | 26 |
| Export snapshots | 0 | 0 |
| Repeating rows | — | 0 |
| Repeating values | — | 0 |

`Vs2026RepeatingRow` and `Vs2026RepeatingValue` exist. The composite foreign key is `Vs2026RepeatingRow_parentRowId_reportingPeriodId_fkey`. The unique indexes `Vs2026RepeatingRow_id_reportingPeriodId_key` and `Vs2026RepeatingValue_rowId_datapointId_dimensionMember_key` exist, with the period/group/position and parent indexes.

## Loader

`loadVS2026EvaluationInput({ reportingPeriodId, organizationId }, db)` reads one period and returns a result union:

- success, with an `EvaluationInput` plus the ordered repeating rows
- `MISSING_ORGANIZATION`
- `PERIOD_NOT_FOUND`
- `STORED_CONFIGURATION_INVALID`
- `PERSISTED_DATA_INVALID`, with issue codes and no stored values
- `DATABASE_FAILURE`, with no thrown detail

A Prisma client read runs in one transaction. A caller that already holds a transaction passes that client, so the read sees the same snapshot.

Ownership is `reportingPeriod.findFirst({ where: { id, company: { organizationId } } })` through `getReportingConfiguration`. Rows and values are then filtered by that period id. There is no row-id lookup.

## Mapping

The saved option is copied from `getReportingConfiguration`. Null stays `NOT_CONFIGURED`. Additional Comprehensive disclosure ids are preserved. `B1_MODULE_OPTION` is not written to `SustainabilityDataPoint`. A stored scalar with that id is ignored when it equals the saved option. A different stored value fails the load as `LEGACY_CONFIGURATION_CONFLICT`. The evaluator derives the option from the configuration.

VS-03 left `employeeSize` as `{ status: "NOT_PROVIDED" }`. VS-03.1 reads a sustainability datapoint whose field id is `VS2026_EMPLOYEE_PROPORTIONALITY` as that measure. The field is still excluded from disclosure facts. `Company.employeeCount`, `B1_EMPLOYEES`, and B8 counts are not the measure. See `VS2026_VS031_EVALUATION_INPUT_INTEGRATION.md`.

Scalar facts are sustainability datapoints whose field id is a registry datapoint and whose storage group is null. Other field ids are returned in `excludedFieldIds` and are not facts. A repeating datapoint stored as a scalar fails the load. No record stays missing. `"0"` becomes a numeric zero. `"false"` becomes boolean false. An empty string becomes `EMPTY`. A value that does not match the registry kind fails as `MALFORMED_VALUE`.

Repeating rows are ordered by group, position, and id. Cells are ordered by datapoint, dimension member, and id. `loaded.rows` keeps the row id, parent id, position, dimension member, and unit. VS-03 passed electricity and fuel rows through `repeatingRows`, and VS-01 reported those group ids in `ignoredGroupIds`. VS-03.1 passes each energy-origin cell once as a dimensioned fact. Scope 3 category rows and omission rows can still appear in `ignoredGroupIds`.

For B5 and B6, `parentRowId` is the B1 site id. When the site-reference cell is absent, the evaluation cell is filled from that parent id. A stored site-reference cell that names a different id fails as `SITE_REFERENCE_CONFLICT`.

## Validation

`validateRepeatingParent` and `validateRepeatingCell` supply the parent and cell rules. The loader adds:

- unknown storage group
- parent id that is not in the same loaded period
- a second electricity or fuels row in the period
- a repeated Scope 3 category key
- a repeated omitted datapoint id
- an energy dimension outside the registry's `ENERGY_ORIGIN` members
- a paragraph 22 reason outside `22(a)`–`22(d)`

Any issue returns `PERSISTED_DATA_INVALID`. The loader does not choose one of the duplicates.

## Omissions and applicability

Each omission row becomes an `OmissionClaimInput` with `reassessedForPeriod: false` and `conditionsAssessed: false`. The stored ids are also passed as one `B1_OMITTED_DISCLOSURES` reference list so VS-01 can see the list. It does not set either flag to true, so the claim stays `UNVERIFIED` when the reason is one of the four legal points. Reassessment, condition assessment, and any further substantiation are not stored.

No `applicabilityAssessments` are synthesized. Preparation and condition datapoints are loaded only when a sustainability datapoint with that registry id exists. A missing condition stays unassessed. There is no separate assessment table.

## Tests

`npx prisma validate` passed and `npx prisma generate` completed. The VS 2026 suite passed 99 tests. ESLint on `lib/vsme/vs2026` reported no warnings. Typecheck reports the existing 17 Deployment Manager alias errors and no errors in the loader.

## Unresolved gaps

VS-03.1 closed the employee-measure gap and the electricity/fuel dimension gap. The notes below are the remaining VS-03 limits.

Scope 3 category rows remain on `loaded.rows`. Their group id can still appear in `ignoredGroupIds`. This phase does not add a Scope 3 member catalogue.

Paragraph 22 reassessment and condition assessment are not stored. A stored omission cannot become a valid omission.

There is no table of explicit applicability assessments. A missing preparation datapoint stays unassessed.

## Runtime boundary

The loader is not imported by the workspace, APIs, autosave, completeness, module scope, materiality, or exports.
