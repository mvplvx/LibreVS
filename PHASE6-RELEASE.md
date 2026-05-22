# Phase 6 — Controlled test-user release

LibreVS is packaged for local controlled validation (not public launch).

## Quick start (Docker)

```bash
docker compose up --build
```

- App: http://localhost:3000
- VSME entry: http://localhost:3000/vsme
- PostgreSQL: `localhost:5432` (user/pass/db: `librevs`)

On first start the container runs migrations, base seed, and test-environment seed.

## Local dev (without Docker)

```bash
cp .env.docker.example .env
docker compose up db -d
npx prisma migrate deploy
npm run db:seed
npm run seed:test
npm run dev
```

## Test companies (seed)

| Company | Employees | Module scope |
|---------|-----------|--------------|
| Nordic SME Pilot (<500) | 120 | B required, C optional |
| Growth Corp Pilot (≥500) | 650 | B + C in scope |

Each has reporting periods **2024** and **2025** with **partial** data (incomplete by design).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run seed:test` | Realistic incomplete test data |
| `npm run phase6:smoke` | Release readiness checks |
| `npm run export:regression-test` | XLSX/PDF artifact regression |

## Pilot mode

Set `LIBREVS_PILOT_MODE=1` and `NEXT_PUBLIC_LIBREVS_PILOT_MODE=true` (default in Docker compose).

- Minimal **LibreVS Pilot Mode** banner on `/vsme` and `/dashboard`
- Read-only readiness: `GET /api/vsme/release/readiness`
- Console pilot telemetry when pilot mode is on
- Export snapshot JSON includes `readinessSnapshot` (exportReady, missing mandatory count, system health at export time)
- Export is blocked only when system health is **red** (in addition to existing field validation)

## Observability

Structured JSON logs to stdout when `LIBREVS_LOG=1` (default in Docker).

Events: `export.attempted`, `export.success`, `export.failure`, `export.validation_blocked`, `export.readiness_blocked`, `field.save.error`, `feedback.received`.

Set `LIBREVS_LOG=0` to disable.

## Feedback

`POST /api/feedback` with `{ message, reportingPeriodId?, fieldId?, section? }` — stored in `VsmeFeedback` table.

## VSME onboarding flow

1. Open `/vsme`
2. Select company
3. Create reporting period if none exist (inline CTA)
4. Enter data (schema-driven)
5. Export XLSX or PDF from the workspace (when `exportReady`)

No dashboard dependency required for the core path.
