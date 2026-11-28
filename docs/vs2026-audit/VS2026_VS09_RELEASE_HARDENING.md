# VS-09.1 — Docker build recovery and release verification

Verdict: **READY FOR CONTROLLED PILOT WITH DOCUMENTED LIMITATIONS**.

This is a private, single-instance pilot decision. It is not a general production certification and not permission to publish the service on the internet.

## A. Release verdict

`READY FOR CONTROLLED PILOT WITH DOCUMENTED LIMITATIONS`

The production image builds, starts, migrates a fresh database, and completes a first-year Option A report through finalisation and JSON, Excel, and PDF download. No P0 defect remained in that journey. The limitations in section L are part of the decision.

## B. Build failure diagnosis

The earlier `docker build -t librevs:vs09 .` exited 102. Prisma Client generation was not the defect.

Evidence:

- The build log reached `Generated Prisma Client (v6.19.3)` and was cut off on the next success line. There was no Prisma stack trace.
- At the same time, the development database container `librevs-db` logged `could not write lock file "postmaster.pid": No space left on device`, then `Read-only file system`.
- The filesystem that filled was `/dev/sda4`, the root filesystem. Docker's data root is `/var/lib/docker` on that same filesystem.
- Inodes were about 21% used. This was not inode exhaustion.
- The build context was 21.96 MB. `.dockerignore` already excluded `node_modules`, `.next`, `.git`, and database dumps.
- The Dockerfile at that time installed dependencies twice, in parallel (`npm ci` and `npm ci --omit=dev`). Each tree is about 1 GB. The host had roughly 3.3 GB free after a previous cache prune, which was not enough for those layers plus the Next.js build and image export.

Exit 102 is the build ending when the disk was full, during the layer commit that followed a successful generate.

## C. Storage resolution

Nothing that could not be shown to be disposable was deleted.

Preserved:

- Volumes `librevs_librevs_pgdata` and `nordtier_postgres_data`
- Images `nordtier-app`, `librevs-app`, `postgres:16-alpine`, and `alpine`
- The running `librevs-app` container and the development database `librevs-db`

Freed:

- The npm download cache, `npm cache clean --force`. It was `/home/mvp/.npm/_cacache`, 2.8 GB, and is recreated by later installs. Free space rose from 3.3 GB to 5.8 GB.
- After the new image existed, `docker builder prune -af` removed only build cache and reclaimed 4.671 GB. The tagged image remained.

The Dockerfile was also changed so the build installs dependencies once, installs OpenSSL before `prisma generate`, and derives the runtime tree with `npm prune --omit=dev`. Prisma Client is generated once. That is the Dockerfile that produced `librevs:vs09`. It is in the working tree and is not yet committed.

## D. Docker image

Command:

```bash
docker build -t librevs:vs09 .
```

