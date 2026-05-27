# LibreVS

**LibreVS RC1** — open-source, local-first infrastructure for EU VSME (Voluntary SME) sustainability reporting. EFRAG-aligned, schema-driven, deterministic exports.

## What LibreVS is

- A **structured reporting workspace** for the EFRAG VSME framework (264 disclosure fields, modules B and C)
- **Self-hosted** on your PostgreSQL database
- **Deterministic** validation and export (JSON, XLSX, PDF) — no AI-generated reporting logic
- **Materiality management** and export audit traceability aligned to registry rules

## What LibreVS is not

- Not a SaaS product, hosted compliance service, or ESG marketing platform
- Not legal advice, audit certification, or regulatory filing submission
- Not telemetry or analytics software — **no usage tracking**
- Not multi-tenant user accounts or billing (Community Edition is single-org local deploy)

## Supported scope

- **EU VSME only** (EFRAG Voluntary SME standard, schema version 2.0.0)
- Reporting currency metadata for EU currencies (display/export only — no FX)
- Employee-count-driven Comprehensive module scope (C module mandatory at ≥500 employees)

## Philosophy

LibreVS is built for **digital sovereignty**: your data stays in your database. You control backups, upgrades, and retention. The application validates completeness against a frozen field registry and produces reproducible export artifacts for review by your team or advisors.

**License:** AGPLv3 — see [LICENSE](./LICENSE).

## Minimum requirements

- Node.js 20+
- PostgreSQL 16+
- ~512 MB RAM for development; production sizing depends on concurrent users

## Quick start (local)

```bash
git clone https://github.com/mvplvx/LibreVS.git
cd LibreVS
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000) — project home
- [http://localhost:3000/vsme](http://localhost:3000/vsme) — reporting workspace
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard) — coverage overview
- [http://localhost:3000/system/health](http://localhost:3000/system/health) — RC1 diagnostics

One command for database setup:

```bash
npm run db:setup
```

## Docker

```bash
docker compose up --build
```

The container runs migrations and seed on first start. Configure `DATABASE_URL` via environment or compose overrides. See [docs/INSTALL.md](./docs/INSTALL.md).

## Prisma migrations

After pulling a new release:

```bash
npx prisma migrate deploy
```

Always **back up your database** before migrating. See [Data safety](http://localhost:3000/system/backup) in the running app or [docs/INSTALL.md](./docs/INSTALL.md).

## Backup recommendation

LibreVS stores all reporting data in **your** PostgreSQL instance. Schedule regular `pg_dump` backups. Export artifacts are a complement, not a substitute for database backups.

## Upgrade guidance

1. Back up the database
2. Pull the release tag or commit
3. `npm install`
4. `npx prisma migrate deploy`
5. Restart the application
6. Run `npm run phase8:smoke` against your instance

## Export disclaimer

LibreVS structures disclosures, validates completeness, and generates deterministic exports. It does **not** provide legal advice, guarantee regulatory acceptance, or replace auditors or consultants. Review all exports before external use.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run db:seed` | Demo org, company, period, sample data |
| `npm run db:setup` | Migrate + seed |
| `npm run seed:test` | Pilot dataset (2 companies, partial data) |
| `npm run phase6:smoke` | Core API and export gate checks |
| `npm run phase7b:smoke` | UX and branding checks |
| `npm run phase8:smoke` | RC1 release candidate smoke test |
| `npm run export:regression-test` | XLSX/PDF artifact regression |
| `npm run vsme:contract-test` | Registry contract validation |

## System health

- API: `GET /api/system-health`, `GET /api/librevs/version`
- UI: [/system/health](/system/health) (read-only diagnostics)

Startup validates `DATABASE_URL`, database connectivity, schema version `2.0.0`, and the 264-field registry (`instrumentation.ts`).

## Documentation

- [docs/INSTALL.md](./docs/INSTALL.md) — installation and troubleshooting
- [docs/RC1.md](./docs/RC1.md) — release candidate notes and QA checklist
- [docs/VSME_ARCHITECTURE.md](./docs/VSME_ARCHITECTURE.md) — registry and modules
- [docs/EXPORT_SYSTEM.md](./docs/EXPORT_SYSTEM.md) — export artifacts
- [docs/MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) — v1 → v2 migration

## Community

- [GitHub](https://github.com/mvplvx/LibreVS)
- [Discussions](https://github.com/mvplvx/LibreVS/discussions) — feature suggestions
- [Issues](https://github.com/mvplvx/LibreVS/issues) — bug reports
- contact@librevs.org
