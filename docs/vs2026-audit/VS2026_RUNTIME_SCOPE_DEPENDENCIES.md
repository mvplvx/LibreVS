# VS 2026 runtime scope dependencies

Inspection date: 25 November 2026. The running scope, completeness, workspace, and export readers were not changed. `lib/vsme/vs2026/moduleSelection.ts` is not imported by those readers.

The legacy rule and the legacy omission mechanism are still in force. This map is the cutover checklist.

## What is persisted today

`Company.employeeCount` still drives the running B/C rule. Its comment says it drives applicability. `moduleScope.ts` does not read the B1 module-option fields. Those fields are ordinary registry values.

The VS 2026 option is stored separately on `ReportingPeriod.vs2026ReportingOption`, with paragraph 25 ids in `vs2026AdditionalComprehensiveDisclosures`. Null means the period is not configured. The running scope, completeness, and export code do not read those columns. At cutover, B1 `B1_MODULE_SELECTION_OPTION_BASIC_MODULE_ONLY` and `B1_MODULE_SELECTION_OPTION_BASIC_AND_COMPREHENSIVE` must be derived from this period configuration. They must not be a second writable option.

`VsmeFieldMateriality` stores `material` or `non_material` per period and field. The default, when no row exists, is `material`.

## Legacy module scope

Origin: `lib/vsme/moduleScope.ts`. `COMPREHENSIVE_EMPLOYEE_THRESHOLD` is 500. `isModuleCInReportingScope` is `employeeCount >= 500`. `COMPREHENSIVE_EMPLOYEE_MAX` is 1000 and is not applied by that function. Basic is always in scope. Comprehensive is mandatory at or above 500, and described as optional below 500. That is not Option A or Option B.

| Location | Role | Cutover class |
| --- | --- | --- |
| `lib/vsme/moduleScope.ts` | Defines the 500 rule | REPLACE_WITH the VS 2026 option. Do not keep a size gate. |
| `lib/vsme/applicability.ts` | Re-exports the rule. Section workflow labels `c_module_mandatory_scope` and `c_module_optional_scope`. `getApplicabilityRuleForModule` writes `if_employee_count_gt_500` for every C section. Field and section scope use the rule. | REPLACE_WITH the selected option. |
| `lib/vsme/vsme.types.ts` | Applicability union includes `if_employee_count_gt_500` | REPLACE_WITH Option A / Option B metadata. |
| `lib/vsme/schemaHelpers.ts` | Writes that rule onto every C section at registry build | REPLACE_WITH the disclosure catalogue. Same commit as the registry build. |
| `lib/vsme/materiality.ts` `isRequiredToFill` | Required means in module scope and `material` | REPLACE the scope half with the selected option. The material half is in the materiality map below. |
| `lib/vsme/completeness.ts` | `inScopeFieldIds` come from employee count | REPLACE with the option scope. |
| `lib/vsme/vsme.uiSchema.ts` | Publishes `moduleCInReportingScope` from the 500 rule | REPLACE. |
| `lib/vsme/exportMapping.ts` | Drops C below 500 from the mandatory export set and warns that C data is optional | REPLACE. Below-500 C data must not be labelled optional merely because of size. |
| `lib/vsme/validateEfragExport.ts` | Skips fields whose module is out of the 500 scope | REPLACE. |
| `lib/vsme/export/exportAudit.ts` | Same scope test on each audited field | REPLACE. |
| `app/api/vsme/applicability/route.ts` | Returns the threshold, the unused 1000 maximum, and the boolean | REPLACE. |
| `app/api/vsme/ui-schema/route.ts` | Returns `moduleCInReportingScope` | REPLACE. |
| `components/vsme/VSMEFormRenderer.tsx` | Calls `isModuleCInReportingScope(employeeCount)` and passes it down | REPLACE. |
| `components/vsme/VsmeWorkspaceStatusBar.tsx` | Copy: required at or above 500 | REPLACE. |
| `components/vsme/VsmeModuleSidebar.tsx` | C subtitle depends on the boolean | REPLACE. |
| `components/vsme/VsmeProgressHeader.tsx` | Copy: C optional below 500 | REPLACE. |
| `components/vsme/VsmeWorkspaceSelectors.tsx` | Copy branches at `employeeCount >= 500` | REPLACE. |
| `lib/vsme/index.ts` | Re-exports the threshold and the functions | REPLACE the public exports when callers are gone. |
| `lib/vsme/dev/semanticValidator.ts` | `validateRequiredToFillConsistency` expects the 500 split | REPLACE expectations in the same commit as the rule. |
| `lib/vsme/dev/contractGuard.ts` | Calls that validator | REPLACE with it. |
| `scripts/vsme-contract-test.ts` | Asserts required-to-fill at 0 and at 600 employees | REPLACE those assertions. |
| `scripts/phase7b-smoke-check.ts` | Asserts C is in scope at 500 | REPLACE. |
| `scripts/seed/test-environment.ts` | Seeds different materiality when `employeeCount >= 500` | REPLACE. |
| `lib/export/loadValidatedExportContext.ts` | Passes `employeeCount` into validation and export mapping | REPLACE the meaning of that argument. The file does not import `moduleScope` itself. |
| `lib/export/xlsxExporter.ts` and `lib/export/pdfExporter.ts` | Render the row set they are given | RETAIN the writers. The row filter upstream must change with export mapping. |
| `prisma/schema.prisma` `Company.employeeCount` | Persisted input for the rule | RETAIN the column as a workforce figure. Stop using it as module selection. |

