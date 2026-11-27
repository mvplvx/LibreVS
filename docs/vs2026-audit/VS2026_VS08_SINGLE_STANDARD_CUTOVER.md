# VS-08 — Single-standard cutover

VS 2026 is the only active reporting workflow. A missing reporting option means the period is not configured. It does not open the former VSME workspace.

## 1. Entry points

The dashboard at `/dashboard` is the reporting home. From there a user selects an undertaking, creates a reporting period, chooses Option A, and opens `/vsme/vs2026/edit/{period}`. The editor, review, finalisation, and JSON, Excel, and PDF downloads are unchanged.

`/vsme` and `/vsme/export-review` no longer render the old form or the old export review. They explain that those screens are retired and link to the dashboard. Sign-in returns to the dashboard.

## 2. Retired regulatory behaviour

The active request path no longer runs the old field catalogue, materiality updates, module-scope selection, completeness percentages, or legacy report generators. `reportingStandardFromOption(null)` returns `UNCONFIGURED`. `OPTION_A` and `OPTION_B` stay VS 2026. Any other stored value is `INVALID`.

Employee-count thresholds are not used to choose a module. Option B stays explicitly unsupported in the editor.

## 3. Preserved infrastructure

Better Auth, organisations, companies, reporting-period persistence, Prisma, the VS 2026 registry, evaluator, editor, review, finalisation, and snapshot renderers remain. The release-readiness route remains a system check used by finalisation. Currency handling and the company and reporting-period APIs remain.

The old regulatory modules are still in the repository because the release-readiness check and local scripts still import parts of them. They are not mounted on a reporting page or a reporting API handler.

## 4. Retired API routes

These routes require a session. An owned period returns 410 and writes nothing. A period outside the caller's organisation returns 404.

- `GET` and `POST /api/data-point`
- `GET` and `PUT /api/reporting-period/{id}/materiality`
- `GET /api/reporting-period/{id}/dashboard`
- `GET /api/reporting-period/{id}/summary`
- `GET /api/reporting-period/{id}/kpis`
- `GET /api/reporting-period/{id}/vsme-coverage`
- `GET /api/reporting-period/{id}/export`
- `GET /api/reporting-period/{id}/export/json`
- `GET /api/reporting-period/{id}/export/xlsx`
- `GET /api/reporting-period/{id}/export/pdf`
- `GET /api/reporting-period/{id}/export-validation`
- `GET /api/reporting-period/{id}/export-audit`
- `GET /api/reporting-period/{id}/export-snapshots`
- `GET /api/reporting-period/{id}/export-snapshots/{snapshotId}`
- `POST /api/reporting-period/{id}/export-snapshots/{snapshotId}/finalize`
- `GET /api/vsme/schema`
- `GET /api/vsme/ui-schema`
- `GET /api/vsme/applicability`
- `GET /api/vsme/legacy-audit`

`GET` and `POST /api/reporting-period` and the company routes stay. They create an unconfigured period and do not set Option A.

## 5. Dependencies

`exceljs` remains the VS 2026 workbook library. The community `xlsx` package remains because `lib/export` and two local scripts still import it. Those scripts are not the application download path. No export package was added.

## 6. Reporting-period creation

The dashboard posts `{ companyId, year, status: "draft" }` to `/api/reporting-period`. The new row keeps `vs2026ReportingOption` null. Choosing Option A calls the existing `saveOptionAAction`. Option B is shown as future support and is not saved from the dashboard.

## 7. Unconfigured periods

An unconfigured period shows "VS 2026 reporting option not configured". Review readiness is `NOT_CONFIGURED`. The Basic Module editor can be opened so the user can choose Option A there as well. Scalar writes stay blocked until the option is saved.

## 8. Option A and Option B

Option A opens the existing Basic Module editor. Option B opens the existing unsupported status. It does not fall back to another workspace. An invalid stored option is an explicit error.

## 9. Development-data provenance

Rows without `reportingOrigin` `VS2026_EDITOR` are still excluded from VS 2026 facts and still block finalisation. The dashboard says to create a new period when stored data cannot be verified. The demo seed no longer writes sample legacy datapoints. It does not delete rows that are already stored.

## 10. Snapshot preservation

