# VS-03.1 Evaluation Input Integration

Date: 2026-11-25

Status: the employee-proportionality measure and the B3 electricity and fuel dimensions now reach VS-01. The loader and evaluator stay off the running workspace, routes, autosave, completeness, and exports. No Prisma schema or migration change.

## 1. Employee proportionality persistence

The measure is one `SustainabilityDataPoint` row:

| Column | Value |
|---|---|
| `reportingPeriodId` | The period being loaded |
| `fieldId` | `VS2026_EMPLOYEE_PROPORTIONALITY` |
| `value` | Decimal string of the explicit measure |

The existing unique key `(reportingPeriodId, fieldId)` keeps one measure per period. No new table was added. The row is an internal regulatory control. It is listed in `excludedFieldIds` and is not copied into `EvaluationInput.facts`.

The loader reads only rows for the requested period. A measure stored on another period is not visible to that load. `Company.employeeCount`, `B1_EMPLOYEES`, B8 headcount, B8 FTE, and other workforce breakdowns are not read as this measure.

## 2. Measurement-basis handling

The field id is the measure kind. `classifyEmployeeSize` remains the only classifier. A valid stored number is passed as:

```text
{ status: "MEASURED", reportingPeriodId, employeeMeasure, measureKind: "VS2026_EMPLOYEE_PROPORTIONALITY" }
```

There is no second basis column. The domain contract does not require one. A direct evaluation input whose `measureKind` is blank or any other string is rejected as `MEASURE_NOT_EXPLICIT`. The loader never invents a kind.

The loader does not verify that the writer collected this number for the proportionality test. Storing another workforce quantity under this field id would be accepted as a number. That source check remains a writer and workflow responsibility.

## 3. Loader changes

`mapPersistedReportingSnapshot` now builds `employeeSize` from the measure row:

| Stored value | Evaluation input |
|---|---|
| No row | `NOT_PROVIDED` |
| Non-negative decimal, including 0, 10, and values above 10 | `MEASURED` with that number |
| Negative decimal | `MEASURED` with that number; VS-01 records `NEGATIVE_EMPLOYEE_MEASURE` |
| Non-numeric or empty text | `MEASURED` with a non-finite number; VS-01 records `NON_FINITE_EMPLOYEE_MEASURE` |
| Two rows with the same field id in one snapshot | `DUPLICATE_EMPLOYEE_MEASURE`; the load fails |

Electricity and fuel cells are no longer copied into `repeatingRows`. Each accepted cell becomes one `FactInput` with `datapointId`, `dimensionMember`, `presence`, and `unit` when a unit was stored. `loaded.rows` still keeps the physical row, member, value, and unit.

A stored unit must be the registry reported unit `MWh` when a unit is present. A missing unit is kept as no recorded unit. `kWh` and any other unit fail the load as `MALFORMED_VALUE`. No conversion factor is applied.

Unknown `ENERGY_ORIGIN` members, a repeated member on one row, and a second electricity or fuels row in the period still fail the load. Scope 3 category rows and paragraph 22 rows stay on `repeatingRows`. Their group ids can still appear in `ignoredGroupIds`.

## 4. Evaluation input changes

`FactInput` gained optional `dimensionMember` and `unit`.

`DatapointEvaluation` gained:

- `dimensionMember`: the energy-origin member, or `null` for every other fact
- `recordedUnit`: the stored unit, or `null`

A fact with an empty member stays a scalar fact. A dimensioned quantity supplied without a member is ignored. A member that is not one of the registry `ENERGY_ORIGIN` legal members is ignored and reported as `datapointId:member` in `ignoredFactIds`.

Results are ordered by datapoint id, dimension member, then row id.

## 5. Dimensional identity

For `B3_ENERGY_CONSUMPTION_FROM_ELECTRICITY` and `B3_ENERGY_CONSUMPTION_FROM_FUELS`, the carrier is the datapoint id. The varying axis is `ENERGY_ORIGIN`. The legal members used are the registry strings:

- `Renewable energy`
- `Non-renewable energy`
- `Total`

