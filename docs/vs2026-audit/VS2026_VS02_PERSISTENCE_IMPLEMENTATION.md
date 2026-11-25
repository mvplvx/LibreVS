# VS-02 Persistence Implementation

Date: 2026-11-25

Status: VS-02.1 composite parent foreign key is in the unapplied migration. The migration has not been applied to the development database.

This phase adds two Prisma models and one additive migration. The running workspace, APIs, autosave, completeness, applicability, exports, materiality, and the VS-01 evaluator do not read or write these tables.

Scalar facts remain on `SustainabilityDataPoint`. The reporting option remains on `ReportingPeriod.vs2026ReportingOption` and `ReportingPeriod.vs2026AdditionalComprehensiveDisclosures`. Currency remains on `Company.currency`.

## Models

`Vs2026RepeatingRow` is one stable repeating-data row. Its `id` is a cuid and is the identity. `position` is display order only. Reordering or editing values updates the same row.

`Vs2026RepeatingValue` is one cell on that row. `value` is a required string, using the same stored-string convention as `SustainabilityDataPoint.value`. `unit` is optional. `dimensionMember` is a required string. The empty string is the canonical member for a fact that has no dimension.

A missing cell is the absence of a `Vs2026RepeatingValue` row. The string `"0"` is a reported zero. The string `"false"` is a reported false. Writers must not insert a row for an untouched field, and must not treat a missing row as zero.

## Constraints

| Constraint | Behaviour |
|---|---|
| `Vs2026RepeatingRow.id` primary key | Stable row identity |
| `reportingPeriodId` foreign key, `ON DELETE CASCADE` | A row belongs to one reporting period. Deleting the period deletes its repeating rows |
| Unique `(id, reportingPeriodId)` | Target of the parent foreign key |
| Parent foreign key `(parentRowId, reportingPeriodId)` → `(id, reportingPeriodId)`, `ON DELETE NO ACTION` | The parent row must exist in the same reporting period. A null `parentRowId` stores no parent. Deleting a referenced row is rejected (`P2003` on `Vs2026RepeatingRow_parentRowId_reportingPeriodId_fkey`) |
| Value `rowId` foreign key, `ON DELETE CASCADE` | Deleting an unreferenced row deletes its cells |
| Unique `(rowId, datapointId, dimensionMember)` | Two cells on the same row, datapoint, and dimension member are rejected (`P2002`) |
| Index `(reportingPeriodId, groupId, position)` | Period, group, and order lookups |
| Index `(parentRowId)` | Site-reference lookups |

`dimensionMember` is `NOT NULL DEFAULT ''`. A nullable dimension would let PostgreSQL store two rows that both have `NULL` and would therefore not collide. The empty string is one canonical "no dimension" member, so the unique index covers that case.

There is no unique constraint on `position`. Two rows may be swapped without changing their ids.

There is no database enum of group ids or datapoint ids. The registry remains the catalogue.

## What the database enforces, and what it does not

PostgreSQL enforces these parent-reference guarantees through `Vs2026RepeatingRow_parentRowId_reportingPeriodId_fkey`:

- The parent row exists.
- The parent row's `reportingPeriodId` equals the child row's `reportingPeriodId`.
- A missing parent is represented by `parentRowId` null. PostgreSQL `MATCH SIMPLE` does not check the foreign key when `parentRowId` is null.
- A site in another organisation belongs to another reporting period, so a child in this period cannot name it.

PostgreSQL does not enforce these guarantees:

- The parent `groupId` is `B1_SITE`. A same-period subsidiary can be stored as a parent.
- Only `B5_SITE_ASSESSMENT`, `B5_SITE_BSA_RELATIONSHIP`, and `B6_WATER_STRESS_SITE` may have a parent.
- The datapoint id belongs to the row's group.

`validateRepeatingParent` rejects a missing parent on a site-referencing group (`PARENT_REQUIRED`), a parent whose group is not `B1_SITE` (`PARENT_NOT_SITE`), a parent on any other group (`PARENT_NOT_ALLOWED`), and a parent from another period (`PARENT_PERIOD_MISMATCH`). The period mismatch is also rejected by the foreign key. Writers must call `validateRepeatingParent` and `validateRepeatingCell` in the same database transaction as the insert. `validateRepeatingCell` rejects an unknown id (`UNKNOWN_DATAPOINT`), a scalar datapoint (`SCALAR_DATAPOINT`), and a datapoint whose storage group differs from the row's `groupId` (`GROUP_MISMATCH`). This phase does not mount those checks on a route.

