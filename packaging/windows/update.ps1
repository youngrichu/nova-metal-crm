#Requires -Version 5.1
<#
.SYNOPSIS
    Updates an installed Nova POS Windows production deployment.
.DESCRIPTION
    Downloads or consumes a prebuilt release ZIP, verifies the checksum when a
    manifest is used, backs up PostgreSQL, replaces app files, runs migrations,
    restarts the Nova service, and writes update logs.
#>
[CmdletBinding()]
param(
    [string]$ManifestUrl = "",
    [string]$ReleasePackagePath = "",
    [string]$InstallDir = "$env:ProgramFiles\Nova POS",
    [string]$DataDir = "$env:ProgramData\NovaPOS",
    [int]$Port = 3000,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$AppServiceName = "NovaPOS"
$DbServiceName = "NovaPostgres"
$LogDir = Join-Path $DataDir "logs"
$UpdateDir = Join-Path $DataDir "updates"
$BackupDir = Join-Path $DataDir "backups"
$AppDir = Join-Path $InstallDir "app"
$RuntimeDir = Join-Path $InstallDir "runtime"
$ConfigDir = Join-Path $DataDir "config"
$LogFile = Join-Path $LogDir "update.log"

function Write-Log {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    Add-Content -Path $LogFile -Encoding UTF8 -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    if (!$Quiet) { Write-Host $Message }
}

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { return }

    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
    if ($ManifestUrl) { $args += @("-ManifestUrl", "`"$ManifestUrl`"") }
    if ($ReleasePackagePath) { $args += @("-ReleasePackagePath", "`"$ReleasePackagePath`"") }
    $args += @("-InstallDir", "`"$InstallDir`"", "-DataDir", "`"$DataDir`"", "-Port", "$Port")
    Start-Process PowerShell -ArgumentList ($args -join " ") -Verb RunAs
    exit
}

function Get-ReleasePackage {
    if ($ReleasePackagePath) {
        if (!(Test-Path $ReleasePackagePath)) { throw "Release package not found: $ReleasePackagePath" }
        return (Resolve-Path $ReleasePackagePath).Path
    }
    if (!$ManifestUrl) { throw "Provide either -ReleasePackagePath or -ManifestUrl." }

    New-Item -ItemType Directory -Force -Path $UpdateDir | Out-Null
    $manifestPath = Join-Path $UpdateDir "latest-manifest.json"
    Invoke-WebRequest -Uri $ManifestUrl -OutFile $manifestPath -UseBasicParsing
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if (!$manifest.packageUrl -or !$manifest.version -or !$manifest.sha256) {
        throw "Release manifest must include version, packageUrl, and sha256."
    }

    $packagePath = Join-Path $UpdateDir ("nova-pos-{0}.zip" -f $manifest.version)
    Invoke-WebRequest -Uri $manifest.packageUrl -OutFile $packagePath -UseBasicParsing
    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $packagePath).Hash.ToLowerInvariant()
    if ($actualHash -ne $manifest.sha256.ToLowerInvariant()) {
        throw "Package checksum mismatch. Expected $($manifest.sha256), got $actualHash."
    }
    return $packagePath
}

function Expand-ReleasePackage {
    param([string]$PackagePath)
    $stageDir = Join-Path $UpdateDir ("stage-update-{0}" -f (Get-Date -Format "yyyyMMddHHmmss"))
    New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
    Expand-Archive -Path $PackagePath -DestinationPath $stageDir -Force
    foreach ($required in @("app\build", "app\package.json", "app\node_modules", "app\scripts\migrate.mjs", "app\src\lib\server\db\migrations\meta\_journal.json")) {
        if (!(Test-Path (Join-Path $stageDir $required))) {
            throw "Release package is missing required path: $required"
        }
    }
    return $stageDir
}

function Backup-Database {
    $pgDump = Join-Path $RuntimeDir "postgres\bin\pg_dump.exe"
    if (!(Test-Path $pgDump)) {
        Write-Log "pg_dump.exe not found; skipping pre-update database backup."
        return
    }
    $envPath = Join-Path $DataDir "config\.env"
    $databaseUrl = "postgres://nova_pos@127.0.0.1:55432/nova_pos"
    if (Test-Path $envPath) {
        $configuredUrl = (Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
        if ($configuredUrl) { $databaseUrl = $configuredUrl.Trim('"') }
    }
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $backupPath = Join-Path $BackupDir ("pre-update-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
    Write-Log "Creating pre-update database backup: $backupPath"
    & $pgDump --dbname $databaseUrl --file $backupPath
}

function Replace-AppFiles {
    param([string]$StageDir)
    $previousDir = Join-Path $UpdateDir ("previous-app-{0}" -f (Get-Date -Format "yyyyMMddHHmmss"))
    if (Test-Path $AppDir) {
        Copy-Item $AppDir $previousDir -Recurse -Force
    }
    Copy-Item -Path (Join-Path $StageDir "app\*") -Destination $AppDir -Recurse -Force
    return $previousDir
}

function Restore-AppFiles {
    param([string]$PreviousDir)
    if (!$PreviousDir -or !(Test-Path $PreviousDir)) {
        Write-Log "No previous app backup is available for rollback."
        return
    }
    Write-Log "Rolling back app files from $PreviousDir"
    Remove-Item $AppDir -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item $PreviousDir $AppDir -Recurse -Force
}

function Import-EnvironmentFile {
    $envPath = Join-Path $ConfigDir ".env"
    if (!(Test-Path $envPath)) { throw "Environment file not found: $envPath" }
    Get-Content $envPath |
        Where-Object { $_ -match '^\s*[^#][^=]+=' } |
        ForEach-Object {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim('"'), "Process")
        }
}

function Run-Migrations {
    $migrateScript = Join-Path $AppDir "scripts\migrate.mjs"
    if (!(Test-Path $migrateScript)) {
        Write-Log "No packaged migration runner found at $migrateScript; skipping migration step."
        return
    }
    Import-EnvironmentFile
    $nodeExe = Join-Path $RuntimeDir "node\node.exe"
    & $nodeExe $migrateScript | ForEach-Object { Write-Log "migrate: $_" }
}

function Wait-AppReady {
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -lt 500) {
                Write-Log "Nova POS is healthy after update."
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    throw "Nova POS did not become healthy after update. Check $LogDir."
}

try {
    Assert-Admin
    New-Item -ItemType Directory -Force -Path $LogDir, $UpdateDir, $BackupDir | Out-Null
    Write-Log "Starting Nova POS update"
    $package = Get-ReleasePackage
    $stage = Expand-ReleasePackage -PackagePath $package
    Backup-Database
    Stop-Service $AppServiceName -ErrorAction SilentlyContinue
    $previousAppDir = Replace-AppFiles -StageDir $stage
    if ((Get-Service $DbServiceName -ErrorAction SilentlyContinue).Status -ne "Running") {
        Start-Service $DbServiceName
    }
    Run-Migrations
    Start-Service $AppServiceName
    Wait-AppReady
    Write-Log "Nova POS update complete"
} catch {
    Write-Log "ERROR $($_.Exception.Message)"
    try {
        Stop-Service $AppServiceName -ErrorAction SilentlyContinue
        Restore-AppFiles -PreviousDir $previousAppDir
        Start-Service $AppServiceName -ErrorAction SilentlyContinue
    } catch {
        Write-Log "ROLLBACK ERROR $($_.Exception.Message)"
    }
    if (!$Quiet) { Write-Host "Update failed: $($_.Exception.Message)" -ForegroundColor Red }
    exit 1
}
