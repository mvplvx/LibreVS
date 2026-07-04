# Deployment Manager

LibreVS Deployment Manager — infrastructure for starting, monitoring, and administering local LibreVS deployments.

This package is **completely isolated** from the LibreVS application. It must not import code from `app/`, `lib/vsme/`, or `prisma/`.

## Quick start

```bash
cd deployment
npm install
npm run tauri:dev
```

For web-only development (no Docker shell access):

```bash
npm run dev
```

## Build desktop app

```bash
npm run tauri:build
```

Requires [Rust](https://rustup.rs/) and system dependencies for Tauri. See [DEPLOYMENT_MANAGER.md](./DEPLOYMENT_MANAGER.md).

## Smoke test

With LibreVS running:

```bash
LIBREVS_BASE_URL=http://localhost:3000 npm run deployment:smoke
```

## Deployment modes

| Mode | Docker management | Typical use |
|------|-------------------|-------------|
| Personal | Local | Consultant laptop |
| Organization — host | Local on server | IT admin on VM/server |
| Organization — connect | Remote health only | Workstation accessing company server |
