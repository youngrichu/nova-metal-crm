# Nova POS

Production-ready point-of-sale and business management dashboard built with SvelteKit and PostgreSQL.

## Production Deployment

Nova's customer deployment target is a local Windows production install. End-user machines should not use Docker, WSL, Git, pnpm, or source builds.

The intended customer flow is:

1. Install Nova with a PowerShell installer.
2. Run Nova locally as Windows services.
3. Open Nova from a Desktop or Start Menu shortcut at `http://127.0.0.1:3000`.
4. Use Nova offline for daily work.
5. Connect to the internet only when checking for updates.

### Runtime layout

| Purpose | Location |
|---|---|
| Application files | `C:\Program Files\Nova POS` |
| Data, config, logs, backups, updates | `C:\ProgramData\NovaPOS` |
| App service | `NovaPOS` |
| Database service | `NovaPostgres` |
| Database port | `127.0.0.1:55432` |
| Local URL | `http://127.0.0.1:3000` |

### Windows packaging scripts

The Windows packaging scripts live in `packaging/windows`:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\install.ps1 -ReleasePackagePath .\nova-pos-1.2.3.zip
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\update.ps1 -ManifestUrl https://example.com/nova/latest.json
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\uninstall.ps1
```

Data is preserved by default during uninstall. Use `-RemoveData` only when intentionally deleting the local database, backups, config, and logs.

See `packaging/windows/README.md` for the release ZIP contract and manifest format.
See `docs/WINDOWS_PRODUCTION_RELEASE.md` for the release and Windows VM test runbook.

## Release Model

Customer machines consume prebuilt release ZIPs. They must never run `git pull`, `pnpm install`, or `pnpm build`.

The intended release flow is:

1. Push changes to GitHub.
2. GitHub Actions installs dependencies, runs checks/tests, and builds the SvelteKit production app.
3. CI packages the production build, runtime dependencies, Node runtime, PostgreSQL runtime, WinSW service wrapper, and Windows scripts into a ZIP such as `nova-pos-1.2.3.zip`.
4. CI publishes the ZIP and a manifest containing `version`, `packageUrl`, `sha256`, and `changelog`.
5. Installed customers click **Check for Updates** in Nova.
6. Nova starts the local Windows updater, which downloads the ZIP, verifies it, backs up the database, replaces app files, runs migrations, restarts the service, and health-checks the local app.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random 64-char hex secret for auth |
| `BETTER_AUTH_URL` | Yes | Local app URL, usually `http://127.0.0.1:3000` in production |
| `PORT` | No | HTTP port, default `3000` |
| `NODE_ENV` | No | Use `production` for installed deployments |
| `PUBLIC_APP_VERSION` | No | Current app version, matching `version.json` on release |
| `VERSION_CHECK_URL` | No | Public release manifest URL for update checks |
| `NOVA_UPDATER_SCRIPT` | Production | Path to the local updater script, usually `C:\ProgramData\NovaPOS\update.ps1` |

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL

### Install dependencies

```sh
pnpm install
```

### Configure environment

```sh
cp .env.example .env
# Edit .env and set DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL
```

### Run migrations

```sh
pnpm drizzle-kit migrate
```

### Start dev server

```sh
pnpm dev
```

## Useful Commands

```sh
# Typecheck
pnpm check

# Run unit tests
pnpm test:unit

# Build production output
pnpm build
```
