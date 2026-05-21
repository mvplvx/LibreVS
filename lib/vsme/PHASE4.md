# LibreVS Phase 4 — Schema-Driven VSME Reporting Engine

## Definition

LibreVS Phase 4 is a **schema-driven VSME reporting engine** aligned with **EFRAG** Excel structure.

The VSME schema is the **single source of truth** for:

- UI structure (`vsme.uiSchema.ts`, generated from `vsme.schema.ts`)
- Database field identifiers (`fieldId` in `SustainabilityDataPoint`)
- Export mapping to EFRAG Excel cells (`excelCell` per field)
- Applicability rules (`applicability.ts`) — workflow/export only

**One EFRAG Excel cell = one canonical field** in `vsme.fieldRegistry.ts`.

## B1–C9: equal schema fidelity

**CRITICAL:** C1–C9 are **not** optional modules in the technical architecture.

| Module | Sections | Schema | Workflow (<500 employees) | Workflow (501–1000) |
|--------|----------|--------|---------------------------|---------------------|
| **B** | B1–B11 | Full field-level registry | Required | Required |
| **C** | C1–C9 | Full field-level registry | Available (voluntary) | Required (comprehensive) |

“Optional” applies **only** to applicability (visibility / required flags), **not** to implementation depth, field count, or granularity.

## Applicability engine

`requiresComprehensiveModule(employeeCount)` → `employeeCount > 500`

Controls **only**:

- Section visibility (all B + C always visible)
- Required status in UI workflow
- Export validation (which fields must be completed)

Does **not**:

- Infer sustainability data
- Score companies
- Act as compliance AI

## Export rules

- **B-section fields:** always in export scope when reported; all B fields required for complete export
- **C-section fields:** required for complete export when `employeeCount > 500`; below threshold, included if user voluntarily completed any field in that section
- Mapping: `fieldId` → `path` → `excelCell` (deterministic)

## Implementation priority

1. Canonical VSME schema registry (`vsme.schema.ts`)
2. Field-level persistence (`fieldId` + `vsme.fieldRegistry.ts`)
3. Applicability logic (`applicability.ts`)
4. Dynamic schema-driven rendering (`vsme.uiSchema.ts` + `?employeeCount=`)
5. Export mapping layer (`exportMapping.ts`)

## Canonical registry v2.0.0

Full EFRAG-aligned B1–B11 + C1–C9 registry (~264 fields). See `SCHEMA_CHANGELOG.md`.

Excel mapping: `{Sheet}!{XbrlNamedRange}` per Digital Template v1.1.0.

## Stabilization (pre-expansion)

- Legacy `lib/api/intelligence.ts` and `lib/api/summary.ts` removed
- Coverage route: `GET /api/reporting-period/[id]/vsme-coverage`
- Data points: upsert + registry type/unit validation
- Metrics: `totalCoveragePercentage`, `mandatoryCoveragePercentage`, `exportReady`
- `ReportingPeriod.schemaVersion` stamped on create
- `PortfolioView` removed from schema

## Explicitly out of scope

- Benchmarking / peer comparison
- ESG scoring
- Automated materiality inference
- Enterprise workflow engine
- AI compliance interpretation
- Portfolio comparison

## Modules

| Module | Role |
|--------|------|
| `vsme.schema.ts` | Full B1–B11 + C1–C9 tree |
| `vsme.fieldRegistry.ts` | FIELD_ID registry + module/applicability metadata |
| `applicability.ts` | Employee-count workflow & export rules |
| `exportMapping.ts` | Export row build + completeness validation |
| `vsme.uiSchema.ts` | UI with required/optional flags per employee count |
| `validateField.ts` | API boundary for unknown fieldIds |