- Started: 2026-11-28T11:36:13Z
- Finished: 2026-11-28T12:09:59Z
- Duration: 2,026,888 ms
- Exit status: 0
- Image: `sha256:f8ff028cf23f84be63bb676a35d65393b328498875393b8e8932bb09503b56e0`
- Size: 2.83 GB
- User: `librevs`
- Runtime environment does not contain `BETTER_AUTH_SECRET` or a `.env` file
- Fonts present: `assets/fonts/NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, and `OFL.txt`
- Prisma CLI, generated client, and `provision-auth-user.cjs` are present

Free space after the cache prune was 3.2 GB. It was about 3.0 GB after the pilot database was running.

The image is large because the runtime stage contains the production `node_modules` needed for `prisma migrate deploy`. BuildKit warned that the builder stage sets `BETTER_AUTH_SECRET`. That value is the known build placeholder and is not in the final image configuration. The entrypoint rejects it if it is supplied at runtime.

## E. Production startup

Compose project `librevs-vs09`, image `librevs:vs09`, host port 3010 because port 3000 is already used by the older `librevs-app` container. PostgreSQL 16 is on the Compose network only. Its host port is not published. The application waits for the database health check, applies migrations, and does not seed.

`/api/system-health` returned `status: ok` and `databaseReachable: true`. The body does not contain a connection string or a secret.

Twenty migrations were applied, including the VS 2026 snapshot migrations. An application restart ran migrations again and came back healthy. Sign-in and the earlier PDF download still worked (44,297 bytes).

## F. Database

Fresh database volume: `librevs-vs09_librevs_pgdata`. Restarting `librevs-vs09-db-1` without removing that volume left the reporting period and the finalised snapshot in place. The snapshot content hash after the restart was unchanged:

`99421adf9297f6ec4d46c16ddce0d262f5787d925c6fdcedad98c5a5b4d73927`

Backup command:

```bash
COMPOSE_PROJECT_NAME=librevs-vs09 ./scripts/backup-database.sh /tmp/librevs-vs09/pilot.dump
```

The dump is custom format, mode 600, 47,630 bytes. It was restored into a new container, `librevs-vs09-restore`, which is not `librevs-db` and had no published port.

Restored counts: 3 users, 3 organisations, 2 reporting periods, 43 facts, 4 repeating rows, 1 snapshot. The extra user is `demo@librevs.local`, inserted by migration `20260521140000_add_org_user_portfolio_views`. That user has no credential account and no password. The two provisioned operators each have one password account.

The restored snapshot row verified under integrity scheme 2. Rendering that row produced JSON containing the undertaking name and Option A, a PDF of 44,297 bytes that embeds Noto Sans, and an Excel file of 23,536 bytes. Those sizes match the downloads taken from the running application. The restore container was removed after the check. The development volume was not restored over and was not deleted.

## G. Tests

Both runs were after the Docker build had finished, with `librevs-db` accepting connections.

```bash
npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts
```

- Run 1: 175 passed, 0 failed, 130,316 ms
- Run 2: 175 passed, 0 failed, 130,562 ms

```bash
npx prisma validate
npx tsx --env-file=.env --test lib/auth.security.test.ts
```

Prisma schema is valid. Authentication tests: 3 passed, 0 failed.

No transaction timeout occurred in these runs. The earlier timeouts happened while a Docker build was filling the disk.

## H. PDF Unicode

The renderer embeds Noto Sans Regular and Bold from `assets/fonts`, under the SIL Open Font License in `assets/fonts/OFL.txt`. The font is in the image. Characters the font cannot encode still fall back to a `U+` code point. That is not a claim of universal coverage.

The automated render suite, including the European sample, passed inside the 175 tests. The production report for `Ångström Pilot AB`, with site city `Göteborg`, produced a PDF that contains the Noto Sans font name and the glyphs for U+00C5 and U+00F6, and does not contain the `U+00C5` placeholder.

## I. Security

Checked against the running container:

- Public sign-up returned HTTP 400.
- Company and period requests without a session returned HTTP 401, including requests that sent forged `x-user-id` and `x-organization-id` headers.
- A second organisation could sign in and received HTTP 404 for the first organisation's snapshot and reporting period, even with forged identity headers.
- An unknown snapshot id returned HTTP 404.
- Legacy JSON export and the legacy data-point write returned HTTP 410 for an owned period.
- The sign-in response set a `Secure` cookie. `BETTER_AUTH_URL` was `https://127.0.0.1:8443`.
- Health and the downloaded report did not contain `postgres://`, `password`, `secret`, or `session`.
- The image has no `.env` and the runtime environment has no authentication secret.

Trusted origins are the origin of `BETTER_AUTH_URL`. `LIBREVS_TRUSTED_PROXIES` was empty, so the application does not use a client-supplied `X-Forwarded-For`. The test proxy replaced `Host` with the public origin and set `X-Forwarded-Host` and `X-Forwarded-Proto` itself. A direct HTTP sign-in to port 3010 does not match that origin.

The sign-in limiter is in-process. With no trusted proxy it cannot see a distinct client address, so it uses one shared bucket. That matches a single application container. It is not a shared limit across replicas.

