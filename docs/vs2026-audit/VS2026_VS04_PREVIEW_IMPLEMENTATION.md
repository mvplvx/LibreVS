# VS-04 Authenticated Read-Only Regulatory Preview

Date: 2026-11-25

Status: an authenticated preview route renders the existing VS-01 result for one reporting period. It is disabled unless `VS2026_PREVIEW_ENABLED=true`. It does not write, and it is not linked from the workspace navigation.

## 1. Route and access control

Route: `/vsme/vs2026/preview/[reportingPeriodId]`

The page is a server component with `dynamic = "force-dynamic"`. It reads request headers and calls `getVS2026RegulatoryPreview`. The organisation id is taken from `x-organization-id` together with `x-user-id`, through `getUser`. A request without both headers is unauthenticated. The demo fallback in `getUser` is not used for this route.

The loader then applies the existing organisation predicate. A period in another organisation and a guessed id both return `PERIOD_NOT_FOUND` with the same message. The page does not read an organisation id from the query string.

## 2. Feature-gate configuration

`isVS2026PreviewEnabled` is true only when `VS2026_PREVIEW_ENABLED` is the exact string `true`. Any other value, including an unset variable, leaves the preview disabled.

Local enablement:

```text
VS2026_PREVIEW_ENABLED=true
```

Set it in the environment of the Next.js process and restart that process. Open the route with both identity headers. The flag is server-side. It is commented in `.env.example` and is not turned on by that file.

## 3. Server-function contract

`getVS2026RegulatoryPreview({ reportingPeriodId, headers, db })`

Order:

1. Feature gate.
2. Identity from headers.
3. `loadVS2026EvaluationInput` with the header organisation id.
4. `evaluateVS2026ReportingState` on a successful load.
5. A scoped read of the period year and company name.

The function returns a presentation view or a failure reason. It does not recalculate completion.

## 4. Loader and evaluator integration

Successful loads are passed unchanged to VS-01. Disclosure titles, paragraphs, and repeating-group text come from the B1–B11 registry. Counts are filters of the evaluator statuses. There is no percentage score.

`readyForReview` does not look at `ignoredFactIds` or `ignoredGroupIds`. If that flag is true while ignored or unsupported records exist, the preview says the flag is not an authoritative assessment. It is never described as compliance. `completionAssessment` and `complianceClaim` are shown as “Not evaluated”.

## 5. Displayed reporting statuses

The page distinguishes reported, reported zero, reported false, required and missing, voluntary, not applicable, awaiting applicability assessment, structurally omitted, omission requiring verification, out of scope, unsupported, and invalid.

A structurally complete omission is labelled as not an independent legal approval. Employee size is “10 employees or fewer”, “More than 10 employees”, or “Employee-size category not determined”. The proportionality field is not shown as an Annex I fact.

Electricity and fuel members stay on separate rows. Repeating rows keep their row id, dimension, value, unit, and parent site label. They are not summed, and the table is not limited to five rows.

## 6. Unconfigured periods

`NOT_CONFIGURED` is shown as “Reporting option not configured”. The page states that Option A was not assumed. Those datapoints stay out of scope.

## 7. Unsupported Comprehensive disclosures

Option A with a selected C disclosure stays Option A. The C id is listed as additional information whose evaluation is not implemented.

Option B shows that Comprehensive evaluation is not implemented and does not claim completion or compliance. An invalid stored configuration is a failure state. It does not fall back to Option A.

## 8. Error handling

| Reason | What the user sees |
|---|---|
| `PREVIEW_DISABLED` | The preview is not enabled. |
| `UNAUTHENTICATED` | Sign-in is required. |
| `PERIOD_NOT_FOUND` | Reporting period not found. |
| `STORED_CONFIGURATION_INVALID` | The configuration cannot be evaluated. Option A was not assumed. |
| `PERSISTED_DATA_INVALID` | Stored data could not be evaluated. Issue explanations only. |
| `DATABASE_FAILURE` | The preview could not be loaded. No data was changed. |

Stored values, row ids, and database error text are not included in failure results.

## 9. Tenant isolation

The organisation id is not accepted as a function argument from the page URL. The loader receives only the organisation from the identity headers. Tests cover a foreign organisation, a guessed id, and the absence of another organisation’s stored text in the failure payload.

## 10. Test results

`npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts` passed 124 tests, including the preview access, presentation, database, and interface tests. The previous baseline was 110.

ESLint on the new preview files reported no warnings. Project typecheck reports the existing 17 Deployment Manager alias errors and no errors in the preview.

## 11. Remaining integration blockers

- The preview is not linked from the workspace, and the workspace still uses the legacy reporting engine.
- There is no writer for the reporting option, the proportionality measure, or VS 2026 datapoints.
- Paragraph 22 omissions still cannot become legally verified from stored evidence flags alone.
- Scope 3 category rows can remain in `ignoredGroupIds`.
- C1–C9 are not evaluated.
- The identity headers are the current application identity mechanism. They are not a new login system.
