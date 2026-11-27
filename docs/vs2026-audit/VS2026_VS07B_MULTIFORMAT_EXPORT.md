# VS-07B — XLSX and PDF from the frozen VS 2026 snapshot

JSON, Excel, and PDF are three renderings of one finalised `Vs2026ReportSnapshot`. The renderers do not query Prisma, do not call VS-01, and do not read the live reporting period.

## 1. Shared renderer architecture

```text
Finalised VS 2026 snapshot
        |
        v
verifyStoredSnapshot
        |
        v
Verified canonical dataset
        |
        +-- JSON  (existing report file)
        +-- projectPublicReport
              +-- XLSX
              +-- PDF
```

`renderVS2026Xlsx` and `renderVS2026Pdf` accept a `VerifiedReportSnapshot`. `projectPublicReport` selects and labels facts for the external report. It does not change the stored dataset.

## 2. Canonical dataset usage

The stored `dataset` JSON remains the VS-07A `librevs-vs2026-report` version `1` object. JSON download still serialises that object. Excel and PDF read the same object after the integrity check. Disclosure order, values, units, dimensions, and row identity come from that object.

## 3. Snapshot integrity

`contentHash` is the SHA-256 of the canonical dataset. That was the VS-07A scheme.

Scheme 1 rows have `integrityVersion` null and `sealHash` null. They stay valid. Their dataset hash is still checked, and the stored regulatory version, reporting option, period id, and conformity text must match the dataset. Revision, finalisation time, and finalising user were not part of that hash and are not rewritten.

Scheme 2 is used for snapshots created after this phase. `integrityVersion` is `"2"`. `sealHash` is the SHA-256 of a record that contains the dataset hash, period, organisation, company, revision, regulatory version, option, conformity text, finalising user, and finalisation timestamp. Changing any of those fields fails verification. Existing rows are not backfilled.

## 4. Conformity-statement verification

The statement generated for new finalisations is unchanged:

`{undertaking} states that this sustainability report for {year} is prepared in conformity with Commission Delegated Regulation (EU) 2026/1560, Option A — Basic Module.`

It names the undertaking, the reporting period, the regulation, and Option A — Basic Module, and it says the report is prepared in conformity with that option. The following sentences record the undertaking's responsibility. The statement says it is not an assurance opinion. Previously finalised text is not rewritten.

## 5. Public report projection

`projectPublicReport` publishes:

- every `REPORTED_FACT` that has a value;
- a fixed list of preparation-context fields that explain a reported figure or a reported scope decision.

Null values are omitted. They are not shown as zero. Unverified-origin facts are omitted.

## 6. Preparation-context handling

Included as reporting context: energy-breakdown availability, pollutant reporting condition and public URL, biodiversity assessment outcome, water-process and water-stress site context, material-flow condition, workforce measurement basis and country of contract, accident-rate basis, hours-worked origin, and the fatality legal restriction.

Excluded from Excel and PDF: calculation inputs such as hours worked, fatality components, pay-gap averages, collective-bargaining inputs, and training-hour inputs; the B10 minimum-wage determination; the B11 event assessment; and the B5 relationship-basis note. Those values remain in the frozen dataset and in the JSON file.

## 7. PDF layout

A4, Helvetica, slate text, a short cover, then basis of preparation with the conformity declaration, B1–B11 in registry order, a separate supplementary section, paragraph 22 omissions, and report metadata. Long text wraps. Repeating entries keep a heading with the following lines. Page numbers are `n / total`. The undertaking is the document author. LibreVS is the creator. The file does not contain the finalising user id.

Western European characters, including Swedish å, ä, and ö, are drawn in WinAnsi. A character outside that set is shown as its `U+` code so the report does not fail and the character is not dropped silently.

## 8. XLSX workbook structure

Sheets: `Report Info`, `B1`–`B11`, `Supplementary`, `Omissions`.

Disclosure sheets have a title row and a frozen header row with datapoint id, label, paragraph, value, unit, dimension, entry, and role. Headers are bold on a light fill. Long text wraps. Filters cover the table. Column widths are set for reading.

`Report Info` carries the undertaking, period, option, regulatory version, revision, finalisation time, conformity declaration, and the limitations note.

## 9. Value and unit formatting

`0` stays zero. `false` is shown as No. Missing values are absent, not zero. Exact numeric strings that round-trip through `Number` are Excel numbers, including negatives. Strings with leading zeros, trailing zeros that `Number` would drop, NACE codes, and country codes stay text. Monetary facts use the snapshot currency as the unit. Percentages and proportions use `%` when no other unit was stored. No conversion rate is applied.

## 10. Repeating-data handling

