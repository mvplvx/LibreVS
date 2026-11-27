# VS-05B.1 — Repeating and dimensioned data entry

Status: implemented. Date: 2026-11-27.

This editor extension stores repeating and dimensioned Basic Module values. It does not calculate emissions, convert units, approve paragraph 22 omissions, or assess compliance.

## 1. Supported repeating groups

| Disclosure | Group | Behaviour |
|---|---|---|
| B1 | `B1_SUBSIDIARY` | Many rows. Name and registered address. |
| B1 | `B1_SITE` | Many rows. Identifier, address, postal code, and city. Country and GPS stay unavailable. |
| B4 | `B4_POLLUTANT` | Many rows. Air, water, and soil mass, plus the reporting-basis preparation input. Pollutant identity stays unavailable. |
| B5 | `B5_SITE_ASSESSMENT` | Many rows. Each row selects one B1 site. |
| B5 | `B5_SITE_BSA_RELATIONSHIP` | Many rows. Each row selects one B1 site. |
| B6 | `B6_WATER_STRESS_SITE` | Many rows. Each row selects one B1 site. Consumption is stored in m3. |
| B7 | `B7_MATERIAL` | Many rows. Name and weight. Volume stays digital-only. |
| B8 | `B8_EMPLOYMENT_CONTRACT_COUNTRY` | Many rows. Workforce count. The country-code list is not reproduced, so that cell stays unavailable. |

B2, B9, B10, and B11 have no repeating groups in the registry.

`B1_OMITTED_DISCLOSURES` is repeating storage and is not editable. Stored rows are shown as unverified. The editor does not set `conditionsAssessed` or `reassessedForPeriod`.

Requirement type, applicability, and preparation status are left as they are in the registry. Saving a row does not make a conditional, voluntary, or supplementary group mandatory.

## 2. Supported dimensioned groups

| Group | Shape |
|---|---|
| `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` | One row per period. Members: Renewable energy, Non-renewable energy, Total. Unit MWh. |
| `B3_ENERGY_CONSUMPTION_FROM_FUELS` | One row per period. The same three origin members. Unit MWh. |
| `B3_SCOPE3_SIGNIFICANT_CATEGORIES` | One row per period. Each significant category is one cell. The category identity is the undertaking's own key, because the fifteen category names are not reproduced. Unit tCO2eq. |

The origin members are the registry's `ENERGY_ORIGIN` legal members. No XBRL member names were added.

`B3_TOTAL_ENERGY_CONSUMPTION_MWH` remains the separate scalar. Totals are not calculated from the members. A blank member stays missing. A stored zero stays zero.

`B3_ENERGY_BREAKDOWN_INFORMATION` remains the scalar preparation input. The energy section shows whether breakdown information can be obtained, cannot be obtained, or has not been assessed. `CANNOT_OBTAIN` does not delete stored members and does not require the missing ones. Unassessed does not hide stored values.

Scope 3 categories stay supplementary. The current evaluator still places `B3_SCOPE3_SIGNIFICANT_CATEGORIES` in `ignoredGroupIds` because that storage group is not one of the disclosure repeating groups. The editor stores the rows and the preview says the group was not evaluated. No second Scope 3 engine was added.

## 3. Authentication and authorization

Every mutation uses the VS-05A boundary:

- `VS2026_EDITOR_ENABLED` must be the exact string `true`.
- The signed-in user comes from the Better Auth session. Client identity headers are ignored.
- The user must be active and belong to an organisation.
- The reporting period must belong to that organisation.
- Option A must already be saved. Option B is not overwritten. An unconfigured period cannot receive repeating writes.
- The client sends a group id, a row id, a datapoint id, a parent id, a dimension member, and a value. It does not send a Prisma object or an organisation id.

A user in another organisation receives "not found" for the period, the row, and a site in a different period. A guessed row id is not found.

## 4. Row identity

`Vs2026RepeatingRow.id` is the identity. Creating a row allocates one id. Editing a cell, changing a site, and reordering keep that id. `position` is display order only. Deleting one row does not recreate the others.

Energy and Scope 3 use one canonical row per period. Their logical identities are the dimension members on that row, not extra row ids.

## 5. Parent-site integrity

B1 sites are the only site inventory. B5 and B6 rows store `parentRowId` and the matching site-reference cell. The user picks a site by its identifier, not by typing the row id.

