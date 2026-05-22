# Install LibreVS

## Requirements

- Node.js 20+
- PostgreSQL 16+
- npm

## Step-by-step

### 1. Clone and install

```bash
git clone <repository-url>
cd librevs
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LIBREVS_LOG` | No | `1` = structured JSON logs (default on) |
| `LIBREVS_PILOT_MODE` | No | Pilot banner + telemetry |
| `NEXT_PUBLIC_LIBREVS_PILOT_MODE` | No | Client pilot banner |

### 3. Database

```bash
npx prisma migrate deploy
npm run db:seed
```

**What `db:seed` creates:**

- Demo organization (`librevs-demo-org`)
- Demo user (`demo@librevs.local`)
- One company: **LibreVS Demo Company** (120 employees)
- One reporting period: **2025** with partial sample v2 values

For the extended pilot dataset (two companies, four periods):

```bash
npm run seed:test
```

### 4. Run

```bash
npm run dev
```

- VSME entry: http://localhost:3000/vsme
- Dashboard: http://localhost:3000/dashboard
- System diagnostics: http://localhost:3000/system

### 5. Verify

```bash
npm run phase6:smoke
```

Expect HTTP 200 from `/api/system-health`, `/api/vsme/ui-schema`, and core reporting APIs.

## Docker

```bash
docker compose up --build
```

The app container runs migrations and seeds on first start when `LIBREVS_SEED_TEST_ENV=1`.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Startup throws on registry | Ensure repo is complete; field count must be 264 |
| Empty `/vsme` | Run `npm run db:seed` |
| Database connection errors | Check `DATABASE_URL` and that Postgres is listening |
| Export blocked | Complete required material fields; check `/system` for period export state |
