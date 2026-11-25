# VS 2026 data persistence design

Design only. `prisma/schema.prisma` was not changed. The recommendation is the smallest store that can hold the B1–B11 registry without a second regulatory database.

## Decision

Keep scalar facts in `SustainabilityDataPoint`. Add two tables for open repeating groups. Keep the reporting option on `ReportingPeriod`. Keep the reporting currency on `Company.currency`. Do not add a column per datapoint, an XBRL store, or an event log.

`SustainabilityDataPoint` today:

- Unique `(reportingPeriodId, fieldId)`.
- `value` is a required string. `unit` is optional.
- No row identity, no parent, no organisation column of its own.
- The period belongs to one company, and the company may belong to one organisation.

That unique key can store one text, number, enumeration member, percentage, or monetary amount per datapoint per period. It cannot store a second site, pollutant, material, or country under the same field id. INT-1 in the integrity review.

Missing data is the absence of a row. A reported zero is the string `0`. Autosave must not write an empty string for an untouched field, because an empty string would look like a present value. Unassessed enumerations are also the absence of a row, not the member `NO`.

## Scalar facts

| Shape | Storage |
| --- | --- |
| Text and narrative | `value` string. Field id is the registry id |
| Number, percentage, hours average, count | `value` as a canonical decimal string. No thousands separator. `unit` when the registry names one (`m3`, `MWh`, `tCO2eq`, `PERCENT`, `HOURS_PER_EMPLOYEE`) |
| Enumeration | `value` is the member id (`YES`, `HEADCOUNT`, `OPTION_A`). Absence means unassessed |
| Boolean taxonomy facts that the registry models as YES/NO | Store `YES` or `NO`. Do not store `false` for a blank minimum-wage answer |
| Monetary amount | `value` is the amount in `Company.currency`. Do not store a second currency on the row |
| Paragraph 22 list | Repeating references. Each omitted datapoint id is one child value, not one comma-joined string |
| GPS | One string on `B1_SITE_GPS_LOCATION`, the existing single fact. Not two columns |

`B1_MODULE_OPTION` is not a writable row. Readers derive it from `ReportingPeriod.vs2026ReportingOption`. A row with that field id must be rejected so the period cannot hold two options.

## Repeating-fact model

One pair of tables covers subsidiaries, sites, pollutants, biodiversity assessments, biodiversity relationships, water-stress sites, materials, and employment-contract countries.

```prisma
model Vs2026RepeatingRow {
  id                String   @id @default(cuid())
  reportingPeriodId String
  reportingPeriod   ReportingPeriod @relation(fields: [reportingPeriodId], references: [id], onDelete: Cascade)
  groupId           String
  parentRowId       String?
  parentRow         Vs2026RepeatingRow? @relation("RepeatingParent", fields: [parentRowId], references: [id])
  childRows         Vs2026RepeatingRow[] @relation("RepeatingParent")
  position          Int
  createdAt         DateTime @default(now())
  values            Vs2026RepeatingValue[]

  @@index([reportingPeriodId, groupId])
  @@index([parentRowId])
}

model Vs2026RepeatingValue {
  id           String @id @default(cuid())
  rowId        String
  row          Vs2026RepeatingRow @relation(fields: [rowId], references: [id], onDelete: Cascade)
  datapointId  String
  value        String
  unit         String?
  createdAt    DateTime @default(now())

  @@unique([rowId, datapointId])
}
```

`groupId` is the registry group id (`B1_SITE`, `B7_MATERIAL`, and the others). `datapointId` is the component id. Cardinality is zero or more. There is no maximum. `position` is display order only.

Row identity is `Vs2026RepeatingRow.id`. Site references in B5 and B6 store that id. They do not copy the site name into a second inventory. Deleting a site row fails while a reference remains, or the delete is refused until those references are removed. Prefer refusal. Do not cascade a site delete into biodiversity or water facts.

`parentRowId` is for a biodiversity relationship or a water-stress row that must name a site. The referenced row's `groupId` must be `B1_SITE` and its `reportingPeriodId` must be the same period. A subsidiary, pollutant, material, or country row has a null parent.

Organisation isolation follows the existing period check: load the period only when `company.organizationId` matches the caller. The new tables have no organisation column. Every query starts from a period that has already passed that check. The same rule already protects `saveReportingConfiguration`.

Deletion of a draft row deletes its values by the cascade. Export snapshots already freeze a JSON copy, so draft cell history does not need a soft delete.

## Autosave

The current coordinator saves one `(fieldId, value, unit)` and skips fields that are not material. That call remains for scalar registry ids.

Repeating edits add an optional `rowId`. The coordinator debounces per `(fieldId, rowId)`. Creating a row is a separate request that returns the id before the first cell is saved. A save for an unknown row id or a row in another period is rejected. Empty string still means "do not persist", not zero.

`non_material` must not decide whether a VS 2026 cell can be saved. Until the cutover, these tables stay unused by the workspace, so the current coordinator is left unchanged.

## What stays where it is

| Existing store | VS 2026 use |
| --- | --- |
| `ReportingPeriod.vs2026ReportingOption` | Authoritative Option A or B. Null stays unconfigured |
| `ReportingPeriod.vs2026AdditionalComprehensiveDisclosures` | Paragraph 25 selections. Not a second option |
| `Company.currency` | Reporting currency. Default EUR is the company setting, not a hardcoded fact unit |
| `Company.employeeCount` | Retained company attribute. Not the size measure and not module selection |
| `VsmeFieldMateriality` | Left in place until paragraph 22 has its own rows. It is not read as an omission after cutover |
| `VsmeExportSnapshot` | Retained. A later snapshot JSON includes scalar rows and repeating rows. Old snapshots stay readable |
| `ReportingPeriod.schemaVersion` | Stays the application label `2.0.0`. It does not select this registry |

Employee-size input for `VS2026_EMPLOYEE_PROPORTIONALITY` is one scalar row, for example field id `VS2026_EMPLOYEE_PROPORTIONALITY`, value the explicit measure, on the period. It is not `B1_EMPLOYEES` and not `Company.employeeCount`. Absence of that row means the size category is not provided. Relief is then not applied and not denied; completion stays blocked on the size input where a disclosure has relief.

Paragraph 22 needs one repeating group of omitted datapoint ids plus a reason code `22(a)` through `22(d)` on each row. That uses the same repeating tables. It is not a materiality flag.

## Data integrity rules for writers

- Reject a field id that is not in the B1–B11 registry, except the explicit employee-size measure.
- Reject a second currency.
- Reject `B1_MODULE_OPTION` as a stored value.
- Reject a repeating datapoint id on `SustainabilityDataPoint`.
- Reject a scalar datapoint id on `Vs2026RepeatingValue`.
- Reject a site reference whose row is not `B1_SITE` in the same period.
- Do not convert headcount and full-time equivalents on write.
- Do not add waste percentages, water quantities, or training hours on write. Those formulas stay unimplemented.
