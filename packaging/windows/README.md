# Nova POS Windows Packaging

Nova's customer deployment target is a local Windows production install. It does
not use Docker, WSL, Git, pnpm, or source builds on customer machines.

## Runtime Layout

- App files: `C:\Program Files\Nova POS`
- Data/config/logs/backups/updates: `C:\ProgramData\NovaPOS`
- App service: `NovaPOS`
- Database service: `NovaPostgres`
- Database port: `127.0.0.1:55432`
- Local URL: `http://127.0.0.1:3000`

## Release ZIP Contract

The PowerShell scripts consume a prebuilt release ZIP. CI should produce this
artifact after tests and production build pass.

Required layout:

```txt
app/
  build/
  package.json
  node_modules/
  scripts/migrate.mjs
  src/lib/server/db/migrations/
runtime/
  node/
    node.exe
  postgres/
    bin/initdb.exe
    bin/pg_ctl.exe
    bin/pg_dump.exe
service/
  winsw.exe
packaging/
  windows/
    install.ps1
    update.ps1
    uninstall.ps1
```

The customer machine downloads and extracts this ZIP. It must not run `git
pull`, `pnpm install`, or `pnpm build`.

## GitHub Actions Release

`.github/workflows/windows-release.yml` builds and publishes the release ZIP and
`latest.json` manifest. Optional repository variables:

- `POSTGRES_WINDOWS_ZIP_URL`: override HTTPS URL for a PostgreSQL Windows ZIP
  containing `bin/initdb.exe`, `bin/pg_ctl.exe`, `bin/pg_dump.exe`, and
  `bin/psql.exe`. The workflow defaults to PostgreSQL 16.14 x64 binaries from
  EDB.
- `WINSW_URL`: optional override for the WinSW executable URL.

## Install

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -ReleasePackagePath .\nova-pos-1.2.3.zip
```

Or install from a manifest:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -ManifestUrl https://example.com/nova/latest.json
```

If installing from a local ZIP, pass `-VersionCheckUrl` so the installed app can
check for future updates:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -ReleasePackagePath .\nova-pos-1.2.3.zip -VersionCheckUrl https://example.com/nova/latest.json
```

Manifest shape:

```json
{
  "version": "1.2.3",
  "packageUrl": "https://example.com/nova/nova-pos-1.2.3.zip",
  "sha256": "lowercase-sha256-hash",
  "changelog": "Inventory and receipt fixes."
}
```

## Update

`update.ps1` uses the same manifest/package model. It verifies the package,
creates a pre-update database backup, stops `NovaPOS`, replaces app files, runs
migrations when a packaged migration runner exists, restarts the service, and
health-checks the local URL.

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\update.ps1 -ManifestUrl https://example.com/nova/latest.json
```

## Uninstall

Data is preserved by default:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Remove all local data explicitly:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1 -RemoveData
```
