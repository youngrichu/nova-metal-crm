#Requires -Version 5.1
<#
.SYNOPSIS
    Installs Nova POS as a local Windows production service.
.DESCRIPTION
    This installer consumes a prebuilt Nova release ZIP. Customer machines do
    not clone the repo, install pnpm, build source, run Docker, or use WSL.

    Expected release ZIP layout:
      app\build\...
      app\package.json
      app\node_modules\...
      app\scripts\migrate.mjs
      runtime\node\node.exe
      runtime\postgres\bin\initdb.exe
      runtime\postgres\bin\pg_ctl.exe
      runtime\postgres\bin\pg_dump.exe
      runtime\postgres\bin\psql.exe
      service\winsw.exe
      packaging\windows\install.ps1
      packaging\windows\update.ps1
      packaging\windows\uninstall.ps1
#>
[CmdletBinding()]
param(
    [string]$ManifestUrl = "",
    [string]$ReleasePackagePath = "",
    [string]$VersionCheckUrl = "",
    [string]$InstallDir = "$env:ProgramFiles\Nova POS",
    [string]$DataDir = "$env:ProgramData\NovaPOS",
    [int]$Port = 3000,
    [int]$DbPort = 55432
)

$ErrorActionPreference = "Stop"
$AppServiceName = "NovaPOS"
$DbServiceName = "NovaPostgres"
$LogDir = Join-Path $DataDir "logs"
$UpdateDir = Join-Path $DataDir "updates"
$ConfigDir = Join-Path $DataDir "config"
$DbDir = Join-Path $DataDir "db"
$AppDir = Join-Path $InstallDir "app"
$RuntimeDir = Join-Path $InstallDir "runtime"
$ServiceDir = Join-Path $InstallDir "service"
$LogFile = Join-Path $LogDir "install.log"