Production `npm audit --omit=dev`: 14 findings (3 moderate, 10 high, 1 critical). The critical rollup is Next.js 16.2.6, which is inside the published range through 16.4.4. The app has `proxy.ts` and server actions, so the Next.js items are not obviously irrelevant. No Next.js upgrade was applied: it was not verified, and another image build on this disk was not safe. The community `xlsx` package still has high findings and is not the VS 2026 Excel path; that path uses ExcelJS. `npm audit fix --force` was not run.

An old migration inserts a passwordless `demo@librevs.local` user. The container entrypoint does not run the development seed and does not create a usable demo password.

## J. End-to-end test

The journey used the production container, not the development database.

1. Provisioned organisation "Pilot Manufacturing" and `pilot.operator@example.test` with `provision-auth-user.cjs`. The password was read from a file and was not printed by the provision command.
2. Signed in over HTTPS. The session cookie was `Secure`.
3. Created undertaking `Ångström Pilot AB`, currency EUR.
4. Created reporting period 2026.
5. Selected Option A through the production server action.
6. Recorded 48 employees, category `EMPLOYEES_GT_10`, and an explicit first-year basis.
7. Saved B1–B11 gate values, including boolean `false`, through the same actions.
8. Added a B1 site in Göteborg and a B5 site assessment that references that site.
9. Recorded dimensioned electricity and fuels, including renewable electricity 12.5 MWh and non-renewable electricity 0.
10. Filled the remaining required facts until the editor page said "Ready for internal review". Readiness was not written directly in the database.
11. Confirmed the undertaking declaration and finalised revision 1, snapshot `cmx0e40td003np5014725g760`.
12. Changed `B1_LEGAL_FORM` after finalisation. The snapshot JSON stayed byte-for-byte identical and still contained `Aktiebolag`, not the later value.

The editor page after save contained `Aktiebolag` and `Göteborg`.

## K. Export verification

All three downloads were HTTP 200 for that snapshot:

| Format | Bytes | Checked |
| --- | ---: | --- |
| JSON | 64,184 | Option A, year 2026, `EU-2026/1560`, undertaking name, Göteborg, 12.5, conformity text, first-year basis |
| XLSX | 23,536 | Undertaking name and Göteborg |
| PDF | 44,297 | Noto Sans, U+00C5 and U+00F6, no `U+00C5` placeholder |

The conformity text states that Ångström Pilot AB prepared the 2026 report under Regulation (EU) 2026/1560, Option A, and that the undertaking is responsible. `assuranceOpinion` is false. The JSON description says the file is a LibreVS structured report and not an EFRAG XBRL filing.

The same content hash, PDF size, and Excel size were produced again from the restored database row.

## L. Remaining risks

### P0

None in the verified pilot journey.

### P1

- This host cannot spare a second full image build without removing Docker build cache first. The export step filled a 43 GB disk.
- Next.js 16.2.6 is inside a published advisory range that includes critical items. It was not upgraded in this pass.
- The sign-in rate limit is per process and, until `LIBREVS_TRUSTED_PROXIES` names a real proxy, does not distinguish clients.
- A sign-in from an origin other than `BETTER_AUTH_URL` is shown as "The email or password is not valid."
- The authenticated browser session was not completed. The browser rejected the local self-signed HTTPS certificate, and the HTTP origin is intentionally not trusted.

### P2

- The image is 2.83 GB.
- Migration history inserts a passwordless demo user.
- Comprehensive C1–C9, subsequent-year comparisons, and XBRL are outside this release. The product states that.
- Noto Sans covers the tested Latin, Greek, and Cyrillic samples, not every script.
- Deployment Manager is not part of the verified installation.
- High findings remain in `xlsx` and other production dependencies that were not upgraded.

## M. Pilot decision

**GO** for a controlled pilot on one private server, behind HTTPS, with an administrator-provisioned account and no public sign-up.

**NO-GO** for placing this image on the public internet, for running more than one application replica behind a shared rate limit, or for treating the release as certified production.

Recommended next assignment, not started here:

**VS-10 — Controlled Pilot Validation & First External User Onboarding.**