Repeating facts keep their dataset order. A B1 site identifier is the entry label. A site reference displays that label. A site row without an identifier is labelled `Site 1`, `Site 2`, and so on, in dataset order. The internal row id is not printed in the PDF or Excel entry column.

## 11. Supplementary information

Scope 3 rows are only on the Supplementary sheet and in the PDF section of that name. Each row repeats the limitation that the category was stored by the undertaking and was not evaluated as a Basic Module requirement.

## 12. Paragraph 22 protection

Omissions list the datapoint id, label, paragraph, and reason. The omitted value is not copied into the projection. The workbook says the attestation is the undertaking's and is not an independent legal approval.

## 13. Download authorization

`GET /api/vsme/vs2026/report/snapshot/{id}?format=json|xlsx|pdf`

The session comes from Better Auth. The organisation comes from that session. A missing, foreign, or guessed snapshot returns 404. The snapshot is verified before rendering. An unsupported format returns 400. A report over the render limit returns 413 and is not truncated.

`VS2026_EDITOR_ENABLED` still gates editing, draft JSON, and creating a finalisation. It does not gate download of an already finalised snapshot. Downloads are not public.

Headers: the format's MIME type, `Content-Disposition: attachment` with a fixed `vs2026-option-a-r{n}.{ext}` name, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`.

## 14. Multi-format consistency

`lib/vsme/vs2026/reportRender.test.ts` builds one synthetic finalised dataset and a public manifest from it. JSON must contain each raw value. Excel and PDF must contain the datapoint id and the display value or the raw value. The test also checks zero, No, a negative quantity, NACE `01.11`, Swedish text, a long narrative, 40 pollutant rows, a formula-like string, a URL stored as text, a paragraph 22 reason, supplementary Scope 3, and the absence of protected and internal preparation values.

## 15. Performance considerations

Rendering is in memory. The projection refuses more than 4,000 public items or 1,500,000 characters of displayed text. The error says nothing was truncated. There is no background job queue.

## 16. Browser verification

An isolated webpack server on `http://localhost:3018` was used. Port 3000 was left untouched. A dedicated organisation, user, company, and 2026 Option A period were created through the VS 2026 writers, then finalised as revision 1 before the browser session. The interactive session then:

1. Signed in and opened `/vsme/vs2026/edit/{period}`.
2. Confirmed revision 1, the finalisation timestamp, and the three download actions.
3. Downloaded JSON, Excel, and PDF with the signed-in session. All three returned 200, `Content-Disposition: attachment`, `Cache-Control: private, no-store`, and `X-Content-Type-Options: nosniff`.
4. Opened the workbook and the PDF. Both identify the undertaking, year 2026, Option A, revision 1, the conformity declaration, legal form `Aktiebolag`, and NACE `01.11`. Excel sheets are Report Info, B1–B11, Supplementary, and Omissions. This particular finalised period has no supplementary facts and no paragraph 22 omission; those cases are covered by the synthetic consistency test.
5. Changed the live legal form to `Changed after finalisation` and waited until the field showed Saved.
6. Downloaded revision 1 again. The database still has one snapshot. JSON bytes are identical. Excel cell text and PDF text are identical and still contain `Aktiebolag`. The edited legal form is absent from all three formats.

JSON bytes are identical. Excel worksheet XML is identical; only the zip container timestamp changes. PDF extracted text is identical; the PDF file bytes change because the generator writes a creation time. The rich repeating, Scope 3, formula-injection, and omission cases were verified by `reportRender.test.ts`, not by this browser period. A hydration warning on the sign-in page came from the browser tool's `data-cursor-ref` attributes.

## 17. Remaining blockers for release

- Explicit first-year Option A only. Subsequent-year and comparative figures are not produced.
- Selected Comprehensive disclosures still block finalisation. C1–C9 is not implemented.
- XBRL and the EFRAG digital template are not implemented.
- PDF text outside Western European WinAnsi is shown as a code point.
- Any authenticated organisation user may finalise. A separate approver role is not implemented.
- Excel and PDF omit internal preparation inputs that remain visible in the JSON dataset.

## 18. Legacy dependencies still present

The new renderers do not import the legacy VSME export mapping, the legacy PDF writer, or the legacy workbook writer. They use the already installed `pdf-lib` and the added `exceljs` package. The legacy JSON, XLSX, and PDF routes, the VSME workspace, and `VsmeExportSnapshot` are still in the application and were not removed. `xlsx` remains a dependency of those legacy exporters. VS 2026 finalisation still calls `runReadinessCheckForOrganization`, which lives in the shared release-readiness module and is not a regulatory evaluator.