`Vs2026ReportSnapshot` rows are not rewritten. Scheme 1 and scheme 2 verification are unchanged. Downloads stay on `/api/vsme/vs2026/report/snapshot/{id}` and do not depend on the editor flag. `VsmeExportSnapshot` is no longer reachable from the application and its table was not dropped.

## 11. Authentication and tenant isolation

Retired routes call `requireApiContext` before returning 410. Forged `x-user-id` and `x-organization-id` headers are ignored. A foreign or guessed period returns 404. Anonymous calls return 401.

## 12. Automated tests

`reportingConfiguration.integration.test.ts` now asserts the rollback of the periods and datapoints it created. It no longer compares global table counts.

The identity, dashboard source, and retired-route tests live in `lib/vsme/vs2026/singleStandard.test.ts` and `lib/vsme/vs2026/retiredRoutes.security.test.ts`.

## 13. Browser verification

Checked on an isolated development server at `http://localhost:3019`, with the editor flag on. The existing server on port 3000 was left running.

The signed-in dashboard created a 2026 period with `vs2026ReportingOption` null, then saved Option A from the dashboard. The period opened in the existing B1–B11 editor. The legal-form field was typed as `Aktiebolag` and the field status became `Saved`. Adding a row created a subsidiary row; the name `VS-08 Subsidiary` was saved and later appeared in the final JSON.

The remaining required facts were written with the existing VS 2026 scalar, employee-measure, and comparative-basis writers until `getVS2026ReportingState` returned `READY_FOR_REVIEW`. That did not skip the readiness check. The browser then confirmed the undertaking declaration and clicked `Finalise this report version`. The page reported `Report revision 1 is final.`

Authenticated downloads of that revision returned:

- JSON `200`, `application/json; charset=utf-8`, `vs2026-option-a-r1.json`, `private, no-store`, `nosniff`, format `librevs-vs2026-report`.
- XLSX `200`, spreadsheet content type, ZIP header, `vs2026-option-a-r1.xlsx`.
- PDF `200`, `application/pdf`, `%PDF-1.7`, `vs2026-option-a-r1.pdf`.

The same session received `410` and `This reporting route is retired. LibreVS uses VS 2026 for reporting.` from the owned legacy JSON, XLSX, and PDF export routes and from `/api/vsme/schema`. None of those responses was a generated report.

Returning to the dashboard showed `VS 2026 · Option A · Basic Module`, internal review status `READY FOR REVIEW`, and revision 1 download links. `/vsme` states that the former data-entry workspace is retired and links to the dashboard. It does not render the old form. The footer identifies the project as VS 2026.

The dedicated browser account and its period were removed after this check. The three existing demo companies were left in place.

## 14. TypeScript and build status

`npx tsc --noEmit --pretty false --incremental false` exited 2. The output contains 17 `error TS` lines, all under `deployment/ui`, from missing `@deployment/*` modules and implicit `any` parameters. No error was reported outside `deployment/ui`. The earlier generated `.next/dev/types` route-validator errors were not present in this run.

A production `next build` was not run. Another development server is using `.next` on port 3000, and that directory was not deleted.

## 15. Obsolete database models left in place

No migration was applied. These remain stored and are not dropped:

- `VsmeExportSnapshot`
- `VsmeFieldMateriality`
- `schemaVersion` on `ReportingPeriod`
- legacy datapoint columns `legacyFieldId`, `migratedFieldId`, and `migrationStatus`

Removing them needs a separate destructive-migration review.

## 16. Remaining release blockers

- Explicit first-year Option A only. Comprehensive C1–C9 is not implemented.
- `VS2026_EDITOR_ENABLED` must be the exact value `true` for editing and finalisation. When it is off, the editor shows an unavailable state and does not open another workspace. Downloads of finalised snapshots stay available.
- PDF text outside WinAnsi is shown as a code point.
- The old regulatory source files and the `xlsx` package are still in the repository.
- Deployment Manager TypeScript errors are independent of this cutover.
- A production build and container packaging are not part of this phase.

## Feature-flag decision

`VS2026_EDITOR_ENABLED` stays. It gates editing, draft JSON, and creating a finalisation. It does not select a reporting standard. `VS2026_PREVIEW_ENABLED` stays limited to the diagnostic preview.
