# Windows Production Release Runbook

This is the release path for customer Windows installs. Customer machines do
not use Docker, WSL, Git, pnpm, or source builds.

## One-Time Repository Setup

1. The workflow defaults to PostgreSQL 16.14 x64 binaries from EDB. To override
   it, choose a PostgreSQL Windows ZIP distribution that contains:
   - `bin/initdb.exe`
   - `bin/pg_ctl.exe`
   - `bin/pg_dump.exe`
   - `bin/psql.exe`
2. Optional: set the GitHub repository variable:
   - `POSTGRES_WINDOWS_ZIP_URL`
3. Optional: set `WINSW_URL` to pin a specific WinSW executable URL. If unset,
   the workflow uses its default.

[PostgreSQL's Windows download page](https://www.postgresql.org/download/windows/)
links to Windows installers and notes that advanced users can download ZIP
archives of the binaries.

## Create a Release

Run the `Windows Release` GitHub Actions workflow manually with:

- `version`: semantic version without a leading `v`, for example `1.2.3`
- `changelog`: customer-facing release notes

The workflow will:

1. Install dependencies.
2. Run typecheck and unit tests.
3. Build the SvelteKit production app.
4. Assemble the Windows release layout.
5. Install production `node_modules` inside the payload.
6. Bundle Node, PostgreSQL, WinSW, migration runner, and PowerShell scripts.
7. Validate the release layout.
8. Create `nova-pos-x.y.z.zip`.
9. Generate `latest.json`.
10. Publish both files to a GitHub Release.

## First Install Test

Use a clean Windows 10 or Windows 11 VM.

1. Download `nova-pos-x.y.z.zip`.
2. Download `packaging/windows/install.ps1` from the release source or extract it
   from the ZIP.
3. Run PowerShell as Administrator:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -ReleasePackagePath .\nova-pos-x.y.z.zip -VersionCheckUrl https://github.com/YOUR_ORG/YOUR_REPO/releases/latest/download/latest.json
```

Expected result:

- `NovaPostgres` service exists and is running.
- `NovaPOS` service exists and is running.
- `C:\Program Files\Nova POS` contains app/runtime/service files.
- `C:\ProgramData\NovaPOS` contains config/logs/backups/updates/db folders.
- `http://127.0.0.1:3000` opens Nova.
- Rebooting Windows starts Nova automatically.

## Update Test

1. Install an older release on the VM.
2. Publish a newer release.
3. Open Nova as an admin.
4. Go to Settings → Backup & Export → System Updates.
5. Click **Check for Updates**.
6. Click **Update Now**.

Expected result:

- A package downloads to `C:\ProgramData\NovaPOS\updates`.
- A pre-update database backup is created.
- `NovaPOS` stops and restarts.
- Migrations run from the packaged migration folder.
- `http://127.0.0.1:3000` becomes healthy again.
- Existing business data remains available.

## Failure Test

Run at least one failed update before customer rollout:

1. Corrupt the downloaded ZIP checksum in `latest.json`, or publish an invalid
   package missing `app/scripts/migrate.mjs`.
2. Trigger update.

Expected result:

- Update fails.
- Existing app files are restored from `C:\ProgramData\NovaPOS\updates`.
- `NovaPOS` is restarted.
- Logs explain the failure in `C:\ProgramData\NovaPOS\logs\update.log`.

## Uninstall Test

Run:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Expected result:

- Services are removed.
- App files are removed.
- `C:\ProgramData\NovaPOS` is preserved.

Run again with full data removal only on a disposable VM:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1 -RemoveData
```
