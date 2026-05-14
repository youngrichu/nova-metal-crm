# Nova POS

A production-ready point-of-sale and business management dashboard built with SvelteKit, PostgreSQL, and Docker.

## Windows Installation

For end-user machines, a one-button installer is provided. It sets up everything automatically — no technical knowledge required.

**Requirements:** Windows 10 (2004+) or Windows 11, internet connection, ~2 GB disk space.

### Steps

1. Download `scripts/install-windows.bat` and `scripts/install-windows.ps1` to the same folder
2. Double-click `install-windows.bat`
3. Follow the on-screen prompts

The installer will:
- Install WSL2 + Docker Engine (lightweight, no Docker Desktop required)
- Clone and build Nova POS
- Generate a secure `.env` with random secrets
- Register a startup task so the server runs automatically after every reboot
- Open the app in your browser at `http://localhost:3000`

> A one-time reboot may be required to activate WSL2. The installer resumes automatically after login.

### Uninstalling

Double-click `scripts/uninstall-windows.bat`. Add `-KeepData` to preserve the database.

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL (or use the Docker Compose stack below)

### Install dependencies

```sh
pnpm install
```

### Start the database

```sh
docker compose up db -d
```

### Configure environment

```sh
cp .env.example .env
# Edit .env and fill in your values
```

### Run migrations

```sh
pnpm drizzle-kit migrate
```

### Start dev server

```sh
pnpm dev
```

---

## Production Deployment (Docker)

The full stack runs via Docker Compose: app, PostgreSQL, hourly backups, and Watchtower for automatic updates.

```sh
cp .env.example .env
# Edit .env - set BETTER_AUTH_SECRET, BETTER_AUTH_URL, WATCHTOWER_API_TOKEN

docker compose up -d --build
```

App is available at `http://localhost:3000`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 64-char hex secret for auth |
| `BETTER_AUTH_URL` | Yes | Public URL the app is served from |
| `PORT` | No | HTTP port (default: `3000`) |
| `NODE_ENV` | No | Set to `production` |
| `PUBLIC_APP_VERSION` | No | Must match `version.json` on release |
| `VERSION_CHECK_URL` | No | URL to `version.json` for update checks |
| `WATCHTOWER_API_URL` | No | Watchtower endpoint for triggering updates |
| `WATCHTOWER_API_TOKEN` | No | Bearer token for Watchtower API |

---

## Releasing a New Version

1. Update `version.json` with the new version and changelog:

```json
{
  "version": "1.1.0",
  "changelog": "What changed in this release."
}
```

2. Publish the new version to the public update manifest:

```sh
gh gist edit bb9bc3f021cffa5b80603b2a0c21a9e0 version.json
```

3. Push your code. Watchtower will pull the updated Docker image and restart the app automatically when triggered via the in-app **Settings → Check for Updates** button.

---

## Useful Commands

```sh
# View live app logs
wsl -d Ubuntu-24.04 -- journalctl -u nova-pos -f

# Edit .env on an installed machine
wsl -d Ubuntu-24.04 -- nano /opt/nova/.env

# Restart the app
wsl -d Ubuntu-24.04 -- bash -c "cd /opt/nova && docker compose restart app"

# Connect to the database
wsl -d Ubuntu-24.04 -- bash -c "docker compose -f /opt/nova/docker-compose.yml exec db psql -U nova_dev nova_crm"

# Run tests
pnpm test:unit
```
