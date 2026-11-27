# SEC-01 Authentication

Date: 2026-11-27

Library: Better Auth 1.7.28 with the Prisma adapter. It runs inside LibreVS and stores sessions in the existing PostgreSQL database. No external identity service is used. Telemetry is disabled.

## 1. Vulnerability

`getUser` copied `x-user-id` and `x-organization-id` from the request. If either header was missing, it returned the fixed demo identity. Nothing checked a session, a password, or `User.organizationId`. A caller could name another organisation and the reporting APIs would use that value.

## 2. Authentication flow

1. An administrator provisions an account with `scripts/provision-auth-user.ts`. The password is read from a JSON file and is not printed.
2. The person signs in at `/login` with email and password.
3. Better Auth stores a hashed password on `Account` and a random session token on `Session`.
4. The browser receives an HttpOnly, SameSite=Lax cookie. The cookie is marked Secure when `NODE_ENV` is `production`.
5. `requireAuthenticatedUser` reads that session, then reads the domain `User` row. The organisation id comes from that row.
6. Logout deletes the session. A later request with the old cookie is rejected.
7. An expired or deleted session is rejected. Setting `User.active` to false rejects the next request even if the session row still exists.
8. Changing `User.organizationId` is visible on the next request. The session does not keep the old organisation.

Public sign-up is disabled. Email delivery is not required. `emailVerified` is set when an administrator creates the account. That flag records the administrator's action. It is not proof that a message was delivered.

## 3. User mapping

Better Auth uses the existing `User` model. `organizationId` stays the membership column and cannot be set from a sign-in request. `Session`, `Account`, and `Verification` are new tables. A session belongs to one user. Deleting the user deletes the sessions and accounts.

The seeded demo user remains a domain row. It has no password account and cannot sign in. The application does not fall back to that user.

There is no email-address matching between a login and an organisation. The organisation is the foreign key stored on the user row.

## 4. Identity headers

`x-user-id` and `x-organization-id` are not read by authentication. Tests send them with and without a valid session. The authorised organisation stays the one on the user row.

## 5. Route inventory

Public:

| Route | Method | Notes |
|---|---|---|
| `/` | GET | Landing page |
| `/login` | GET | Sign-in form |
| `/api/auth/*` | GET, POST | Better Auth handler. Sign-up is disabled |
| `/api/librevs/version` | GET | Version metadata |
| `/api/system-health` | GET | Database reachability and registry counts. It does not read reporting rows |
| `/api/vsme/schema` | GET | Static VSME catalogue |
| `/api/vsme/applicability` | GET | Calculation from the query string |

`proxy.ts` redirects other pages to `/login` when the session is missing. API routes do not rely on that redirect. Each protected handler calls `requireApiContext` before reading or writing tenant data.

Authenticated, organisation-scoped, and covered by the shared session check:

| Route | Methods | Mutates | Direct test |
|---|---|---|---|
| `/api/company` | GET, POST | POST | Yes |
| `/api/company/[id]` | PATCH | Yes | Through the same context |
| `/api/reporting-period` | GET, POST | POST | Through the same context |
| `/api/reporting-period/[id]` | GET | No | Through the same context |
| `/api/data-point` | GET, POST | POST | Yes |
| `/api/reporting-period/[id]/materiality` | GET, PUT | PUT | Through the same context |
| `/api/feedback` | POST | Yes | Through the same context |
| `/api/test` | GET | No | Through the same context |
| `/api/reporting-period/[id]/summary` | GET | No | Through the same context |
| `/api/reporting-period/[id]/dashboard` | GET | No | Through the same context |
| `/api/reporting-period/[id]/kpis` | GET | No | Through the same context |
| `/api/reporting-period/[id]/vsme-coverage` | GET | No | Through the same context |
| `/api/reporting-period/[id]/export` | GET | Can write a snapshot | Yes, foreign period returns 404 |
| `/api/reporting-period/[id]/export/json` | GET | Can write a snapshot | Through the same context |
| `/api/reporting-period/[id]/export/xlsx` | GET | Can write a snapshot | Through the same context |
| `/api/reporting-period/[id]/export/pdf` | GET | Can write a snapshot | Through the same context |
| `/api/reporting-period/[id]/export-validation` | GET | No | Through the same context |
| `/api/reporting-period/[id]/export-audit` | GET | No | Through the same context |
| `/api/reporting-period/[id]/export-snapshots` | GET | No | Through the same context |
| `/api/reporting-period/[id]/export-snapshots/[snapshotId]` | GET | No | Through the same context |
| `/api/reporting-period/[id]/export-snapshots/[snapshotId]/finalize` | POST | Yes | Through the same context |
| `/api/vsme/ui-schema` | GET | No | Period ownership is checked before materiality is loaded |
| `/api/vsme/legacy-audit` | GET | No | Rows are limited to the signed-in organisation |
| `/api/vsme/release/readiness` | GET | No | Session required. Datapoint and snapshot samples are limited to the signed-in organisation. |
| `/vsme/vs2026/preview/[reportingPeriodId]` | GET | No | Yes |