JSON export uses the same validated context as XLSX and PDF. There is no separate JSON scope rule.

## Legacy materiality

`isRequiredToFill` is module scope AND `materiality === "material"`. A missing row is material. `non_material` removes the field from required completion and from the export obligation. That is the field-level omission model Annex I does not use.

| Location | Role | Cutover class |
| --- | --- | --- |
| `lib/vsme/materiality.ts` | Default material. `non_material` fails `isRequiredToFill`. | REMOVE as an omission rule. |
| `lib/vsme/applicability.ts` | Puts `requiredToFill` on each field from that rule | REPLACE_WITH_APPLICABILITY, then employee-size relief and paragraph 22. |
| `lib/vsme/completeness.ts` | Required set is in-scope and material. Export blocking equals missing required. | REPLACE_WITH_APPLICABILITY. |
| `lib/vsme/periodSnapshot.ts` | Counts a field toward required only when `isRequiredToFill` is true | REPLACE_WITH_APPLICABILITY. |
| `lib/vsme/exportMapping.ts` | Excludes `non_material` from the export and warns | REPLACE_WITH_SENSITIVE_OMISSION for a real paragraph 22 omission. REMOVE the blanket exclusion. |
| `lib/vsme/validateEfragExport.ts` | `non_material` is not an export gap | REPLACE_WITH_SENSITIVE_OMISSION. An essential blank is still missing. |
| `lib/vsme/export/exportAudit.ts` | Records material versus excluded | REPLACE_WITH_SENSITIVE_OMISSION. |
| `components/vsme/ExportAuditPanel.tsx` | Copy: "Excluded from reporting" | REPLACE_WITH_SENSITIVE_OMISSION. |
| `lib/vsme/vsme.uiSchema.ts` | Sends materiality and `requiredToFill` to the client | REPLACE_WITH_APPLICABILITY. |
| `lib/api/loadPeriodIntelligence.ts` | Loads the map and guards required-to-fill alignment | REPLACE_WITH_APPLICABILITY. |
| `lib/vsme/getReportingState.ts` | Blocks data entry until materiality is defined | REMOVE that gate. |
| `components/vsme/fieldMaterialityState.ts` | Maps stored `non_material` to the field state | REMOVE. |
| `components/vsme/FieldRenderer.tsx` | Material / non-material radios. Hides the value when non-material. | REMOVE the radios. |
| `components/vsme/SectionRenderer.tsx`, `SubsectionRenderer.tsx`, `fieldUtils.ts`, `vsmeReportingViewMode.ts` | Hide or summarise fields from the materiality state | REPLACE_WITH_APPLICABILITY. |
| `components/vsme/vsmeWorkspaceMetrics.ts` | Materiality-decision percentage | REMOVE. |
| `components/vsme/VsmeModuleSidebar.tsx` | Shows that percentage | REMOVE. |
| `components/vsme/VsmeProgressHeader.tsx` | Instructs the user to decide materiality first | REMOVE. |
| `components/vsme/VsmeStateBanner.tsx`, `reportingStateUi.ts` | "Define materiality" | REMOVE. |
| `components/vsme/vsmeReportingUiMode.ts` | `materialityEditable` | REMOVE with the radios. |
| `components/vsme/VSMEFormRenderer.tsx` | Loads and saves the map. Drives metrics. | REMOVE the control. Keep the workspace. |
| `app/vsme/page.tsx` | Materiality query and save mutation | REMOVE the omission call. |
| `components/vsme/queries/useUpdateVsmeMateriality.ts` | PATCH the materiality route | REMOVE. |
| `lib/vsme/vsmeQueryKeys.ts` | Query key | REMOVE with the query. |
| `app/api/reporting-period/[id]/materiality/route.ts` | Writes `VsmeFieldMateriality` | REMOVE. |
| `lib/vsme/loadMateriality.ts` | Reads it | REMOVE when no caller remains. |
| `lib/validators/materiality.ts` | Zod enum `material` / `non_material` | REMOVE. |
| `hooks/useVsmeFieldSaveCoordinator.ts` | Autosave treats only MATERIAL as editable content | REPLACE_WITH_APPLICABILITY. |
| `app/api/reporting-period/[id]/export/route.ts` | Snapshot stores the materiality map and the required ids | REPLACE_WITH_APPLICABILITY and REPLACE_WITH_SENSITIVE_OMISSION. |
| `app/api/reporting-period/[id]/export-audit/route.ts` | Passes the map into the audit | REPLACE with the export audit. |
| `app/api/reporting-period/[id]/export-validation/route.ts` | Same | REPLACE. |
| `lib/vsme/exportSnapshotVersioning.ts` | Persists the map inside the snapshot JSON | RETAIN_AS_NON_REGULATORY_METADATA until old snapshots are no longer read. Do not treat it as a current omission. |
| `app/api/reporting-period/[id]/dashboard/route.ts`, `kpis/route.ts`, `vsme-coverage/route.ts` | Publish completeness built from the materiality rule | REPLACE_WITH_APPLICABILITY. |
| `app/dashboard/page.tsx` | Shows material completeness and required completeness | REPLACE the labels and the sets together. |
| `lib/vsme/CONTRACT.ts` | States that `non_material` is excluded from required-to-fill | REMOVE that clause. |
| `lib/vsme/dev/semanticValidator.ts` | Recomputes required-to-fill with materiality | REPLACE_WITH_APPLICABILITY. |
| `scripts/seed-vsme-demo.ts`, `scripts/seed/test-environment.ts` | Write material and non-material rows | REMOVE the non-material omission fixture. |
| `prisma/schema.prisma` `VsmeFieldMateriality` | Stores the decision | REMOVE only after paragraph 22 has its own store and no route reads this table. |
| `app/api/system-health/route.ts`, `components/system/SystemHealthPanel.tsx` | A key named `materiality` reports whether the registry loaded | RETAIN_AS_NON_REGULATORY_METADATA. Rename when the omission feature is gone. It is not the omission rule. |
| `components/home/HomeLanding.tsx`, `components/librevs/DataOwnershipNotice.tsx`, `app/system/backup/page.tsx` | Describe materiality as a product feature or stored decision | REMOVE the feature claim when the control is removed. The backup sentence must name the store that actually remains. |
| `lib/vsme/release/readinessCheck.ts` | Builds completeness with an empty materiality map, so every in-scope field defaults to material | REPLACE_WITH_APPLICABILITY. An empty map must not mean every field is required. |
| `components/librevs/ExportDisclaimer.tsx` | Says exports validate completeness | RETAIN_AS_NON_REGULATORY_METADATA. The validator behind it changes with completeness. |