function Write-Log {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    Add-Content -Path $LogFile -Encoding UTF8 -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Write-Step {
    param([string]$Message)
    Write-Host ">> $Message" -ForegroundColor Cyan
    Write-Log "STEP $Message"
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK $Message" -ForegroundColor Green
    Write-Log "OK $Message"
}

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { return }

    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"")
    if ($ManifestUrl) { $args += @("-ManifestUrl", "`"$ManifestUrl`"") }
    if ($ReleasePackagePath) { $args += @("-ReleasePackagePath", "`"$ReleasePackagePath`"") }
    if ($VersionCheckUrl) { $args += @("-VersionCheckUrl", "`"$VersionCheckUrl`"") }
    $args += @("-InstallDir", "`"$InstallDir`"", "-DataDir", "`"$DataDir`"", "-Port", "$Port", "-DbPort", "$DbPort")
    Start-Process PowerShell -ArgumentList ($args -join " ") -Verb RunAs
    exit
}

function New-RandomHex {
    param([int]$Bytes = 32)
    $buffer = New-Object byte[] $Bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return ($buffer | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Get-ReleasePackage {
    if ($ReleasePackagePath) {
        if (!(Test-Path $ReleasePackagePath)) { throw "Release package not found: $ReleasePackagePath" }
        return (Resolve-Path $ReleasePackagePath).Path
    }
    if (!$ManifestUrl) {
        throw "Provide either -ReleasePackagePath or -ManifestUrl."
    }

    Write-Step "Checking release manifest"
    New-Item -ItemType Directory -Force -Path $UpdateDir | Out-Null
    $manifestPath = Join-Path $UpdateDir "latest-manifest.json"
    Invoke-WebRequest -Uri $ManifestUrl -OutFile $manifestPath -UseBasicParsing
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if (!$manifest.packageUrl -or !$manifest.version -or !$manifest.sha256) {
        throw "Release manifest must include version, packageUrl, and sha256."
    }

    $packagePath = Join-Path $UpdateDir ("nova-pos-{0}.zip" -f $manifest.version)
    Write-Step "Downloading Nova POS $($manifest.version)"
    Invoke-WebRequest -Uri $manifest.packageUrl -OutFile $packagePath -UseBasicParsing

    $actualHash = (Get-FileHash -Algorithm SHA256 -Path $packagePath).Hash.ToLowerInvariant()
    if ($actualHash -ne $manifest.sha256.ToLowerInvariant()) {
        throw "Package checksum mismatch. Expected $($manifest.sha256), got $actualHash."
    }

    return $packagePath
}

function Expand-ReleasePackage {
    param([string]$PackagePath)
    $stageDir = Join-Path $UpdateDir ("stage-install-{0}" -f (Get-Date -Format "yyyyMMddHHmmss"))
    New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
    Expand-Archive -Path $PackagePath -DestinationPath $stageDir -Force

    foreach ($required in @("app\build", "app\package.json", "app\node_modules", "app\scripts\migrate.mjs", "app\src\lib\server\db\migrations\meta\_journal.json", "runtime\node\node.exe", "runtime\postgres\bin\initdb.exe", "runtime\postgres\bin\pg_ctl.exe", "runtime\postgres\bin\pg_dump.exe", "runtime\postgres\bin\psql.exe", "service\winsw.exe", "packaging\windows\install.ps1", "packaging\windows\update.ps1", "packaging\windows\uninstall.ps1")) {
        if (!(Test-Path (Join-Path $stageDir $required))) {
            throw "Release package is missing required path: $required"
        }
    }
    return $stageDir
}

function Copy-ReleaseFiles {
    param([string]$StageDir)
    Write-Step "Installing application files"
    New-Item -ItemType Directory -Force -Path $InstallDir, $AppDir, $RuntimeDir, $ServiceDir | Out-Null
    Copy-Item -Path (Join-Path $StageDir "app\*") -Destination $AppDir -Recurse -Force
    Copy-Item -Path (Join-Path $StageDir "runtime\*") -Destination $RuntimeDir -Recurse -Force
    Copy-Item -Path (Join-Path $StageDir "service\*") -Destination $ServiceDir -Recurse -Force

    New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
    if (Test-Path (Join-Path $StageDir "packaging\windows\update.ps1")) {
        Copy-Item (Join-Path $StageDir "packaging\windows\update.ps1") (Join-Path $DataDir "update.ps1") -Force
    }
    if (Test-Path (Join-Path $StageDir "packaging\windows\uninstall.ps1")) {
        Copy-Item (Join-Path $StageDir "packaging\windows\uninstall.ps1") (Join-Path $DataDir "uninstall.ps1") -Force
    }
}

function Write-EnvironmentFile {
    $envPath = Join-Path $ConfigDir ".env"
    if (Test-Path $envPath) {
        Write-Ok "Existing environment file preserved"
        return
    }

    Write-Step "Writing production environment"
    $dbPassword = New-RandomHex -Bytes 24
    $authSecret = New-RandomHex -Bytes 32
    $effectiveVersionCheckUrl = $VersionCheckUrl
    if (!$effectiveVersionCheckUrl) { $effectiveVersionCheckUrl = $ManifestUrl }
    @"
DATABASE_URL=postgres://nova_pos:$dbPassword@127.0.0.1:$DbPort/nova_pos
BETTER_AUTH_SECRET=$authSecret
BETTER_AUTH_URL=http://127.0.0.1:$Port
PORT=$Port
NODE_ENV=production
VERSION_CHECK_URL=$effectiveVersionCheckUrl
NOVA_UPDATER_SCRIPT=$DataDir\update.ps1
"@ | Set-Content -Path $envPath -Encoding UTF8
}

function Import-EnvironmentFile {
    $envPath = Join-Path $ConfigDir ".env"
    Get-Content $envPath |
        Where-Object { $_ -match '^\s*[^#][^=]+=' } |
        ForEach-Object {
            $key, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim('"'), "Process")
        }
}

function Get-EnvFileValue {
    param([string]$Name)
    $envPath = Join-Path $ConfigDir ".env"
    if (!(Test-Path $envPath)) { return "" }
    $line = Get-Content $envPath |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } |
        Select-Object -First 1
    if (!$line) { return "" }
    return (($line -split '=', 2)[1]).Trim('"')
}

function Get-ConfiguredDbPort {
    $databaseUrl = Get-EnvFileValue -Name "DATABASE_URL"
    if (!$databaseUrl) { return $DbPort }
    try {
        $uri = [uri]$databaseUrl
        if ($uri.Port -gt 0) { return $uri.Port }
    } catch {}
    return $DbPort
}

function Initialize-Database {
    $pgBin = Join-Path $RuntimeDir "postgres\bin"
    $initdb = Join-Path $pgBin "initdb.exe"
    $pgCtl = Join-Path $pgBin "pg_ctl.exe"
    $psql = Join-Path $pgBin "psql.exe"
    $configuredDbPort = Get-ConfiguredDbPort

    if (!(Test-Path (Join-Path $DbDir "PG_VERSION"))) {
        Write-Step "Initializing local PostgreSQL data directory"
        New-Item -ItemType Directory -Force -Path $DbDir | Out-Null
        & $initdb -D $DbDir -U postgres -A trust | ForEach-Object { Write-Log "initdb: $_" }
    }

    $postgresqlConf = Join-Path $DbDir "postgresql.conf"
    if (Test-Path $postgresqlConf) {
        $conf = Get-Content $postgresqlConf
        if ($conf -match '^\s*port\s*=') {
            $conf = $conf -replace '^\s*port\s*=.*$', "port = $configuredDbPort"
        } else {
            $conf += "port = $configuredDbPort"
        }
        $conf | Set-Content -Path $postgresqlConf -Encoding UTF8
    }

    Write-Step "Registering PostgreSQL service"
    & $pgCtl unregister -N $DbServiceName 2>$null | Out-Null
    & $pgCtl register -N $DbServiceName -D $DbDir -S auto | ForEach-Object { Write-Log "pg_ctl register: $_" }
    Start-Service $DbServiceName
    Wait-DatabaseReady -Port $configuredDbPort

    Write-Step "Ensuring Nova database exists"
    $envPath = Join-Path $ConfigDir ".env"
    $databaseUrl = (Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
    $dbPassword = ([uri]$databaseUrl).Password.Replace("'", "''")
    $sql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nova_pos') THEN
    CREATE ROLE nova_pos LOGIN PASSWORD '$dbPassword';
  ELSE
    ALTER ROLE nova_pos WITH LOGIN PASSWORD '$dbPassword';
  END IF;
END
`$`$;
SELECT 'CREATE DATABASE nova_pos OWNER nova_pos'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'nova_pos')\gexec
"@
    $sqlFile = Join-Path $UpdateDir "ensure-database.sql"
    $sql | Set-Content -Path $sqlFile -Encoding UTF8
    & $psql -U postgres -d postgres -p $configuredDbPort -f $sqlFile | ForEach-Object { Write-Log "psql: $_" }
}

function Wait-DatabaseReady {
    param([int]$Port)
    $pgBin = Join-Path $RuntimeDir "postgres\bin"
    $pgCtl = Join-Path $pgBin "pg_ctl.exe"
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        & $pgCtl status -D $DbDir 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "PostgreSQL is running on 127.0.0.1:$Port"
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "PostgreSQL did not become ready within 60 seconds. Check $LogDir."
}

function Register-AppService {
    $nodeExe = Join-Path $RuntimeDir "node\node.exe"
    $winswExe = Join-Path $ServiceDir "winsw.exe"
    $serviceExe = Join-Path $ServiceDir "$AppServiceName.exe"
    $serviceXml = Join-Path $ServiceDir "$AppServiceName.xml"
    Copy-Item $winswExe $serviceExe -Force

    $envPath = Join-Path $ConfigDir ".env"
    $envTags = Get-Content $envPath |
        Where-Object { $_ -match '^\s*[^#][^=]+=' } |
        ForEach-Object {
            $key, $value = $_ -split '=', 2
            $escapedValue = [Security.SecurityElement]::Escape($value.Trim('"'))
            "  <env name=""$($key.Trim())"" value=""$escapedValue"" />"
        }
    $envXml = ($envTags -join "`n")
    $xml = @"
<service>
  <id>$AppServiceName</id>
  <name>Nova POS</name>
  <description>Runs the Nova POS local production server.</description>
  <executable>$nodeExe</executable>
  <arguments>build</arguments>
  <workingdirectory>$AppDir</workingdirectory>
  $envXml
  <logpath>$LogDir</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10485760</sizeThreshold>
    <keepFiles>10</keepFiles>
  </log>
  <depend>$DbServiceName</depend>
  <startmode>Automatic</startmode>
</service>
"@
    $xml | Set-Content -Path $serviceXml -Encoding UTF8

    Write-Step "Registering Nova POS service"
    & $serviceExe uninstall 2>$null | Out-Null
    & $serviceExe install | ForEach-Object { Write-Log "winsw install: $_" }
    Start-Service $AppServiceName
}

function Run-Migrations {
    $migrateScript = Join-Path $AppDir "scripts\migrate.mjs"
    if (!(Test-Path $migrateScript)) {
        Write-Log "No packaged migration runner found at $migrateScript; skipping migration step."
        return
    }
    Write-Step "Running database migrations"
    Import-EnvironmentFile
    $nodeExe = Join-Path $RuntimeDir "node\node.exe"
    & $nodeExe $migrateScript | ForEach-Object { Write-Log "migrate: $_" }
}

function New-Shortcut {
    Write-Step "Creating shortcuts"
    $targetUrl = "http://127.0.0.1:$Port"
    $shell = New-Object -ComObject WScript.Shell
    foreach ($path in @("$env:PUBLIC\Desktop\Nova POS.lnk", "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Nova POS.lnk")) {
        $shortcut = $shell.CreateShortcut($path)
        $shortcut.TargetPath = $targetUrl
        $shortcut.Description = "Open Nova POS"
        $shortcut.Save()
    }
}

function Wait-AppReady {
    Write-Step "Checking Nova POS health"
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -lt 500) {
                Write-Ok "Nova POS is running at http://127.0.0.1:$Port"
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    throw "Nova POS did not become healthy within 90 seconds. Check $LogDir."
}

try {
    Assert-Admin
    New-Item -ItemType Directory -Force -Path $DataDir, $LogDir, $UpdateDir, $ConfigDir | Out-Null
    $package = Get-ReleasePackage
    $stage = Expand-ReleasePackage -PackagePath $package
    Copy-ReleaseFiles -StageDir $stage
    Write-EnvironmentFile
    Initialize-Database
    Run-Migrations
    Register-AppService
    New-Shortcut
    Wait-AppReady
    Write-Ok "Nova POS installation complete"
} catch {
    Write-Log "ERROR $($_.Exception.Message)"
    Write-Host "Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Log: $LogFile" -ForegroundColor Yellow
    exit 1
}
