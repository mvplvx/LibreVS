# LibreVS RC1 — Release Candidate 1

RC1 is the first public open-source release candidate for structured VSME reporting infrastructure. It targets consultants, pilots, and SMEs who self-host PostgreSQL locally.

## Version identifiers

| Item | Value |
|------|--------|
| Release candidate | RC1 |
| App version | 0.8.0-rc1 |
| VSME schema | 2.0.0 |
| Registry fields | 264 |

Optional build metadata: set `LIBREVS_GIT_SHA` in `.env` to show a short commit hash in the footer and `/api/librevs/version`.

## RC1 scope

Included:

- Full VSME B/C reporting workspace with materiality and export validation
- Deterministic JSON, XLSX, and PDF exports
- Export audit and export-review workflow
- System health diagnostics at `/system/health`
- Data safety guidance at `/system/backup`
- Startup validation and human-readable boot errors
- No telemetry

Excluded (by design):

- User accounts, billing, cloud hosting
- AI-assisted reporting or scoring
- Non-VSME frameworks

## QA checklist (manual)

### Core

- [ ] Application boots without startup errors
- [ ] `GET /api/system-health` returns `databaseReachable: true`
- [ ] UI schema loads 264 fields
- [ ] Reporting periods selectable; save and reload field values
- [ ] Materiality persists per period
- [ ] Export validation is deterministic for the same data

### UX

- [ ] Disclosure grouping and entity cards render
- [ ] Conditional disclosure trees (§61/62, C6/C7) behave correctly
- [ ] No raw field IDs in standard UX (developer mode off)
- [ ] Narrative fields auto-expand
- [ ] Save indicators (dirty / saving / saved / error) work
- [ ] Footer community links work

### Export

- [ ] Export disclaimer visible on dashboard and export review
- [ ] JSON export includes `reportingCurrency` in metadata when configured
- [ ] XLSX and PDF blocked when validation fails
- [ ] Export audit panel matches validation blocking fields

### Integrity

- [ ] No duplicate KPI fields in API responses
- [ ] No schema or fieldId drift from registry
- [ ] No frontend-only compliance bypass

## Automated smoke

```bash
npm run phase8:smoke
```

Runs phase6 + phase7b checks plus RC1-specific API and disclaimer checks.

## Reporting issues

Use [GitHub Issues](https://github.com/mvplvx/LibreVS/issues) with:

- LibreVS version (`/api/librevs/version`)
- Steps to reproduce
- Whether export-ready or blocked
- Relevant section codes (no full database dumps in public issues)

## Upgrade from earlier dev builds

1. Backup PostgreSQL
2. Pull RC1
3. `npm install && npx prisma migrate deploy`
4. Restart server
5. `npm run phase8:smoke`
