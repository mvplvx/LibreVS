# Migration guide

## v1 → v2 field IDs

LibreVS v2 uses canonical registry `fieldId` values (e.g. `B3_ELECTRICITY_ELECTRICITY_TOTAL_MWH`). Legacy v1 keys are not used in business logic under `STRICT_V2`.

### Stored data

- Native v2 rows: `fieldId` matches registry
- Legacy rows: may have `legacyFieldId`, `migrationStatus` — **excluded** from completeness and export
- Mapping table: `lib/vsme/migration/v1ToV2FieldMap.ts`

### Migration script

```bash
npm run db:migrate-vsme:dry-run   # preview
npm run db:migrate-vsme           # apply
```

### Validation

After migration:

- `GET /api/system-health` → `legacyFieldsDetected: false` for a clean v2-only DB
- `npm run vsme:contract-test` — registry and API contract checks

## Schema version upgrades

Current canonical version: **2.0.0**

| Version | Meaning |
|---------|---------|
| `2.0.0` | Full B1–C9 registry (264 fields), strict V2 runtime |
| Legacy | Pre-v2 periods may exist in DB; new work uses v2 only |

When a future registry version ships:

1. Bump `VSME_SCHEMA.version` and `VSME_SCHEMA_VERSION`
2. Add section/field definitions and registry entries
3. Run contract tests and `phase6:smoke`
4. Document breaking changes here

**Do not** change existing `fieldId` values — they are stable API and export keys.

## Reporting periods

New periods receive `schemaVersion: "2.0.0"` at creation. Export snapshots record the version at generation time for audit trails.

## Recommended upgrade path

1. Backup database
2. Deploy new application version
3. Run `npx prisma migrate deploy`
4. Run v1→v2 field migration if legacy data exists
5. Re-seed demo data in dev: `npm run db:seed`
6. Verify `/api/system-health` and `npm run phase6:smoke`