Organisation isolation is not a column on the new tables. A row is reachable only through its reporting period, and a period is reachable only through `company.organizationId`. The future query predicate is the same one used by reporting configuration:

```text
reportingPeriod.findFirst({
  where: { id: reportingPeriodId, company: { organizationId } }
})
```

Row and value reads then filter by that `reportingPeriodId`. A guessed row id, without that organisation predicate, is not an authorized lookup. The client-supplied organisation id still has to come from the existing authenticated boundary.

## Deletion

| Action | Result |
|---|---|
| Add a row | New cuid. Position is independent of the id |
| Edit a cell or change `position` | Same row id |
| Remove one cell | Delete that `Vs2026RepeatingValue`. Other cells stay |
| Delete a row that has no children | The row and its cells are deleted |
| Delete a `B1_SITE` row that is still named by `parentRowId` | Rejected. `ON DELETE NO ACTION` does not remove the B5 or B6 rows |
| Delete a reporting period that has repeating rows, including referenced sites | The period cascade removes the period's rows. PostgreSQL `NO ACTION` allows the same statement to remove the referencing rows and the site together. This was observed inside a rolled-back transaction |
| Delete a reporting period that still has `SustainabilityDataPoint` rows | Still rejected by the existing `ON DELETE RESTRICT` on `SustainabilityDataPoint`. This phase does not change that foreign key |

A future service that removes a site must delete or detach the B5 and B6 rows that name it, then delete the site. It must not delete and recreate the site to refresh its values or its position.

Deleting a period that still has scalar datapoints remains a separate existing restriction. The service should remove those scalar rows through the existing period-deletion path before relying on the repeating-row cascade.

## Repeating groups

Open registry groups have `cardinality: ZERO_OR_MORE` and `maximum: null`. Each instance is one `Vs2026RepeatingRow`. There is no fixed slot count.

| Disclosure | Storage `groupId` | Row contents |
|---|---|---|
| B1 subsidiaries | `B1_SUBSIDIARY` | `B1_SUBSIDIARY_NAME`, `B1_SUBSIDIARY_REGISTERED_ADDRESS`. `parentRowId` is null |
| B1 sites | `B1_SITE` | Identifier, address, postal code, city, country, GPS. The row `id` is the site identity |
| B4 pollutants | `B4_POLLUTANT` | `B4_POLLUTANT_IDENTITY` is the pollutant member. Air, water, and soil amounts are `B4_EMISSION_TO_AIR`, `B4_EMISSION_TO_WATER`, and `B4_EMISSION_TO_SOIL` on the same row, with `dimensionMember` empty. The reporting basis is `B4_POLLUTANT_REPORTING_BASIS` |
| B5 site assessment | `B5_SITE_ASSESSMENT` | `parentRowId` is the B1 site row id |
| B5 site-to-area relationships | `B5_SITE_BSA_RELATIONSHIP` | `parentRowId` is the same B1 site row id. Area name, relationship, and basis are cells |
| B6 water-stressed sites | `B6_WATER_STRESS_SITE` | `parentRowId` is the same B1 site row id |
| B7 material flows | `B7_MATERIAL` | Name, weight, volume |
| B8 countries of employment contract | `B8_EMPLOYMENT_CONTRACT_COUNTRY` | Country code and employee count cells |

B5 and B6 do not create a second site inventory. The site cell may also store the parent id as a reference value, but the structural reference is `parentRowId`.

These shapes have no `Vs2026RepeatingGroup` in the registry. `repeatingStorageGroupId` uses the datapoint id as the storage group id:

| Fact | Storage `groupId` | How the members stay distinct |
|---|---|---|
| `B3_SCOPE3_SIGNIFICANT_CATEGORIES` | that datapoint id | One row per significant category. `dimensionMember` holds the application category key. The quantity is `value`. A category with no row is missing, not zero. Category names are not reproduced from the registry, and this phase does not invent GHG Protocol member names |
| `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` and `B3_ENERGY_CONSUMPTION_FROM_FUELS` | the datapoint id | Electricity and fuels are already different datapoints (`ENERGY_CARRIER`). `dimensionMember` is one of the registry's `ENERGY_ORIGIN` legal strings: `Renewable energy`, `Non-renewable energy`, `Total`. The unique key keeps those three facts apart. No XBRL member QName is stored |
| `B1_OMITTED_DISCLOSURES` | that datapoint id | One row per omitted datapoint. `value` is the omitted datapoint id. `dimensionMember` is the paragraph 22 reason point |