Employee-size relief for undertakings with 10 employees or fewer is not implemented in this chain. Nothing here should be re-labelled as that relief. The 500 test is module selection, not the Annex I square-bracket rule.

Paragraph 22 is not implemented. The only behaviour that resembles an omission is `non_material`. That behaviour must not be copied forward as the sensitive-omission workflow.

## Cutover sequence

One surface must not change ahead of the others. Completeness, the workspace, validation, and export all call the same two functions.

1. Persist the selected option and any paragraph 25 Comprehensive disclosure ids. Done in `lib/vsme/vs2026/reportingConfiguration.ts`. The columns are unused by the running readers. Do not derive them from `Company.employeeCount`. Leave the 500 rule in place until the stored option is what every reader uses.
2. In one change, point `applicability`, `completeness`, UI schema, export mapping, export validation, and export audit at `resolveModuleSelection`. Update the contract test and the smoke check in that change. XLSX, PDF, and JSON follow the filtered rows.
3. In a later change, remove `non_material` as an omission. Replace required-to-fill with applicability state, the employee-size rule, and a paragraph 22 record that can be incomplete. Do that across the field UI, the completeness routes, and the export filter together.
4. Replace the section catalogue only after those two gates agree. Deleting VSME fields before the readers have moved will make the UI and the export describe different registries.

`lib/vsme/vs2026/moduleSelection.ts` stays unused by production until step 2.
