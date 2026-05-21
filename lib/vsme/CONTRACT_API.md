# VSME API Contract (Phase 4F — Frozen)

Canonical HTTP semantics for LibreVS VSME runtime.  
Source of truth for rules: `lib/vsme/CONTRACT.ts`.  
Dev validation: `lib/vsme/dev/semanticValidator.ts`, `scripts/vsme-contract-test.ts`.

All successful responses use:

```json
{ "success": true, "data": <payload> }
```

Errors:

```json
{ "success": false, "error": "<message>" }
```

---

## Period intelligence pipeline (mandatory)

These routes **must** derive metrics from the same snapshot:

1. `loadPeriodIntelligence(reportingPeriodId, organizationId)`
2. `buildVsmePeriodSnapshot(...)` inside the loader

| Route | Purpose |
|-------|---------|
| `GET /api/reporting-period/[id]/kpis` | KPI metrics |
| `GET /api/reporting-period/[id]/vsme-coverage` | Coverage metrics |
| `GET /api/reporting-period/[id]/export` | Export rows + validation |
| `GET /api/reporting-period/[id]/dashboard` | Dashboard aggregate |

No alternate completeness calculators on these paths.

---

## KPI / coverage response (`data`) — frozen metrics

### Required top-level metric keys

| Key | Semantics |
|-----|-----------|
| `totalCoveragePercentage` | Share of **all 264 registry fields** with a stored v2 value |
| `mandatoryCoveragePercentage` | Share of **requiredToFill** fields with a stored v2 value |
| `exportReady` | `true` when `completeness.exportBlockingFields.length === 0` |

### Required `completeness` object

| Key | Semantics |
|-----|-----------|
| `inScopeFieldIds` | Fields in module reporting scope (employee count) |
| `materialFieldIds` | Fields with `materiality === "material"` |
| `requiredFieldIds` | Fields with `requiredToFill === true` |
| `completedFieldIds` | v2 fields with non-empty values |
| `missingRequiredFields` | Required but not completed |
| `missingMaterialFields` | Material but not completed |
| `exportBlockingFields` | Same as `missingRequiredFields` (blocks export) |

### Allowed supplementary keys (not frozen metrics)

- `completeness` (object above)
- `bySection` — per-section `{ reported, total }` (sidebar / section progress)
- `fieldsReported`, `totalFields`, `employeeCount`, `schemaVersion`, `reportingPeriodId`, `applicableSections`, `reportingState`
- Supplemental coverage percentages: `inScopeCoveragePercentage`, `materialCoveragePercentage`

### Forbidden at KPI / coverage root

| Key | Reason |
|-----|--------|
| `missingFieldIds` | Belongs under **export** `validation` only |
| `missingMandatoryFieldIds` | Deprecated — use `completeness.exportBlockingFields` |
| `requiredCoveragePercentage` | Deprecated alias — use `mandatoryCoveragePercentage` |

> **Transitional note:** responses may still include `requiredCoveragePercentage` as a deprecated mirror of `mandatoryCoveragePercentage` until alias removal. New clients must read `mandatoryCoveragePercentage` only.

---

## UI schema response (`GET /api/vsme/ui-schema`)

### Top-level (frozen)

| Key | Type |
|-----|------|
| `schemaVersion` | `"2.0.0"` |
| `templateVersion` | string |
| `standard` | `"VSME"` |
| `alignment` | `"EFRAG"` |
| `employeeCount` | number |
| `moduleCInReportingScope` | boolean |
| `sections` | array |

### Field object (frozen)

Each field in `sections[].subsections[].fields[]`:

| Key | Semantics |
|-----|-----------|
| `fieldId` | Registry v2 id |
| `path` | Stable path |
| `module` | Via `applicability.module` — `"B"` \| `"C"` |
| `applicability.materiality` | `"material"` \| `"non_material"` |
| `applicability.moduleInReportingScope` | Module obligation from employee count |
| `applicability.requiredToFill` | `moduleInReportingScope ∧ materiality === "material"` |
| `applicability.visible` | UI visibility |
| `applicability.workflowLabel` | Workflow label |

**Cardinality:** exactly **264** fields in a full schema build.

**Rule (frozen):** see `VSME_CONTRACT.requiredToFillRule`.

---

## Export response (`GET /api/reporting-period/[id]/export`)

### Top-level (frozen)

| Key | Semantics |
|-----|-----------|
| `exportReady` | Snapshot export readiness |
| `rows` | Array of export rows (v2 only) |
| `validation` | Export validation object |

No other top-level keys are part of the frozen export contract (metadata such as `year`, `schemaVersion`, `employeeCount` may be present as supplementary).

### `rows[]` item (frozen)

| Key | Required |
|-----|----------|
| `fieldId` | v2 registry id only |
| `excelCell` | Excel mapping |
| `path` | Registry path |
| `value` | Stored value |
| `unit` | string \| null |

### `validation` object (frozen)

| Key | Semantics |
|-----|-----------|
| `exportReady` | boolean |
| `missingFieldIds` | **Only place** this key is allowed |
| `missingSections` | string[] |
| `includedFieldIds` | string[] |
| `errors` | string[] |
| `warnings` | string[] |

**Invariants:**

- `export.source = v2_only` — legacy rows never appear in `rows`
- `validation.missingFieldIds` must match `completeness.exportBlockingFields` for the same period
- Deterministic row ordering (sorted field ids)

---

## Data-point GET (`GET /api/data-point`)

Active dataset (STRICT_V2):

- Only native v2 `fieldId` values from registry
- Legacy / migrated-only rows excluded from `data` array

---

## Registry freeze

| Module | Fields |
|--------|--------|
| Total | 264 |
| B (B1–B11) | 215 |
| C (C1–C9) | 49 |

`schemaVersion` on reporting periods and API payloads: **`2.0.0`**.