These are internal registry members. They are not XBRL member QNames. The non-renewable taxonomy member remains unresolved in the registry and was not invented here.

The evaluator emits one result per legal member. Lookup is datapoint id plus member. Two facts with the same identity are not merged: both are dropped, the value status is `INVALID`, and the reason is `DUPLICATE_LOGICAL_FACT`. An electricity member cannot replace a fuel member. A missing member stays missing. A stored zero stays `REPORTED_ZERO`.

`ENERGY_CARRIER` is already represented by the two datapoint ids. The evaluator does not create a second carrier axis or every taxonomy combination.

## 6. B3 energy conditionality

Applicability is unchanged: `WHEN_ENERGY_BREAKDOWN_INFORMATION_CAN_BE_OBTAINED`.

| `B3_ENERGY_BREAKDOWN_INFORMATION` | Electricity and fuel members | `B3_TOTAL_ENERGY_CONSUMPTION_MWH` |
|---|---|---|
| `CAN_OBTAIN` | Each of the three origin members is evaluated | Independent fact |
| `CANNOT_OBTAIN` | `NOT_APPLICABLE` | Still required, subject to employee-size relief |
| Absent | `BLOCKED_UNASSESSED` | Still evaluated on its own rule |

A present breakdown value does not fill the total. Renewable plus non-renewable is not written into `Total`. Electricity is not reconciled with fuels. No emission factor or unit conversion is applied.

When the breakdown can be obtained, a missing origin member is an outstanding cell. The registry statement names all three members, so this phase treats those three as the expected cells. It does not mark the breakdown complete from a subset.

## 7. Validation rules

Employee size:

- classification stays in `classifyEmployeeSize`
- `<= 10`, including 0 and 10, is `EMPLOYEES_LE_10`
- above 10 is `EMPLOYEES_GT_10`
- a missing measure stays unresolved and does not make a relieved datapoint mandatory
- a rejected measure stays unresolved and does not make a relieved datapoint mandatory
- B8 and B10 quantities are not rewritten from this measure
- the measure does not select Option A or Option B

Energy:

- member must be an `ENERGY_ORIGIN` legal member
- unit, when stored, must be `MWh`
- one logical cell per datapoint and member
- one electricity row and one fuels row per period

Paragraph 22 claims are still stored with `reassessedForPeriod: false` and `conditionsAssessed: false`. No applicability assessment is synthesized from a missing preparation value.

## 8. Integration tests

The database test uses the existing rolled-back transaction. It does not reset the development database.

One period has Option A, no proportionality row, and a company workforce figure of 650. Its category stays null.

A second period on the same company stores the explicit measure `8`, `B1_EMPLOYEES` `600`, scalar total energy, `CAN_OBTAIN`, electricity and fuel members, one B1 site, and a B6 water row whose parent is that site. The load of the first period still has no category. The load of the second period classifies `EMPLOYEES_LE_10`, keeps the scalar total, keeps renewable electricity distinct from a missing non-renewable cell, keeps a fuel zero distinct from a missing fuel total, and derives the B6 site reference from the B1 site id. The energy group ids are not ignored.

## 9. Known limitations

- The loader cannot prove the stored measure was collected for this control. The field id is the only basis the current scalar row can carry.
- Scope 3 significant-category rows are still outside dimensional evaluation. Their group id can remain in `ignoredGroupIds`.
- A stored omission still cannot become a valid paragraph 22 omission. The two evidence flags are not persisted.
- There is still no explicit applicability-assessment table. An absent preparation datapoint stays unassessed.
- The `Total` energy-origin member is a recorded cell. It is not calculated, and it is not `B3_TOTAL_ENERGY_CONSUMPTION_MWH`.
- The non-renewable XBRL member QName remains unresolved. This phase does not assign one.

## 10. Remaining runtime integration

VS-01 and the loader are still not imported by the workspace, reporting APIs, autosave, completeness, module scope, materiality, or JSON, XLSX, and PDF exports. Production reporting behaviour is unchanged.

The next step is a read-only runtime view that calls the loader and evaluator for an authenticated period and shows the result, without replacing the current completeness judgement or the current exports.