`validateRepeatingParent` runs in the same transaction as the write. It requires the parent to exist in the same reporting period and to have group `B1_SITE`. A subsidiary is rejected. A site from another period is not found. Organisation ownership is checked through the reporting period.

## 6. Logical uniqueness

The existing unique cell key is `(rowId, datapointId, dimensionMember)`.

Electricity and fuels each allow one row. Creating the row again returns the existing id. A second row is refused when more than one is already stored. Each origin member is one cell. Saving the same member updates that cell.

Each Scope 3 category key is one cell on the single category row. Saving the same key updates that quantity. A second cell with the same key cannot be stored.

Ordinary groups may contain many rows. There is no fixed slot limit.

## 7. Transaction and concurrency

Period ownership, Option A, row ownership, parent validation, datapoint membership, value shape, and the write run in one transaction.

Singleton creation and dimensioned cell writes take a transaction-scoped PostgreSQL advisory lock on the reporting period and group. The lock is held before the existence check, so two concurrent creates of the electricity row produce one row. The same lock serialises category writes. The cell unique constraint remains the database backstop for two values of the same member on one row.

No migration was added. The schema still has no unique constraint across rows for `(reportingPeriodId, groupId)` or `(reportingPeriodId, groupId, dimensionMember)`. The advisory lock covers the singleton and category operations that the editor performs. A direct database insert that bypasses the editor can still create a second singleton row. The editor then refuses to add another and refuses to save into a group that already has more than one row.

A unique-constraint or foreign-key failure rolls the transaction back. It is not caught and then followed by more queries in the same transaction.

## 8. Supported input controls

Text, narrative, boolean, verified enumeration, and number. Enumeration controls require a verified, non-empty member list. The stored enumeration value is the member id.

Unavailable shapes, reported rather than given a substitute control:

- Country enumeration with an unreproduced member list (`B1_SITE_COUNTRY`).
- GPS location.
- Pollutant identity with an unreproduced member list.
- Country code with an unreproduced code list.
- Public URL and other unreproduced scalar controls already blocked in VS-05A.
- Digital-only facts, including material volume.

Site references are chosen with the site selector. They are not free-text fields.

## 9. Unit handling

Stored units are only the concrete registry units `MWh`, `tCO2eq`, and `m3`. Weight, volume, and pollutant mass are stored with a null unit and a note that no conversion is applied. No unit is invented and no value is converted.

## 10. Delete and clear

Clearing a cell deletes that `Vs2026RepeatingValue` row. The repeating row and its other cells remain. An empty input is not stored as a completed fact.

Deleting a row deletes that row. Its cells cascade. Other rows keep their ids.

Deleting a B1 site that still has B5 or B6 children is refused before the delete. The message is: "This site is referenced by other disclosures. Remove or update those references before deleting the site." The children remain. The database `ON DELETE NO ACTION` foreign key is unchanged. Constraint names are not shown.

Paragraph 22 rows cannot be created, edited, or deleted here.

## 11. Integration-test results

`repeatingWrite.integration.test.ts` rolls back one transaction that:

- requires Option A before a repeating write;
- creates six sites, six subsidiaries, nine pollutants, six materials, and six employment-country rows;
- edits values, clears one cell, and reorders subsidiaries without changing ids;
- keeps a reported zero distinct from a missing cell;
- rejects a subsidiary as a site parent and a site from another period;
- attaches two B5 assessments, one B5 relationship, and one B6 record to the same site;
- refuses deletion of that site and allows deletion of an unreferenced site;
- stores both energy carriers with three origin members, unit MWh, including renewable electricity zero;
- rejects an invalid or missing energy member;
- stores two Scope 3 categories and updates one without creating a second cell;
- refuses omission writes, unknown groups, unknown datapoints, and a datapoint from another group;
- reloads through `loadVS2026EvaluationInput`, `evaluateVS2026ReportingState`, and the diagnostic preview;
- leaves the scalar total-energy value unchanged.

A separate test commits two concurrent electricity creates and then deletes the fixture. One row remains.

`repeatingWrite.security.test.ts` uses real sessions and then deletes the fixture. It covers a valid write, no session, an expired session, an inactive user, forged identity headers, a foreign period, a foreign row, a foreign site parent, a guessed row id, a disabled editor flag, an unknown group, an unknown datapoint, and a cell from the wrong group.

## 12. Browser verification

