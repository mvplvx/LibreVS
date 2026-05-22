# LibreVS

EU VSME (Voluntary SME) reporting workspace — schema-driven, EFRAG-aligned, strict V2 field registry (264 fields).

## Run LibreVS locally in 3 steps

1. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Ensure PostgreSQL is running and `DATABASE_URL` in `.env` is correct.

2. **Initialize database**

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   ```

   `db:seed` creates the demo organization, user, one demo company, one 2025 reporting period, and sample v2 datapoints.

3. **Start the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000/vsme](http://localhost:3000/vsme) for VSME data entry, or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for coverage metrics.

### One-command setup

```bash
npm run db:setup && npm run dev
```

Runs migrations and full seed, then start the dev server separately.

### Docker

```bash
docker compose up --build
```

See [PHASE6-RELEASE.md](./PHASE6-RELEASE.md) for pilot mode, smoke checks, and test companies.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run db:seed` | Demo org + VSME company/period + sample data |
| `npm run db:setup` | Migrate + seed |
| `npm run seed:test` | Extended incomplete pilot dataset (2 companies) |
| `npm run phase6:smoke` | Release readiness HTTP smoke checks |
| `npm run vsme:contract-test` | VSME contract / registry tests |

## System health

- API: `GET /api/system-health`
- UI: status dot on dashboard header → [/system](/system)

Startup validates database reachability, schema version `2.0.0`, and 264-field registry load (see `instrumentation.ts`).

## Documentation

- [docs/INSTALL.md](./docs/INSTALL.md) — detailed install
- [docs/VSME_ARCHITECTURE.md](./docs/VSME_ARCHITECTURE.md) — registry & modules
- [docs/EXPORT_SYSTEM.md](./docs/EXPORT_SYSTEM.md) — export artifacts
- [docs/MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) — v1 → v2
