# VSME Schema Changelog

## 2.0.0 — Full canonical EFRAG alignment (2026-05-21)

**Breaking:** All `fieldId` values from v1.0.0 scaffold are replaced. Existing `SustainabilityDataPoint` rows reference obsolete IDs.

**Migration:** Run `npm run db:migrate-vsme` (idempotent). Maps known v1 `fieldId`s via `lib/vsme/migration/v1ToV2FieldMap.ts`, sets `legacyFieldId` / `migratedFieldId` / `migrationStatus` on rows (no deletes). Periods with legacy rows use `schemaVersion: "2.0.0-legacy"`.

### Structural corrections

| v1 scaffold (incorrect) | v2.0.0 (EFRAG-aligned) |
|-------------------------|-------------------------|
| B4 = Emissions | B3 = Energy and GHG emissions |
| B5 = Water | B6 = Water |
| B6 = Waste | B7 = Resource use, circular economy and waste |
| B7 = Workforce | B8 = Workforce general characteristics |
| B8 = Health & safety | B9 = Health and safety |
| B9 = Training | B10 = Remuneration, collective bargaining and training |
| B10 = Supply chain | *(not a VSME basic disclosure — removed)* |
| B11 = Business impacts | B11 = Convictions and fines |
| — | B4 = Pollution of air, water and soil |
| — | B5 = Biodiversity |

### Added

- **~250+ explicit canonical fields** across B1–B11 and C1–C9
- EFRAG paragraph references per field (`efragParagraph`)
- Excel mapping: `{Sheet}!{XbrlNamedRange}` per Digital Template v1.1.0 convention
- Decomposed datapoints: energy renewable/non-renewable, male/female employees, Scope 3 categories, B2 sustainability-issue matrix, repeatable site/subsidiary/pollutant/material slots
- Registry metadata: `description`, `xbrlNamedRange`, `excelSheet`, `requiredForExport`, `workflowLabel`
- `templateVersion: "1.1.0"` on schema

### Deprecated / removed

- All v1.0.0 `fieldId` identifiers (e.g. `B3_ELECTRICITY_RENEWABLE`, `B4_SCOPE1_TOTAL`)
- Misaligned section content (supply chain, generic business impacts as B11)

### Renamed

- None (v1 IDs invalidated rather than renamed)

### Excel cell mapping status

- **Mapped:** `General`, `Environmental`, `Social`, `Governance` sheets + XBRL named-range identifiers aligned with EFRAG taxonomy element names
- **Placeholder slots:** Repeatable table rows (sites 1–5, subsidiaries 1–5, pollutants 1–8, materials 1–5) use indexed named-range suffixes; verify against installed Digital Template v1.1.0 before production XLSX export
- **Not verified byte-for-byte:** Exact Excel cell coordinates (e.g. `G12`) — LibreVS uses named ranges as the deterministic export key per EFRAG converter design

## 1.0.0 — Representative scaffold

- ~100 representative fields
- Placeholder `B3!C5` style cell references
- Incorrect B-section topic alignment vs EFRAG standard