Not completed. `http://localhost:3000/vsme/vs2026/edit/smoke-period` returned 404 from a Next.js process that was already running before this route existed. That process is not owned by this session, and a second development server would share the same build directory. The editor flag was not written into `.env`. Persistence was verified by the rolled-back integration test, including a reload through the editor view, the loader, the evaluator, and the preview.

## 13. Unresolved data-entry limitations

- Paragraph 22 remains a deferred legal workflow.
- Site country, GPS, pollutant identity, and employment-country codes have no verified member or code list.
- B8 can store a workforce count per row, but not a verified country code on that row.
- Pollutant mass has no verified unit, so the unit is left null.
- Scope 3 category rows are stored and are still reported as not evaluated.
- The breakdown condition is displayed. It does not drive a separate applicability assessment beyond the existing evaluator.
- Autosave is not implemented.
- Comprehensive C1–C9, XBRL, exports, and the runtime cutover are unchanged.

## Functional coverage

Each of the 112 B1–B11 definitions has one class. The 61 VS-05A scalar controls are unchanged: 43 are `EDITABLE_SCALAR` and 18 preparation scalars are `PREPARATION_INPUT`. Repeating preparation cells are also `PREPARATION_INPUT`, which is why that class totals 23.

| Class | Definitions |
|---|---|
| EDITABLE_SCALAR | 43 |
| PREPARATION_INPUT | 23 |
| EDITABLE_REPEATING | 18 |
| EDITABLE_DIMENSIONED | 2 |
| BLOCKED_UNVERIFIED_CONTROL | 17 |
| DIGITAL_ONLY | 3 |
| BLOCKED_LEGACY_COLLISION | 3 |
| DERIVED | 1 |
| CALCULATED | 1 |
| DEFERRED_LEGAL_WORKFLOW | 1 |

Directly editable means a definition the user can enter or that Option A derives. Counts below include preparation inputs. Derived `B1_MODULE_OPTION` is counted in B1's editable total because saving Option A sets it. Calculated and digital facts are not inputs.

| Disclosure | Definitions | Editable | Essential definitions without an input | Repeating structures | Remaining blockers |
|---|---|---|---|---|---|
| B1 | 20 | 14 | 5 | Subsidiaries and sites | Compliance statement, legal form, NACE codes, site country, GPS. Paragraph 22 is deferred and is not essential by itself. |
| B2 | 10 | 6 | 0 | None | Sustainability-issue list is unreproduced. Three cooperative identifiers remain legacy collisions. |
| B3 | 11 | 10 | 0 | Electricity, fuels, significant Scope 3 categories | Scope 1 and 2 location total stays calculated. Scope 3 categories are stored but not evaluated. |
| B4 | 9 | 7 | 0 | Pollutants | Pollutant identity and the public-document URL have no verified control. Mass is unconverted. |
| B5 | 7 | 7 | 0 | Site assessment and sensitive-area relationship | None for data entry. Applicability is still conditional. |
| B6 | 9 | 9 | 0 | Water-stress sites | None for data entry. Applicability is still conditional. |
| B7 | 12 | 9 | 2 | Materials | Recycling and preparation-for-reuse percentages are digital-only. Material volume is digital-only. |
| B8 | 10 | 8 | 0 | Employment-country rows | Multi-country enumeration and country codes are unreproduced. The count on a country row can be entered. |
| B9 | 9 | 6 | 3 | None | Hours-worked origin, accident-rate basis, and the fatality legal restriction have no verified control. |
| B10 | 12 | 9 | 2 | None | Minimum-wage determination and whether pay meets that wage have no verified control. The gender-pay legal-obligation control is also unreproduced. |
| B11 | 3 | 2 | 0 | None | The convictions-and-fines assessment control is unreproduced. |

These counts are an input inventory. They are not a completeness score and they are not a compliance assessment.

Essential definitions that still have no input path: `B1_EXPLICIT_COMPLIANCE_STATEMENT`, `B1_LEGAL_FORM`, `B1_NACE_CODES`, `B1_SITE_COUNTRY`, `B1_SITE_GPS_LOCATION`, `B7_WASTE_RECYCLING_PERCENT_MASS`, `B7_WASTE_PREPARATION_FOR_REUSE_PERCENT_MASS`, `B9_HOURS_WORKED_ORIGIN`, `B9_ACCIDENT_RATE_BASIS`, `B9_FATALITY_LEGAL_RESTRICTION`, `B10_MINIMUM_WAGE_DETERMINATION`, `B10_PAY_AT_OR_ABOVE_MINIMUM_WAGE`.
