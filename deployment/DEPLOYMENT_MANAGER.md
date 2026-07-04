# LibreVS Deployment Manager

The **LibreVS Deployment Manager** is infrastructure for starting, monitoring, and administering a local or organization-hosted LibreVS deployment.

LibreVS is **not** a desktop application. It is a **self-hosted, local-first VSME reporting platform**. The Deployment Manager orchestrates Docker and health checks — it never touches VSME compliance logic.

## Principles

- **Digital sovereignty** — your data stays in your PostgreSQL database
- **Self-hosted** — no cloud dependency or telemetry
- **Open source** — AGPLv3, same as LibreVS
- **Privacy by design** — no login, no usage tracking, no external reporting

## Architecture

```
┌─────────────────────────────────────┐
│  LibreVS Deployment Manager (UI)    │
│  deployment/ — isolated from app    │
└──────────────┬──────────────────────┘
               │ docker compose CLI
               │ GET /api/system-health
               ▼
┌─────────────────────────────────────┐
│  docker-compose.yml (unchanged)     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ librevs-app │  │ postgres:16  │  │
│  │   :3000     │──│              │  │
│  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```

The Deployment Manager lives in [`deployment/`](../deployment/) with its own `package.json`. It **must not** import code from `app/`, `lib/vsme/`, or `prisma/`.

## Deployment modes

### Personal installation

Typical user: consultant on a laptop.

| Setting | Value |
|---------|-------|
| Mode | Personal installation |
| Application URL | `http://localhost:3000` |
| Docker | Managed locally |
| Browser | Opens automatically when ready (optional) |

### Organization — host server

Typical user: internal IT administrator on the server or VM.

| Setting | Value |
|---------|-------|
| Mode | Organization — host server |
| Application URL | Configurable (`http://server-name:3000`, `https://esg.company.local`) |
| Docker | Managed locally on the host |
| Browser | Manual "Open LibreVS" button |

### Organization — connect to server

Typical user: consultant or employee accessing a company-hosted instance.

| Setting | Value |
|---------|-------|
| Mode | Organization — connect to server |
| Application URL | Remote URL (required) |
| Docker | **Not** managed — connect-only |
| Browser | Manual "Open LibreVS" button |

This mode avoids requiring Docker on every workstation while preserving the same health monitoring workflow.

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine + Compose plugin (for personal and organization-host modes)
- [Rust](https://rustup.rs/) (to build the desktop shell)
- Linux, Windows, or macOS

### Run in development

```bash
cd deployment
npm install
npm run tauri:dev
```

Web-only UI preview (no Docker shell access):

```bash
npm run dev
```

### Build desktop app

```bash
cd deployment
npm run tauri:build
```

Artifacts are written to `deployment/src-tauri/target/release/`.

## Startup flow

1. Check environment and deployment mode
2. Check container runtime (personal / organization-host)
3. Start containers if not running (`docker compose up -d`)
4. Poll `GET /api/system-health` until ready
5. Display status and offer **Open LibreVS**

### Ready criteria

LibreVS is considered available when:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "databaseReachable": true
  }
}
```

The Deployment Manager uses the existing [`/api/system-health`](../app/api/system-health/route.ts) endpoint — no separate `/api/health` route is required.

## Health monitoring

| Diagnostic | Source |
|------------|--------|
| LibreVS running | HTTP 200 + `success` |
| Database running | `data.databaseReachable` |
| LibreVS version | `data.appVersion` |
| Schema version | `data.schemaVersion` |
| Migration status | `data.status` (`ok` / `degraded` / `error`) |
| Container uptime | `docker compose ps` (host modes) |

Technical details are available in the expandable **View diagnostics** section.

## Configuration

Settings are stored locally:

- **Desktop / browser UI:** `localStorage` key `librevs-deployment-config`
- **Node scripts:** `~/.config/librevs/deployment.json`

Example:

```json
{
  "mode": "personal",
  "targetUrl": "http://localhost:3000",
  "composeProjectDir": "/path/to/librevs",
  "autoOpenBrowser": true
}
```

Set **LibreVS project directory** to the folder containing `docker-compose.yml`.

## Server deployment walkthrough

1. Install Docker on the server or VM
2. Clone LibreVS and configure environment (see [INSTALL.md](../docs/INSTALL.md))
3. Run the Deployment Manager in **Organization — host server** mode on the server
4. Set the application URL to the address users will use (hostname or IP)
5. Workstations use **Organization — connect to server** with the same URL

## Troubleshooting

### Container runtime not installed

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and restart the Deployment Manager.

### Container runtime not running

Start Docker Desktop (or `sudo systemctl start docker` on Linux) and click **Retry**.

### `docker-compose.yml` not found

Set **LibreVS project directory** to the root of your LibreVS clone (the folder that contains `docker-compose.yml`).

### Port 3000 already in use

Stop the conflicting service or change the port mapping in `docker-compose.yml`.

### Health check timeout

- First start can take several minutes (migrations + seed)
- Open **View diagnostics** for `databaseReachable` and migration status
- Check container logs: `docker compose logs -f app`

### Remote URL unreachable (organization-connect)

- Verify the URL in a browser on the same network
- Check VPN, firewall, and reverse-proxy configuration
- Confirm LibreVS is running on the host server

### Migration degraded

LibreVS responded but `status` is not `ok`. Run migrations on the host:

```bash
docker compose exec app npx prisma migrate deploy
```

See [MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md).

## Smoke test

With LibreVS running:

```bash
cd deployment
LIBREVS_BASE_URL=http://localhost:3000 npm run deployment:smoke
```

## Security

The Deployment Manager:

- Does **not** collect telemetry
- Does **not** require login
- Does **not** send deployment information externally
- Does **not** create online dependencies

LibreVS remains fully self-hostable.

## Related documentation

- [INSTALL.md](../docs/INSTALL.md) — LibreVS installation
- [README.md](../README.md) — project overview
- [docker-compose.yml](../docker-compose.yml) — container stack
