# Export system

Exports are **deterministic** and **snapshot-based**. They never infer values or reinterpret materiality at export time.

## Pipeline

1. Load period intelligence (`loadPeriodIntelligence`) — DB values + materiality
2. Validate completeness (`validateExportCompleteness`)
3. Validate EFRAG structure (`validateEfragExport`)
4. Build export rows (`buildExportRows`) — strict V2, material in-scope fields only
5. Serialize to artifact (JSON / XLSX / PDF)

System readiness **red** health blocks export (503). Incomplete required fields block export (422/400).

## Canonical dataset

`lib/export/exportDataset.ts` defines the **single row ordering** used by:

- `GET /api/reporting-period/[id]/export/json`
- `lib/export/xlsxExporter.ts`
- `lib/export/pdfExporter.ts`

Rows are sorted by `fieldId`. Metadata includes:

- `schemaVersion` (e.g. `2.0.0`)
- `exportedAt` (ISO timestamp)
- `registryHash` (SHA-256 of sorted v2 fieldIds)

## XLSX mapping

- Implementation: `lib/export/xlsx/writeVsmeWorkbook.ts` (via `xlsxExporter.ts`)
- Sheets: General, Environmental, Social, Governance (EFRAG template alignment)
- Columns: fieldId, label, value, unit, excelCell, xbrlNamedRange
- Uses registry `excelCell` / sheet metadata — no formula inference

## PDF mapping

- Implementation: `lib/export/pdf/writeVsmePdf.ts` (via `pdfExporter.ts`)
- Human-readable summary: company, year, schema version, registry hash, mandatory coverage, missing required count, rows grouped by section (B1–C9)

## JSON export

`GET /api/reporting-period/[id]/export/json` returns the canonical dataset as downloadable JSON. **Must match** the row set written to XLSX for the same period state.

## Immutable snapshots

`GET /api/reporting-period/[id]/export` persists versioned `VsmeExportSnapshot` records including:

- `stateSnapshot` (values, completeness, `readinessSnapshot`)
- `exportData` (rows)
- `validationResult` (EFRAG + export validation)

## schemaVersion rules

- New periods are stamped with `VSME_SCHEMA_VERSION` (`2.0.0`)
- Export artifacts always include the period’s schema version
- Registry hash verifies the 264-field registry at export time

## Audit layers (read-only)

- Export validation API
- Export audit API (`export-audit`)
- Release readiness (`/api/vsme/release/readiness`)

These explain blocking state; they do not change export rows.
