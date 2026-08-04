# Install LibreVS on a Windows Server

Guide for installing LibreVS on an organization-controlled **Windows server** (not a personal laptop). Aimed at administrators who may be new to open-source tooling.

## Product model

- **Administrators** install Docker, place LibreVS files, and use **LibreVS Deployment Manager** on the host.
- **Employees** open LibreVS only in a web browser (`http://SERVER:3000` or your HTTPS URL).
- Employees do **not** install Deployment Manager, Node.js, or Rust.

## Before you start

- Windows Server 2019/2022 or Windows 10/11 Pro used as a server
- Administrator rights
- Remote Desktop access
- Internet access for Docker image downloads
- ~4 GB RAM (8 GB recommended), ~20 GB free disk

## First-time installation

### 1. Install WSL 2 and Docker Desktop

1. Open **PowerShell as Administrator**.
2. Run `wsl --install` and restart if prompted.
3. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
4. Start Docker Desktop and wait until it is running.
5. Verify:

```powershell
docker --version
docker compose version
```

### 2. Place LibreVS files

Install Git for Windows if needed, then:

```powershell
mkdir C:\Apps
cd C:\Apps
git clone https://github.com/mvplvx/LibreVS.git
cd LibreVS
```

### 3. Install LibreVS Deployment Manager

Install the Windows NSIS `.exe` or `.msi` from your LibreVS release / CI artifacts.

Until a published installer is available, a developer machine can build:

```powershell
cd C:\Apps\LibreVS\deployment
npm install
npm run tauri:build
```

**Note:** Unsigned builds may trigger Windows SmartScreen. That does not mean the app is downloading data externally; it means the binary is not code-signed yet.

Create/confirm a Start Menu entry named **LibreVS**.

### 4. First launch on the server

1. Open **LibreVS** (Deployment Manager).
2. Choose **Organization — host server**.
3. Browse to `C:\Apps\LibreVS` (folder containing `docker-compose.yml`).
4. Set Application URL to the address users will open, for example:
   - `http://10.0.0.20:3000`
   - `http://server-name:3000`
   - `https://esg.company.local` (after reverse proxy / TLS)
5. Do **not** leave `localhost` as the organization URL.
6. Save and start. First build can take 10–20 minutes.

### 5. Open Windows Firewall (internal network)

```powershell
New-NetFirewallRule -DisplayName "LibreVS Web" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 6. Verify

On the server: `http://localhost:3000/system/health`  
From a client PC: `http://YOUR-SERVER-IP:3000`

## Daily server operation

Administrators:

1. Ensure Docker Desktop is running.
2. Open Deployment Manager.
3. Use Start / Stop / Restart / Open / diagnostics.

Employees:

1. Open the organization URL in a browser.
2. Do not use Docker or Deployment Manager.

## Security checklist

- [ ] Do not expose PostgreSQL (5432) to the public internet
- [ ] Change default demo database passwords before production data
- [ ] Prefer HTTPS via reverse proxy for production
- [ ] Schedule PostgreSQL backups (`pg_dump`)
- [ ] Restrict who can RDP to the server and stop LibreVS

## Advanced recovery (terminal)

```powershell
cd C:\Apps\LibreVS
docker compose up --build -d
docker compose logs -f app
docker compose down
```

Never use `docker compose down -v` unless you intend to delete database volumes.

## Related

- [INSTALL.md](./INSTALL.md)
- [deployment/DEPLOYMENT_MANAGER.md](../deployment/DEPLOYMENT_MANAGER.md)
