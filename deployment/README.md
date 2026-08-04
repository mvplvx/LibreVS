# LibreVS Deployment Manager

**Official operational interface** for starting and managing a self-hosted LibreVS deployment after installation.

LibreVS remains a web application. Deployment Manager is the native control panel that replaces routine Docker and terminal use for day-to-day operation.

## Who uses what

| Role | Tool |
|------|------|
| Personal user (after install) | Double-click **LibreVS** (Deployment Manager) |
| Server administrator | Deployment Manager on the host |
| Ordinary company employee | Browser only (`http://server:3000` or your org URL) |
| Developer | `npm run tauri:dev` / `tauri:build` in this folder |

## End-user requirements

- Packaged LibreVS Deployment Manager (installer from CI/release)
- Docker Desktop or Docker Engine + Compose
- LibreVS deployment files on disk (cloned/extracted project with `docker-compose.yml`)

**End users do not install Node.js or Rust.**

## Developer / build requirements

- Node.js 20+
- npm
- Rust + Cargo ([rustup](https://rustup.rs/))
- Tauri OS prerequisites

```bash
cd deployment
npm install
npm run tauri:dev      # development
npm run tauri:build    # produce installers under src-tauri/target/release/bundle/
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (mocked Docker) |
| `npm run build` | Vite UI production build |
| `npm run tauri:build` | Native packages |
| `npm run deployment:smoke` | Health check against a running LibreVS |

## Packaging

Configured targets: Windows **NSIS** + **MSI**, Linux **AppImage** + **deb**.

CI: [`.github/workflows/deployment-manager.yml`](../.github/workflows/deployment-manager.yml)

Windows installers from CI are **unsigned**. SmartScreen may warn until code signing is added.

Full documentation: [DEPLOYMENT_MANAGER.md](./DEPLOYMENT_MANAGER.md)