There are no Server Actions. Repeating rows have no public write route. The preview loads them only after the session's organisation matches the period.

## 6. Migration

`prisma/migrations/20261127093000_sec01_authentication` adds `emailVerified`, `image`, `active`, and `updatedAt` on `User`, and creates `Session`, `Account`, and `Verification`. Existing user ids are unchanged. Null names are copied from the email before `name` becomes required.

The SQL was applied to a restored copy of the local `librevs` database first. That copy kept 1 user, 3 companies, and 5 reporting periods. It was then applied to local `librevs` on localhost. After the security tests cleaned up their own rows, the database still had 1 user, 0 accounts, 0 sessions, 3 companies, 5 periods, and 38 datapoints. The demo user has no account.

## 7. Local development

The demo seed does not sign anyone in. Create `auth-provision.local.json` outside git:

```json
{
  "email": "operator@example.com",
  "password": "a long password",
  "name": "Operator",
  "organizationId": "librevs-demo-org"
}
```

Run:

```bash
npx tsx --env-file=.env scripts/provision-auth-user.ts ./auth-provision.local.json
```

To replace a lost password and revoke that account's sessions, set `"resetPassword": true` and omit `name`. The new password is still read from the file and is not printed.

Required environment variables, with no real secret in `.env.example`:

- `BETTER_AUTH_SECRET` — at least 32 characters, from `openssl rand -base64 32`
- `BETTER_AUTH_URL` — the public origin, such as `http://localhost:3000`
- `LIBREVS_TRUSTED_PROXIES` — optional. Leave it empty unless a reverse proxy replaces `X-Forwarded-For` with the connecting address. While it is empty, LibreVS does not use that header. Sign-in rate limiting then uses one shared bucket for the process.

Docker Compose requires `BETTER_AUTH_SECRET` from the environment. It does not embed a default secret. The image build uses a placeholder only so the build can load the module. Set the real secret when the container starts. PostgreSQL stays on the Docker network and is published to the host port already used by this project. It is not given a new public binding.

## 8. Tests

`npx tsx --env-file=.env --test lib/auth.security.test.ts`

3 passed. The tests cover a missing session, an invalid token, expiry, revocation, logout reuse, a wrong password, an unknown email with the same error, a cross-site sign-in, repeated sign-in attempts, forged identity headers, two organisations, a guessed period, export access, the VS 2026 preview, an inactive user, an organisation change, and password reset.

`npx tsx --env-file=.env --test lib/vsme/vs2026/*.test.ts lib/vsme/vs2026/registry/*.test.ts`

124 passed in the combined run that also included the first two authentication tests (126 passed altogether).

`npx prisma validate` succeeded. `npx tsc --noEmit --pretty false --incremental false` reports the 17 existing Deployment Manager alias errors and no others.

## 9. Remaining risk

- The pilot readiness HTTP check counts datapoints and reads the latest snapshot only for the signed-in organisation. Export gating still uses the system-wide sample and is unchanged.
- Sign-in rate limiting is stored in process memory. Several replicas do not share one counter.
- Without `LIBREVS_TRUSTED_PROXIES`, every sign-in attempt shares one rate-limit bucket. That prevents a forged `X-Forwarded-For` from bypassing the limit. A busy address can also consume it.
- Password recovery is the administrator script. There is no emailed reset link.
- The VS 2026 editor from VS-05A is not implemented.
