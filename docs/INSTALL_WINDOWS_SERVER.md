# Install LibreVS on a Windows Server

Guide for installing LibreVS on an organization-controlled **Windows host** (not a personal laptop). Aimed at administrators who may be new to open-source tooling.

## Product model

- **Administrators** install a supported container runtime, place LibreVS files, and use **LibreVS Deployment Manager** on the host.
- **Employees** open LibreVS only in a web browser (`http://SERVER:3000` or your HTTPS URL).
- Employees do **not** install Deployment Manager, Node.js, or Rust.

## Choose a host architecture

| Host type | Container runtime | Notes |
|-----------|-------------------|--------|
| **Recommended for production servers** | **Linux VM/server + Docker Engine** | Stable server path; use Deployment Manager on Linux or administer with Compose as fallback |
| **Windows pilot / small internal host** | Windows 10/11 Pro or Windows Server with **Docker Desktop** | Acceptable for pilots; Docker Desktop on Windows Server is **not** the universal production architecture |
| **Windows Server + Docker Engine / Mirantis** | Verify current Microsoft/Docker support for your edition | Do not assume Docker Desktop is supported or preferred on every Windows Server SKU |

Deployment Manager can manage Compose on a Windows host when Docker CLI works. Corporate production often prefers **Linux + Docker Engine**; plan that with IT when moving beyond pilots.

### Personal or pilot Windows installation

May use:

- Windows 10/11
- Docker Desktop
- local browser
- automatic Docker Desktop launch from Deployment Manager (best-effort)

### Organization server deployment

Requires:

- a supported container runtime for that OS
- networking, firewall, backups, and preferably HTTPS/reverse proxy
- administrator operation of Deployment Manager (or equivalent Compose ops)

Deployment Manager does **not** configure DNS, TLS certificates, reverse proxies, corporate firewalls, authentication, or backups.

## Before you start (Windows pilot host)

- Windows Server 2019/2022 or Windows 10/11 Pro used as a host
- Administrator rights
- Remote Desktop access
- Internet access for Docker image downloads
- ~4 GB RAM (8 GB recommended), ~20 GB free disk

## First-time installation (Windows + Docker Desktop pilot)

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

Confirm Docker Desktop licensing and Windows Server compatibility with your organization before production use.

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
npx tauri build --bundles nsis,msi
```

**Note:** Unsigned builds may trigger Windows SmartScreen. That does not mean the app is downloading data externally; it means the binary is not code-signed yet.

Expect a Start Menu shortcut named **LibreVS**. The application window title is **LibreVS Deployment Manager**.

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

1. Ensure the container runtime is running.
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
- [ ] Restrict who can RDP/SSH to the host and stop LibreVS
- [ ] Confirm container runtime support for your production OS

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
