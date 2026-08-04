# LibreVS Deployment Manager

The **LibreVS Deployment Manager** is the **official operational interface** for starting, stopping, restarting, and monitoring a self-hosted LibreVS deployment.

LibreVS is **not** a desktop application. It is a self-hosted VSME reporting platform. Deployment Manager is infrastructure only — it never touches VSME compliance logic.

## Principles

- Digital sovereignty — data stays in your PostgreSQL database
- Self-hosted — no cloud dependency or telemetry
- Open source — AGPLv3
- Privacy by design — no login, no usage tracking, no external reporting

## Who uses Deployment Manager

| Role | Uses Deployment Manager? | Accesses LibreVS how? |
|------|--------------------------|------------------------|
| Personal / consultant | Yes (daily) | Browser opened by manager |
| Server administrator | Yes (on the host) | Browser + manager status |
| Ordinary employee | No | Organization URL in browser only |
| Developer | Optional (`tauri:dev`) | Local Docker / `npm run dev` |

## Installation boundary (Community Edition)

Deployment Manager does **not** install Docker automatically and does **not** download LibreVS from the internet by itself.

Accepted first-time model:

1. Install Docker.
2. Place LibreVS deployment files on the host (clone or extract release).
3. Install Deployment Manager from the native installer (CI/release artifact).
4. First launch: choose mode, select LibreVS folder, configure URL.
5. Manager performs first image build (`docker compose up --build -d`) when needed.
6. Later operation is handled through Deployment Manager — no terminal required for normal use.

This is **not** a one-click full installer. Be transparent with operators about that boundary.

## Daily personal use

1. Open **LibreVS** from the Start Menu or desktop shortcut.
2. Deployment Manager checks Docker and services.
3. It starts LibreVS if needed and waits for `/api/system-health`.
4. It opens the browser when configured.
5. Leave the manager open as the status window, or minimize it.

## Organization-host administration

1. Administrator opens Deployment Manager on the server.
2. Configure a non-localhost URL (`http://server-name:3000`, `https://esg.company.local`).
3. Start / Stop / Restart / Retry / Open as needed.
4. Stopping shows a confirmation (active users may lose access).
5. Employees use only the organization URL in their browsers.

## Organization-connect

- No local Docker controls
- Health-check and Open only
- For workstations connecting to a hosted instance

## Architecture

```
Deployment Manager (Tauri UI)
        │  invoke (fixed commands)
        ▼
Rust command bridge (validate path, docker argv allowlist)
        │
        ├── docker compose up [-–build] -d
        ├── docker compose down      (never -v)
        ├── docker compose restart
        └── docker compose ps
        │
        ▼
LibreVS stack (docker-compose.yml) → GET /api/system-health
```

Configuration is stored in the OS application config directory as `deployment.json` (not in localStorage). It never stores database passwords or `.env` secrets.

## Health contract

Ready when:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "databaseReachable": true
  }
}
```

Endpoint: `GET {targetUrl}/api/system-health`

## Developer workflow

```bash
cd deployment
npm install
npm run tauri:dev
npm run tauri:build
npm test
```

Requires Node.js, Rust, and Tauri OS dependencies. End users must not be asked to install these.

## Packaging and code signing

| Platform | Bundle targets |
|----------|----------------|
| Windows | NSIS `.exe`, MSI |
| Linux | AppImage, `.deb` |

CI workflow: `.github/workflows/deployment-manager.yml`

Windows artifacts from CI are **unsigned**. Windows SmartScreen may display a warning until LibreVS introduces code signing. Do not claim installers are trusted or signed unless they are.

## Advanced terminal fallback

Use Docker Compose only for troubleshooting/recovery:

```bash
cd /path/to/LibreVS
docker compose up --build -d
docker compose ps
docker compose logs -f app
docker compose down          # preserves volumes
```

These are **not** the normal daily workflow.

## Security notes

- Docker operations run through fixed Rust commands after path validation.
- Project directory must contain a LibreVS `docker-compose.yml`.
- Browser open allows only `http` and `https`.
- Diagnostics are sanitized (no secrets).
- Restrictive CSP is enabled for the local UI.

## Troubleshooting

| Issue | Action |
|-------|--------|
| Docker not installed | Install Docker Desktop; Retry |
| Docker not running | Start Docker Desktop; Retry |
| Invalid folder | Select the LibreVS root (contains `docker-compose.yml`) |
| First build slow/failed | Wait; check disk space; View diagnostics |
| Health timeout | First start can take several minutes |
| Remote URL unreachable | Check VPN/firewall/URL |

## Related docs

- [docs/INSTALL.md](../docs/INSTALL.md) — first-time installation
- [docs/INSTALL_WINDOWS_SERVER.md](../docs/INSTALL_WINDOWS_SERVER.md) — Windows server
- [README.md](../README.md) — project overview
