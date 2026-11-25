# VS 2026 runtime cutover plan

The running application keeps the VSME registry until one coordinated switch. This plan does not perform that switch. `docs/vs2026-audit/VS2026_RUNTIME_SCOPE_DEPENDENCIES.md` remains the file-level map of the 500 rule and `non_material`. This document orders the work.

## Invariants

- `ReportingPeriod.vs2026ReportingOption` is the only option. Null is unconfigured.
- `Company.employeeCount` is not module selection and not the 10-employee measure.
- `ReportingPeriod.schemaVersion` stays the application label. Deployment smoke expects `2.0.0`. Do not use it to choose the VS 2026 registry.
- Completeness, the workspace, validation, and export read one evaluation result.
- There is one active regulatory engine after the switch. The VSME section files are not consulted for a configured period.
- Development rows stay in the database. They are not a reporting history that must be converted. They also must not be deleted.
- Formulas stay unimplemented. Users enter reported totals. The registry records the inputs.

## Sequence

### 1. Evaluation function, still unused

Add `lib/vsme/vs2026/evaluation.ts` and scenario tests for A, B, C, E, F, G, and I. Scenario D asserts only that Option B is not a compliance claim. Scenario H asserts cardinality in memory.

No import from `lib/vsme/moduleScope.ts`. No UI.

### 2. Additive persistence, still unused

Add `Vs2026RepeatingRow` and `Vs2026RepeatingValue` as in `VS2026_DATA_PERSISTENCE_DESIGN.md`. Migrate with `prisma migrate dev` only when the operator asks. Do not reset the database. Do not point autosave at the new tables yet.

Scalar convention tests can use the existing `SustainabilityDataPoint` shape in memory: absence versus `0`, reject `B1_MODULE_OPTION` writes.

### 3. Registry loader

One function returns B1–B11 definitions and the evaluation for a period after reading the configuration, the explicit size measure, scalar rows, and repeating rows. It refuses a period whose configuration is `STORED_CONFIGURATION_INVALID`. An unconfigured period returns `NOT_CONFIGURED` and an empty completion set.

### 4. Single reader switch

In one change, replace the 500 rule and `non_material` omission together:

| Area | Files |
| --- | --- |
| Scope | `lib/vsme/moduleScope.ts`, `lib/vsme/applicability.ts`, `lib/vsme/schemaHelpers.ts`, `lib/vsme/vsme.types.ts` |
| Required set | `lib/vsme/materiality.ts`, `lib/vsme/completeness.ts`, `lib/vsme/periodSnapshot.ts`, `lib/vsme/getReportingState.ts` |
| UI schema | `lib/vsme/vsme.uiSchema.ts`, `components/vsme/VSMEFormRenderer.tsx`, sidebar, progress header, selectors, status bar |
| Save | `hooks/useVsmeFieldSaveCoordinator.ts` |
| Export | `lib/vsme/exportMapping.ts`, `lib/vsme/validateEfragExport.ts`, `lib/vsme/export/exportAudit.ts`, `lib/export/loadValidatedExportContext.ts` |
| Routes | `app/api/vsme/applicability/route.ts`, `app/api/vsme/ui-schema/route.ts`, completeness and export routes listed in the dependency map |
| Contract | `lib/vsme/CONTRACT.ts`, `scripts/vsme-contract-test.ts`, `scripts/phase7b-smoke-check.ts` |

XLSX, PDF, and JSON stay as renderers. They receive the filtered row set.

Configured periods use the loader. Unconfigured periods do not fall back to the 500 rule. They show that the period is not configured.

### 5. Workspace for B1–B11

Replace the section catalogue the workspace renders. Open groups use the repeating tables. Remove the materiality radios in the same release as step 4, not before, and not after.

### 6. Paragraph 22 store

Use the repeating tables for omitted datapoint ids and reasons. Stop writing `VsmeFieldMateriality` as an omission. Leave the table until no route reads it, then drop it in a later migration.

### 7. Digital export, after the pilot path works

XBRL generation is not a pilot prerequisite. The twelve unverified Annex I facts below are the interoperability queue. Preparation fields with no concept are not defects.

## Mapping gaps that affect a digital file

Reportable facts with `xbrl.status` `UNVERIFIED`:

| Fact | Why it is unresolved |
| --- | --- |
| `B1_SITE_IDENTIFIER` | The audit names an axis, not an item concept |
| `B2_HAS_PRACTICES`, `B2_HAS_POLICIES`, `B2_SEPARATE_ESG_POLICIES`, `B2_HAS_FUTURE_INITIATIVES` | No item QName was verified |
| `B4_POLLUTANT_IDENTITY` | Axis. Member list not reproduced |
| `B5_RELATIONSHIP_SITE_REFERENCE`, `B5_BSA_RELATIONSHIP` | Named concepts in the audit are unverified and were not upgraded |
| `B7_WASTE_GENERATED_TOTAL_WEIGHT`, `B7_WASTE_HAZARDOUS_MASS`, `B7_WASTE_NON_HAZARDOUS_MASS` | No item QName |
| `B7_WASTE_DIVERTED_PROPORTION` | Annex I is one proportion. The taxonomy has two percentages, which stay digital inputs |

The other unverified mappings are preparation assessments, calculation inputs, axes, or guidance. They are expected to have no reportable concept. 47 unresolved rows are not 47 legal gaps. Verified count on this review is 65 item mappings with a `vs:` QName stored on the definition.

Water-stress consumption keeps `vs:AmountOfWaterConsumedAtSitesLocatedInAreasWithWaterStress` and legal paragraph 37. The empty taxonomy reference is an interoperability note, not a reason to change the QName.

## Test gates before a pilot

- VS 2026 unit tests, including the new scenario tests, green.
- A period with six sites and six materials round-trips through the API.
- Scenarios A, B, C, E, F, and G match the evaluation document against the API, not only the pure function.
- JSON, XLSX, and PDF for one Option A period use the same included row set.
- `tsc` is clean, including Deployment Manager aliases.
- Docker deployment smoke passes without treating `schemaVersion` as the regulatory switch.
- A request for organisation A cannot read organisation B's period, repeating row, or configuration.
- Export readiness no longer depends on the VSME materiality map.

## Rollback

The switch in step 4 is one commit. Rollback is reverting that commit. The new tables can stay; unused tables do not change the VSME readers. Do not delete development datapoints as a rollback. Snapshots taken after the switch are VS 2026 JSON and must be ignored by a reverted exporter rather than reinterpreted as VSME field ids.

## Release blockers outside the registry

| Item | Severity | Treatment |
| --- | --- | --- |
| 17 TypeScript errors in Deployment Manager `@deployment/*` aliases | Pilot build blocker | Fix in the deployment package. Do not fold into a regulatory commit |
| Export HTTP 503 from `assertSystemReadyForExport` in `app/api/reporting-period/[id]/export/route.ts` | Operational gate, not a registry defect | Keep the gate. A pilot must show a ready health check. Database-unavailable 503 from `lib/api/handler.ts` is separate |
| Lint failures outside `lib/vsme/vs2026` | Pilot quality gate | Fix on their own. The VS 2026 tree is already clean at `--max-warnings 0` |
| C1–C9 absent | Blocks an Option B compliance claim | Do not block an Option A Basic pilot. The evaluator must keep the claim at `NOT_EVALUATED` |
| XBRL file generation absent | Not a pilot blocker | P2, after the human-readable exports share one row set |
