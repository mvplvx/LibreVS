# VSME architecture

LibreVS implements the EFRAG VSME standard as a **canonical 264-field registry** with a strict V2 runtime. The UI, APIs, and exports are derived from this registry — not hardcoded forms.

## Registry model

- **Source:** `lib/vsme/vsme.schema.ts` + section files under `lib/vsme/sections/`
- **Registry:** `lib/vsme/vsme.fieldRegistry.ts` — one entry per field with stable `fieldId`, Excel/XBRL mapping, labels
- **Version:** `2.0.0` (`VSME_SCHEMA_VERSION`)
- **Cardinality:** 264 fields — 215 in Module B, 49 in Module C

Each field has:

- `fieldId` — stable uppercase key (e.g. `B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH`)
- `module` — `B` or `C`
- `excelCell`, `xbrlNamedRange`, `excelSheet` — export mapping
- Optional `efragParagraph` / `efragReference` — UI traceability only

## B vs C modules

| Module | Sections | Reporting scope |
|--------|----------|-----------------|
| **B** (Basic) | B1–B11 | Always in scope for in-scope SMEs |
| **C** (Comprehensive) | C1–C9 | Mandatory when employee count ≥ 500 |

Applicability is **employee-count driven** (`lib/vsme/moduleScope.ts`), not inferred from data.

## Materiality system

Per field, per reporting period:

- `material` — required to fill when module is in reporting scope
- `non_material` — excluded from export selection

**Rule (frozen):**

`requiredToFill = moduleInReportingScope ∧ materiality === "material"`

Stored in `VsmeFieldMateriality`. Absent keys default to `material` in runtime calculations.

## UI schema

`buildVsmeUiSchema()` produces the structure for `/vsme`:

- Sections → subsections → fields
- Applicability flags (`moduleInReportingScope`, `requiredToFill`, `workflowLabel`)
- No hardcoded B1–C9 layout in React components

## Data truth mode

`STRICT_V2` — legacy v1 rows and migration-mapped rows are excluded from business logic. Only native v2 `fieldId` values drive completeness, export, and KPIs.

## Reporting state

Derived (not persisted) from period snapshot:

- Materiality defined → values entered → required complete → export ready → exported

See `lib/vsme/getReportingState.ts`.

## Related docs

- [EXPORT_SYSTEM.md](./EXPORT_SYSTEM.md)
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- `lib/vsme/CONTRACT_API.md` — frozen API shapes
