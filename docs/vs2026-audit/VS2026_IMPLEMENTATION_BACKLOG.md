# VS 2026 implementation backlog

Priorities: P0 blocks regulatory correctness or stored-data integrity. P1 is required for an Option A pilot. P2 is digital interoperability. P3 can wait. Complexity is relative, not a schedule.

The first coding assignment is VS-01. Do not start VS-04 until VS-01 and VS-02 are accepted.

| ID | Priority | Complexity | Item |
| --- | --- | --- | --- |
| VS-01 | P0 | MEDIUM | Isolated evaluation function and scenario tests |
| VS-02 | P0 | MEDIUM | Additive repeating-row tables, unused by the workspace |
| VS-03 | P1 | MEDIUM | Period loader over configuration, size measure, scalars, and rows |
| VS-04 | P0 | LARGE | One-commit reader switch off the 500 rule and `non_material` |
| VS-05 | P1 | LARGE | Workspace forms for B1–B11, including open groups |
| VS-06 | P1 | MEDIUM | Paragraph 22 omission rows and export behaviour |
| VS-07 | P1 | SMALL | Label B1 and B2 with `informationClass` |
| VS-08 | P3 | SMALL | Separate value kind for total training hours |
| VS-09 | P1 | MEDIUM | Deployment Manager typecheck and export readiness as release gates |
| VS-10 | P2 | LARGE | XBRL instance for verified concepts only |
| VS-11 | P1 | LARGE | C1–C9 registry, only when Option B is in scope |

## VS-01

Reason: every later reader needs one result. Building the UI first would fork completion rules.

Components: new `lib/vsme/vs2026/evaluation.ts`, new `lib/vsme/vs2026/evaluation.test.ts`. No edits to `moduleScope`, Prisma, or the registry definitions.

Dependencies: none. Uses existing `resolveModuleSelection`, `classifyEmployeeSize`, and `annexIIFor`.

Acceptance: scenarios A, B, C, E, F, G, and I from `VS2026_RULE_ENGINE_SCENARIOS.md` pass. Scenario D asserts `NOT_EVALUATED` only. Missing configuration is not Option A. A missing number is not zero. `non_material` is not an input. The running test suite stays green.

## VS-02

Reason: the scalar unique key cannot store six sites. INT-1.

Components: `prisma/schema.prisma`, one new migration, a small writer module under `lib/vsme/vs2026/` that is not imported by routes.

Dependencies: the design in `VS2026_DATA_PERSISTENCE_DESIGN.md`. Operator approval before `prisma migrate`.

Acceptance: a test inserts six site rows and six material rows in one period inside a rolled-back transaction, refuses a site reference in another period, and leaves existing `SustainabilityDataPoint` rows unchanged. No route calls the writer.

## VS-03

Reason: the switch needs one read model.

Components: new `lib/vsme/vs2026/loadPeriodRegistry.ts`. Reads `getReportingConfiguration` and the two stores.

Dependencies: VS-01, VS-02.

Acceptance: unconfigured period returns `NOT_CONFIGURED`. Invalid stored option returns `STORED_CONFIGURATION_INVALID`. `B1_MODULE_OPTION` in the result equals the column. A stored row with that field id is reported as a conflict, not as the option.

## VS-04

Reason: split readers would show Option A in one screen and the 500 rule in export. INT-2.

Components: the file list in `VS2026_RUNTIME_CUTOVER_PLAN.md` step 4, plus `VS2026_RUNTIME_SCOPE_DEPENDENCIES.md` updated when the readers move.

Dependencies: VS-03. Do not deploy this without VS-05 in the same release if the workspace would otherwise render VSME fields against VS 2026 completion.

Acceptance: scenario C at 600 employees stays Option A through the applicability API, completeness API, and export validation. Contract tests no longer expect C in scope at 600. `schemaVersion` remains `2.0.0`.

## VS-05

Reason: a pilot has to enter the facts the evaluator requires.

Components: workspace section registry, field renderer, `hooks/useVsmeFieldSaveCoordinator.ts`, the datapoint API. Remove materiality radios in this same change.

Dependencies: VS-04.

Acceptance: scenario H edits six sites and six materials, reloads, and exports the same ids. Autosave does not persist an empty string. Minimum-wage blank is not stored as NO.

## VS-06

Reason: scenario F is otherwise an export block with no legal way through.

Components: repeating rows for omissions, `B1_OMITTED_DISCLOSURES`, export mapping.

Dependencies: VS-02, VS-04.

Acceptance: a valid 22(a)–22(d) row plus the B1 list yields `OMITTED` and `INCLUDE_WITH_OMISSION`. A materiality flag alone yields `REQUIRED_MISSING`.

## VS-07

Reason: INT-5. One completion filter for all Basic facts.

Components: `lib/vsme/vs2026/registry/b1.ts`, `b2.ts`, and their tests.

Dependencies: none. Safe before the switch. Do not change legal text or QNames.

Acceptance: Annex I completion count stays 27 for B1 and B2. The three guidance items are `PREPARATION_DATA` or remain `guidanceDatapoints` and stay out of the filter.

## VS-08

Reason: INT-6. Only matters once a calculator exists. No calculator is in the pilot.

Components: `lib/vsme/vs2026/registry/types.ts`, `b10.ts`, `b10b11.test.ts`.

Dependencies: none.

Acceptance: `B10_TOTAL_TRAINING_HOURS` is not `HOURS_AVERAGE`. The reported average id is unchanged.

## VS-09

Reason: the pilot build and export gate are already red for reasons outside the registry.

Components: Deployment Manager alias configuration, `assertSystemReadyForExport` callers. Not the VS 2026 registry.

Dependencies: none. Can proceed beside VS-01.

Acceptance: `npx tsc --noEmit` reports no `@deployment/*` errors. An export against a ready local stack does not return 503 from the readiness gate. Database-down 503 still returns when the database is down.

## VS-10

Reason: human-readable export does not need XBRL. A digital file does.

Components: a new exporter. It emits only definitions whose `xbrl.status` is `VERIFIED`. Unverified reportable facts are listed as gaps, not given invented QNames.

Dependencies: VS-05. The twelve facts in the cutover plan stay gaps until a taxonomy reading verifies them.

Acceptance: a sample period produces an instance whose concepts are a subset of the verified QName set. The legal proportion is not emitted as the sum of the two waste percentages.

## VS-11

Reason: Option B cannot be completed without C1–C9. An Option A pilot does not need them.

Components: new registry files under `lib/vsme/vs2026/registry/`. Not the running sections.

Dependencies: the same architecture as B1–B11. Start only after this backlog's P0 items are accepted.

Acceptance: each C paragraph in Annex I is represented or explicitly deferred. Annex II Comprehensive rows match `annexII.ts`. The evaluator can then replace the Scenario D placeholder.
