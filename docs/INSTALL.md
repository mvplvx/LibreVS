# Install LibreVS

Professional installation guide for self-hosted VSME reporting (Community Edition / RC1).

## What you are installing

LibreVS is **local-first reporting infrastructure**. All sustainability data lives in **your** PostgreSQL database. There is no LibreVS cloud account and no telemetry.

After the first installation, **LibreVS Deployment Manager** is the official way to start and manage LibreVS day to day. Ordinary users should not need PowerShell or Docker commands for normal operation.

## Concepts

| Concept | Meaning |
|---------|---------|
| **First-time installation** | Install Docker, place LibreVS files, install Deployment Manager, complete first-launch setup |
| **Daily personal use** | Open LibreVS from Start Menu → manager starts services → browser opens |
| **Organization server** | Administrator runs Deployment Manager on the host; employees use the browser URL only |
| **Developer workflow** | Node/Rust/`tauri:dev` — for contributors only |
| **Terminal fallback** | `docker compose` for recovery/troubleshooting only |

## Requirements

### End-user / server host

- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)
- LibreVS deployment files (Git clone or release extract)
- LibreVS Deployment Manager installer (from CI/release artifacts), once packaged builds are available

### Developer machine (building Deployment Manager)

- Node.js 20+
- Rust + Cargo
- Tauri OS prerequisites

End users must **not** be instructed to install Node.js or Rust merely to run Deployment Manager.

---

## 1. First-time installation

### Step A — Install Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose on Linux) and ensure it is running.

### Step B — Place LibreVS files

```bash
git clone https://github.com/mvplvx/LibreVS.git
cd LibreVS
```

Alternatively extract a release archive to a stable folder (for example `C:\Apps\LibreVS` or `/opt/librevs`).

### Step C — Install Deployment Manager

Prefer the native installer from GitHub Actions / Releases:

- Windows: NSIS `.exe` or `.msi`
- Linux: AppImage or `.deb`

Until a signed release is published, developers can build locally:

```bash
cd deployment
npm install
npm run tauri:build
```

Installers from CI are **unsigned**; Windows SmartScreen may warn.

### Step D — First launch

1. Open **LibreVS** (Deployment Manager).
2. Choose deployment mode (Personal / Organization-host / Organization-connect).
3. For Personal or Organization-host: select the LibreVS folder (the one with `docker-compose.yml`).
4. Confirm the application URL.
5. Save and start — first run may **build** images (`--build`) and take several minutes.

### Optional: bring up once with Compose (advanced)

If you need to verify the stack before the manager is installed:

```bash
docker compose up --build -d
```

This is a **bootstrap/troubleshooting** path, not the normal daily workflow.

### Local development (without Deployment Manager)

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LIBREVS_LOG` | No | `1` = structured JSON logs |
| `LIBREVS_PILOT_MODE` | No | Pilot banner |

---

## 2. Daily personal use

1. Start Docker Desktop if it is not already running (Deployment Manager will try to help on Windows).
2. Open **LibreVS** from the Start Menu or desktop shortcut.
3. Wait until status shows **LibreVS is ready**.
4. Browser opens automatically when configured.
5. Work in the web UI (`/vsme`, `/dashboard`).

No terminal commands are required for this path.

---

## 3. Organization server operation

1. Install Docker and LibreVS files on the server.
2. Install Deployment Manager on the **host**.
3. Choose **Organization — host server**.
4. Set the URL employees will use (not `localhost`), for example `http://10.0.0.20:3000`.
5. Administrators use Start / Stop / Restart / diagnostics.
6. Employees open only the organization URL in a browser — they do **not** install Deployment Manager.

Plan networking, backups, HTTPS, and access control with your IT team. See [INSTALL_WINDOWS_SERVER.md](./INSTALL_WINDOWS_SERVER.md).

---

## 4. Verify

Health UI: `/system/health`  
API: `GET /api/system-health`

```bash
# Optional smoke against a running instance
cd deployment
LIBREVS_BASE_URL=http://localhost:3000 npm run deployment:smoke
```

Or from the main app tree:

```bash
npm run phase8:smoke
```

---

## 5. Backup and upgrade

Before upgrades:

```bash
pg_dump "$DATABASE_URL" -Fc -f librevs-backup.dump
```

Upgrade outline:

1. Stop via Deployment Manager (or `docker compose down` — never use `-v` unless you intend to delete data)
2. Back up PostgreSQL
3. Update LibreVS files (`git pull` or new extract)
4. Start via Deployment Manager (rebuilds only when images are missing)

---

## 6. Advanced terminal fallback

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f app
docker compose down
```

Do **not** run `docker compose down -v` unless you intentionally want to destroy database volumes.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Docker missing / not running | Install or start Docker Desktop; Retry in Deployment Manager |
| Invalid LibreVS folder | Select the directory containing `docker-compose.yml` |
| First build failed | Check disk/network; View diagnostics; Retry |
| Health timeout | First start can take several minutes |
| Empty `/vsme` | Seed may not have run; check container logs |
| `/system/health` DB unreachable | Check Postgres container and `DATABASE_URL` |

Full Deployment Manager guide: [deployment/DEPLOYMENT_MANAGER.md](../deployment/DEPLOYMENT_MANAGER.md).

## Export disclaimer

LibreVS validates structural completeness against deterministic rules. Regulatory acceptance remains your responsibility.