Workforce contract and gender counts, and waste hazardous and non-hazardous weights, remain separate scalar datapoint ids on `SustainabilityDataPoint`. They are not dimensions of one repeating row.

`SustainabilityDataPoint` unique `(reportingPeriodId, fieldId)` cannot hold the three energy-origin members. That is why those dimensioned facts use the repeating tables even though the registry does not declare a repeating group for them.

## Tenant predicate for VS-03

```text
const period = await db.reportingPeriod.findFirst({
  where: { id: reportingPeriodId, company: { organizationId } },
});
const rows = await db.vs2026RepeatingRow.findMany({
  where: { reportingPeriodId: period.id },
  orderBy: [{ groupId: "asc" }, { position: "asc" }],
  include: { values: true },
});
```

`organizationId` must already have been resolved by the existing authentication boundary. The composite foreign key rejects a parent from another period. `validateRepeatingParent` must still reject a same-period parent that is not a `B1_SITE` row, inside the write transaction.

## Migration

File: `prisma/migrations/20261125160000_vs2026_repeating_data/migration.sql`

The SQL creates the two tables, two lookup indexes, the `(id, reportingPeriodId)` unique index, the value unique index, and three foreign keys. The parent foreign key is composite. It does not alter `ReportingPeriod`, `SustainabilityDataPoint`, materiality, companies, or employee counts, and it does not modify the applied Phase 2C migration. It has not been applied. `_prisma_migrations` has no row for this name. After the rolled-back integration test, `to_regclass('"Vs2026RepeatingRow"')` is null.

## VS-03 ingestion rules

These rules are not implemented. The future loader must apply them before it builds `EvaluationInput`.

### One canonical row per period and dimensional context

`@@unique([rowId, datapointId, dimensionMember])` distinguishes cells on one row. A second row in the same period can store the same datapoint and dimension member. These storage groups are the ones that must not do that:

| Storage `groupId` | Canonical shape | Dimensional context |
|---|---|---|
| `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` | One row per reporting period | `ENERGY_ORIGIN` member on the cell: `Renewable energy`, `Non-renewable energy`, or `Total` |
| `B3_ENERGY_CONSUMPTION_FROM_FUELS` | One row per reporting period | The same `ENERGY_ORIGIN` members |
| `B3_SCOPE3_SIGNIFICANT_CATEGORIES` | One row per category in the period | The category key stored as `dimensionMember` |
| `B1_OMITTED_DISCLOSURES` | One row per omitted datapoint in the period | The omitted datapoint id stored as `value`, with the paragraph 22 point as `dimensionMember` |

Open groups stay many rows per period: `B1_SUBSIDIARY`, `B1_SITE`, `B4_POLLUTANT`, `B5_SITE_ASSESSMENT`, `B5_SITE_BSA_RELATIONSHIP`, `B6_WATER_STRESS_SITE`, `B7_MATERIAL`, and `B8_EMPLOYMENT_CONTRACT_COUNTRY`.

The smallest check is a query in the same transaction as the write. For the two energy groups, reject a second row with the same `reportingPeriodId` and `groupId`. For Scope 3, reject a second cell in that period with the same category `dimensionMember`. For paragraph 22, reject a second cell in that period whose `value` repeats the omitted datapoint id. No additional table is required. The writer updates the existing row instead of inserting another one.

### Paragraph 22 omission data

A repeating row can store the omitted datapoint id and one legal reason point. VS-01 `OmissionClaimInput` also requires `reassessedForPeriod` and `conditionsAssessed`. Neither flag is a column. The evaluator also treats an omission as listed only when a `B1_OMITTED_DISCLOSURES` fact is present with a `REFERENCES` literal containing that datapoint id. A stored reason and datapoint id do not contain that fact, and they do not record that the omission was reassessed or that its conditions were assessed.

The loader must not set `reassessedForPeriod` or `conditionsAssessed` to true from the repeating row. It must not invent a `REFERENCES` fact and present it as a verified paragraph 27(b) list. Until those inputs are persisted on their own, a stored omission remains incomplete. VS-01 classifies an incomplete claim as `UNVERIFIED` or `INVALID`, not as `VALID`.

## Verification boundary

The integration test executes the migration SQL inside `prisma.$transaction` and throws before commit. It does not insert a `_prisma_migrations` row and does not call `migrate deploy`, `db push`, or `migrate reset`.

Expected constraint failures are wrapped in savepoints because a failed statement aborts the surrounding PostgreSQL transaction. Prisma logs those expected failures. The transaction still rolls back.
