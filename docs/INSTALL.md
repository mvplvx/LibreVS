# Install LibreVS

Professional installation guide for self-hosted VSME reporting (RC1).

## What you are installing

LibreVS is **local-first reporting infrastructure**. All sustainability data, materiality decisions, and export snapshots live in **your** PostgreSQL database. LibreVS does not operate a central cloud datastore for your reports.

**No telemetry:** the application does not send usage analytics or tracking events to LibreVS-operated services.

## Requirements

- Node.js 20+
- PostgreSQL 16+
- npm

## Step-by-step (local)

### 1. Clone and install

```bash
git clone https://github.com/mvplvx/LibreVS.git
cd LibreVS
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LIBREVS_LOG` | No | `1` = structured JSON logs |
| `LIBREVS_GIT_SHA` | No | Short commit shown in footer (optional) |
| `LIBREVS_PILOT_MODE` | No | Pilot banner (optional) |
| `NEXT_PUBLIC_LIBREVS_PILOT_MODE` | No | Client pilot banner |

Secrets must never be committed. LibreVS startup errors reference variable **names** only, not connection string values.

### 3. Database

```bash
npx prisma migrate deploy
npm run db:seed
```

**`db:seed` creates:**

- Demo organization and user
- LibreVS Demo Company (120 employees, default currency)
- 2025 reporting period with sample v2 datapoints

Extended pilot data (two companies, incomplete exports):

```bash
npm run seed:test
```

### 4. Run

```bash
npm run dev
```

| URL | Purpose |
|-----|---------|
| `/vsme` | Reporting workspace |
| `/dashboard` | Coverage and export |
| `/system/health` | RC1 diagnostics |
| `/system/backup` | Data safety guidance |

### 5. Verify

```bash
npm run phase8:smoke
```

## Docker installation

```bash
docker compose up --build
```

The application image runs `prisma migrate deploy` and seed via `scripts/docker-entrypoint.sh`. Default compose includes PostgreSQL and sets pilot-related environment variables.

Override `DATABASE_URL` when using an external database. Set `LIBREVS_SEED_TEST_ENV=0` to skip the extended test seed on container start.

## Prisma migrations

Apply migrations on every deploy:

```bash
npx prisma migrate deploy
```

If startup reports schema version mismatch, ensure you are on a LibreVS release that targets VSME **2.0.0** and that migrations completed successfully.

## Backup recommendation

Before upgrades or schema migrations:

```bash
pg_dump "$DATABASE_URL" -Fc -f librevs-backup.dump
```

Store backups according to your retention policy. LibreVS cannot recover lost database files from export PDFs alone.

## Upgrade guidance

1. Stop the application (or put it in maintenance if you use a proxy)
2. Backup PostgreSQL
3. Pull the new release
4. `npm install`
5. `npx prisma migrate deploy`
6. Start the application
7. Run `npm run phase8:smoke`

## Troubleshooting

| Issue | Action |
|-------|--------|
| Startup throws on `DATABASE_URL` | Copy `.env.example` → `.env`; verify Postgres is running |
| Startup throws on registry | Ensure full repository checkout; expect 264 fields |
| Empty `/vsme` workspace | Run `npm run db:seed` or `npm run seed:test` |
| Export blocked | Complete required material fields; use export audit on `/vsme` |
| `/system/health` shows DB unreachable | Check network, credentials, and `DATABASE_URL` host |
| Footer version stale after upgrade | Restart Node process after `prisma generate` |

## Export disclaimer

LibreVS validates structural completeness against deterministic rules. Regulatory acceptance and legal adequacy remain your responsibility. See `/vsme/export-review` for export validation detail.
