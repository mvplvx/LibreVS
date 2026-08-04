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

**Self-hosted runtime (typical):**

- Docker Desktop or Docker Engine + Compose
- LibreVS Deployment Manager (native installer) for day-to-day operation
- ~512 MB RAM minimum; production sizing depends on concurrent users

**Developer / non-Docker local stack:**

- Node.js 20+
- PostgreSQL 16+

## How you run LibreVS

After first installation, **LibreVS Deployment Manager** is the official operational interface:

1. Install Docker and place LibreVS files on disk (see [docs/INSTALL.md](./docs/INSTALL.md)).
2. Install Deployment Manager from a release/CI installer (Windows NSIS/MSI or Linux AppImage/deb).
3. Open **LibreVS** from the Start Menu — the manager starts services, waits for health, and opens the browser.
4. Ordinary organization users open only the configured URL in a browser; they do not use Docker or Deployment Manager.

End users do **not** need Node.js or Rust. Those are build-time tools for developers packaging Deployment Manager.

Full guide: [deployment/DEPLOYMENT_MANAGER.md](./deployment/DEPLOYMENT_MANAGER.md) · Windows server: [docs/INSTALL_WINDOWS_SERVER.md](./docs/INSTALL_WINDOWS_SERVER.md)

## Quick start (developers — local Node)

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

## Docker (bootstrap / recovery)

```bash
docker compose up --build -d
```

Use Compose for first bootstrap or troubleshooting. Prefer Deployment Manager for normal daily start/stop. The container runs migrations and seed on first start. See [docs/INSTALL.md](./docs/INSTALL.md).

## Developer: build Deployment Manager

```bash
cd deployment
npm install
npm run tauri:dev    # development
npm run tauri:build  # native installers
```

CI packaging: `.github/workflows/deployment-manager.yml` (unsigned Windows artifacts may trigger SmartScreen until code signing is added).

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

- [docs/INSTALL.md](./docs/INSTALL.md) — first-time install, daily use, org server
- [docs/INSTALL_WINDOWS_SERVER.md](./docs/INSTALL_WINDOWS_SERVER.md) — Windows server guide
- [deployment/DEPLOYMENT_MANAGER.md](./deployment/DEPLOYMENT_MANAGER.md) — operational interface
- [docs/RC1.md](./docs/RC1.md) — release candidate notes and QA checklist
- [docs/VSME_ARCHITECTURE.md](./docs/VSME_ARCHITECTURE.md) — registry and modules
- [docs/EXPORT_SYSTEM.md](./docs/EXPORT_SYSTEM.md) — export artifacts
- [docs/MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) — v1 → v2 migration

## Community

- [GitHub](https://github.com/mvplvx/LibreVS)
- [Discussions](https://github.com/mvplvx/LibreVS/discussions) — feature suggestions
- [Issues](https://github.com/mvplvx/LibreVS/issues) — bug reports
- contact@librevs.org
