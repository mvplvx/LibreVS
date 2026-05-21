# LibreVS Phase 4 — Schema-Driven VSME Reporting Engine

## Definition

LibreVS Phase 4 is a **schema-driven VSME reporting engine** aligned with **EFRAG** Excel structure.

The VSME schema is the **single source of truth** for:

- UI structure (`lib/vsme/vsme.uiSchema.ts`, generated from `vsme.schema.ts`)
- Database field identifiers (`fieldId` in `SustainabilityDataPoint`)
- Export mapping to EFRAG Excel cells (`excelCell` per field)

**One EFRAG Excel cell = one canonical field** in `lib/vsme/vsme.fieldRegistry.ts`.

## Core principles

1. **Schema is source of truth** — Sections B1–B11 (mandatory SME) and C1–C9 (conditional, 501–1000 employees) are defined explicitly in code.
2. **UI is generated from schema** — No hardcoded forms; rendering reads `VSME_UI_SCHEMA`.
3. **DB stores `fieldId` values only** — No free-form `category` / `key` pairs.
4. **Export is deterministic** — `fieldId` → path → `excelCell` mapping without interpretation.
5. **Local, single-installation** — One organization per deployment; data stays isolated.

## Explicitly out of scope (Phase 4)

- No AI inference or narrative generation
- No ESG scoring or risk interpretation engine
- No portfolio comparison or multi-company benchmarking
- No cross-company analytics or ranking
- No compliance validation engine (no pass/fail rules engine beyond `fieldId` validation)

## Data flow

```
vsme.schema.ts
    → vsme.fieldRegistry.ts (FIELD_ID → path)
    → vsme.uiSchema.ts (UI sections/subsections/fields)
    → API writes (validateFieldId)
    → SustainabilityDataPoint { fieldId, value, unit }
    → Export (Excel / JSON by excelCell)
```

## Modules

| Module | Role |
|--------|------|
| `vsme.schema.ts` | Full canonical VSME tree |
| `vsme.fieldRegistry.ts` | Flattened FIELD_ID registry |
| `vsme.uiSchema.ts` | UI generator output |
| `validateField.ts` | Reject unknown fields at API boundary |

## Validation rule

All data-point writes must call `validateFieldId(fieldId)` before insert. Unknown `fieldId` → HTTP 400 JSON.
