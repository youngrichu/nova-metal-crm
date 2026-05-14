#Requires -Version 5.1
<#
.SYNOPSIS
    Nova POS - Windows Production Installer (WSL2 + Docker Engine)
.DESCRIPTION
    Installs Nova POS using WSL2 + Docker Engine (no Docker Desktop GUI).
    After install the server starts automatically on every Windows boot.
.PARAMETER GitHubPAT
    Personal Access Token for cloning the private repo.
    Create one at https://github.com/settings/tokens (fine-grained, Contents: Read-only).
    Pre-fill $GitHubPAT below before distributing the installer.
#>
[CmdletBinding()]
param(
    [string]$GitHubRepo = "https://github.com/youngrichu/nova-metal-crm",
    [string]$Distro     = "Ubuntu-24.04",
    [int]   $AppPort    = 3000,

    # Pre-fill this with a fine-grained PAT (Contents: Read-only for this repo).
    # The PAT only allows reading source code - nothing else.
    [string]$GitHubPAT  = ""
)

$ErrorActionPreference = "Stop"
$LinuxInstallDir       = "/opt/nova"
$WslTaskName           = "NovaPOS-Startup"
$ResumeTaskName        = "NovaPOS-InstallResume"
$StateDir              = "$env:ProgramData\NovaPOS"
$StateFile             = "$StateDir\install-state.json"
$VersionCheckUrl       = "https://gist.githubusercontent.com/youngrichu/bb9bc3f021cffa5b80603b2a0c21a9e0/raw/version.json"

# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  +-------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |         Nova POS  -  Installer            |" -ForegroundColor Cyan
    Write-Host "  |   (WSL2 + Docker Engine - lightweight)    |" -ForegroundColor Cyan
    Write-Host "  +-------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}
function Write-Step { param([string]$M) Write-Host "  >>  $M" -ForegroundColor Yellow }
function Write-Ok   { param([string]$M) Write-Host "  OK  $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  !!  $M" -ForegroundColor DarkYellow }
function Write-Note { param([string]$M) Write-Host "      $M" -ForegroundColor DarkGray }

# ---------------------------------------------------------------------------
# Admin self-elevation
# ---------------------------------------------------------------------------
function Assert-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        $a = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        if ($GitHubRepo -ne "https://github.com/youngrichu/nova-metal-crm") { $a += " -GitHubRepo `"$GitHubRepo`"" }
        if ($GitHubPAT  -ne "")   { $a += " -GitHubPAT `"$GitHubPAT`"" }
        if ($AppPort    -ne 3000) { $a += " -AppPort $AppPort" }
        Start-Process PowerShell -ArgumentList $a -Verb RunAs
        exit
    }
}

# ---------------------------------------------------------------------------
# State persistence (survives the one-time WSL2 reboot)
# ---------------------------------------------------------------------------
function Save-State {
    param([hashtable]$Data)
    New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
    $Data | ConvertTo-Json | Set-Content $StateFile -Encoding UTF8
}

function Load-State {
    if (Test-Path $StateFile) { return Get-Content $StateFile | ConvertFrom-Json }
    return $null
}

function Clear-State { Remove-Item $StateFile -ErrorAction SilentlyContinue }

# ---------------------------------------------------------------------------
# WSL2 helpers
# ---------------------------------------------------------------------------

# Run a multi-line bash script reliably inside WSL2.
# Writes the script to a temp file (LF endings) and executes it - avoids all
# CRLF / bash -c quoting issues that plague inline heredocs.
function Invoke-WslScript {
    param([string]$Script, [switch]$PassThru)

    $tmp = [System.IO.Path]::GetTempFileName()
    # Force LF endings so bash doesn't see \r as part of commands
    [System.IO.File]::WriteAllText(
        $tmp,
        ($Script -replace "`r`n", "`n"),
        [System.Text.UTF8Encoding]::new($false)   # no BOM
    )
    $wslTmp = ConvertTo-WslPath $tmp

    try {
        if ($PassThru) {
            return (wsl -d $Distro -u root -- bash $wslTmp 2>&1)
        } else {
            wsl -d $Distro -u root -- bash $wslTmp 2>&1 | ForEach-Object { Write-Note $_ }
            if ($LASTEXITCODE -ne 0) { throw "WSL2 script failed (exit $LASTEXITCODE)" }
        }
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

# Run a short one-liner in WSL2
function Invoke-Wsl {
    param([string]$Command, [switch]$PassThru)
    if ($PassThru) {
        return (wsl -d $Distro -u root -- bash -c $Command 2>&1)
    }
    wsl -d $Distro -u root -- bash -c $Command 2>&1 | ForEach-Object { Write-Note $_ }
    if ($LASTEXITCODE -ne 0) { throw "WSL2 command failed (exit $LASTEXITCODE): $Command" }
}

# Write a file directly into the WSL2 filesystem with LF endings
function Write-WslFile {
    param([string]$Content, [string]$WslDestPath)
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText(
        $tmp,
        ($Content -replace "`r`n", "`n"),
        [System.Text.UTF8Encoding]::new($false)
    )
    $wslTmp = ConvertTo-WslPath $tmp
    wsl -d $Distro -u root -- cp $wslTmp $WslDestPath 2>&1 | Out-Null
    Remove-Item $tmp -ErrorAction SilentlyContinue
}

# Convert C:\Foo\bar.txt  ->  /mnt/c/Foo/bar.txt
function ConvertTo-WslPath {
    param([string]$WinPath)
    $drive = $WinPath[0].ToString().ToLower()
    return "/mnt/$drive" + ($WinPath.Substring(2) -replace '\\', '/')
}

# ---------------------------------------------------------------------------
# WSL2 platform
# ---------------------------------------------------------------------------
function Test-Wsl2Available {
    try { wsl --status 2>&1 | Out-Null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
}

function Enable-Wsl2 {
    Write-Step "Enabling WSL2 Windows features..."
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
    Write-Step "Installing WSL2 kernel..."
    wsl --update 2>&1 | Out-Null
    wsl --set-default-version 2 2>&1 | Out-Null
    Write-Ok "WSL2 features enabled"
}

# ---------------------------------------------------------------------------
# Ubuntu distro
# ---------------------------------------------------------------------------
function Test-DistroInstalled {
    param([string]$Name)
    return ((wsl --list --quiet 2>&1) -match [regex]::Escape($Name))
}

function Set-WslRootUser {
    param([string]$Name)
    $lxssPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss"
    $key = Get-ChildItem $lxssPath -ErrorAction SilentlyContinue |
        Where-Object {
            $dn = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DistributionName
            $dn -like "*$($Name -replace '-','')*" -or $dn -eq $Name
        } | Select-Object -First 1

    if ($key) {
        Set-ItemProperty -Path $key.PSPath -Name DefaultUid -Value 0 -Type DWord
        Write-Ok "Root user configured (no login prompt)"
    } else {
        Write-Warn "Could not set root user via registry - continuing anyway"
    }
}

function Wait-DistroReady {
    param([string]$Name)
    Write-Step "Waiting for $Name to initialise (this can take a minute)..."

    # Give WSL2 time to register and run first-boot setup before we start polling
    Start-Sleep -Seconds 10

    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        $out = wsl -d $Name -u root -- echo ready 2>&1
        if ($out -match "ready") { Write-Ok "$Name is ready"; return }
        Start-Sleep -Seconds 5
    }
    throw "$Name did not become ready within 3 minutes. Try re-running the installer."
}

function Install-Distro {
    param([string]$Name)
    Write-Step "Installing $Name (silent, no setup window)..."

    $installed = $false

    # Method 1: winget - fully silent, no interactive terminal window
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        $wingetId = switch ($Name) {
            "Ubuntu-24.04" { "Canonical.Ubuntu.2404" }
            "Ubuntu-22.04" { "Canonical.Ubuntu.2204" }
            default        { "Canonical.Ubuntu.2404" }
        }
        Write-Note "Installing via winget..."
        winget install -e --id $wingetId --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        # 0 = success, -1978335189 = already installed (both are fine)
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) {
            $installed = $true
            Write-Ok "$Name installed via winget"
        }
    }

    # Method 2: wsl --install --no-launch (newer WSL2, no interactive window)
    if (-not $installed) {
        Write-Note "Trying wsl --install --no-launch..."
        wsl --install -d $Name --no-launch 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $installed = $true
            Write-Ok "$Name installed"
        }
    }

    # Method 3: last resort - open in a separate process and wait for it to finish
    if (-not $installed) {
        Write-Note "Opening Ubuntu setup window - complete it then close it to continue..."
        Start-Process "wsl.exe" -ArgumentList "--install -d $Name" -Wait
        $installed = $true
    }

    # Configure root user before first launch so no username prompt appears
    Set-WslRootUser -Name $Name
    wsl --terminate $Name 2>&1 | Out-Null
    Start-Sleep -Seconds 3

    # Trigger first launch in background so WSL2 runs first-boot init
    Write-Note "Starting WSL2 first-boot initialisation..."
    Start-Process "wsl.exe" -ArgumentList "-d $Name -u root -- echo init" -WindowStyle Hidden

    Wait-DistroReady -Name $Name
}

# ---------------------------------------------------------------------------
# Docker Engine inside WSL2
# ---------------------------------------------------------------------------
function Test-DockerInWsl {
    wsl -d $Distro -u root -- bash -c "docker info" 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Install-DockerEngine {
    Write-Step "Installing Docker Engine + Git in WSL2..."

    # Step 1: Write wsl.conf to enable systemd on next boot (systemd is NOT running yet)
    Invoke-WslScript @'
if ! grep -q "systemd=true" /etc/wsl.conf 2>/dev/null; then
  printf '[boot]\nsystemd=true\n\n[user]\ndefault=root\n' > /etc/wsl.conf
fi
'@

    # Step 2: Install Docker packages (systemd not needed for apt install)
    Invoke-WslScript @'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git ca-certificates curl

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
'@

    # Step 3: Restart WSL2 so systemd starts as PID 1
    Write-Step "Restarting WSL2 to activate systemd..."
    wsl --terminate $Distro 2>&1 | Out-Null
    Start-Sleep -Seconds 6

    # Step 4: Now systemd IS running - enable and start docker service
    Write-Step "Enabling Docker service..."
    Invoke-Wsl "systemctl enable docker && systemctl start docker"

    # Step 5: Wait for Docker Engine to be responsive
    Write-Step "Waiting for Docker Engine..."
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        wsl -d $Distro -u root -- bash -c "docker info" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Ok "Docker Engine is running"; return }
        Start-Sleep -Seconds 4
    }
    throw "Docker Engine did not start within 90 s. Check: wsl -d $Distro -- journalctl -u docker"
}

# ---------------------------------------------------------------------------
# App files
# ---------------------------------------------------------------------------
function Get-CloneUrl {
    if ([string]::IsNullOrWhiteSpace($script:GitHubPAT)) { return $script:GitHubRepo }
    $bare = $script:GitHubRepo -replace '^https://', ''
    return "https://$($script:GitHubPAT)@$bare"
}

function Setup-AppFiles {
    $exists = Invoke-Wsl "test -f $LinuxInstallDir/docker-compose.yml && echo yes || echo no" -PassThru
    if ($exists -match "yes") {
        Write-Ok "Existing install found - pulling latest changes..."
        # Re-embed PAT in remote URL in case it changed since first clone
        $cloneUrl = Get-CloneUrl
        Invoke-Wsl "cd $LinuxInstallDir && git remote set-url origin '$cloneUrl' && git pull"
        return
    }
    Write-Step "Cloning repository..."
    $cloneUrl = Get-CloneUrl
    Invoke-Wsl "git clone '$cloneUrl' $LinuxInstallDir"
    # Store clean URL (without PAT) as the remote so `git remote -v` is safe to share
    if (-not [string]::IsNullOrWhiteSpace($script:GitHubPAT)) {
        Invoke-Wsl "cd $LinuxInstallDir && git remote set-url origin '$($script:GitHubRepo)'"
    }
    Write-Ok "Repository cloned to $LinuxInstallDir (inside WSL2)"
}

# ---------------------------------------------------------------------------
# Environment file
# ---------------------------------------------------------------------------
function New-RandomHex {
    param([int]$Bytes = 32)
    $b = [byte[]]::new($Bytes)
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return ($b | ForEach-Object { '{0:x2}' -f $_ }) -join ''
}

function Setup-EnvFile {
    $exists = Invoke-Wsl "test -f $LinuxInstallDir/.env && echo yes || echo no" -PassThru
    if ($exists -match "yes") { Write-Ok ".env already exists - skipping"; return }

    Write-Step "Generating environment configuration..."

    $authSecret      = New-RandomHex -Bytes 32
    $watchtowerToken = New-RandomHex -Bytes 24

    Write-Host ""
    Write-Note "Leave blank to accept the default in [brackets]."
    Write-Host ""
    $appUrl = Read-Host "  App URL [http://localhost:$AppPort]"
    if ([string]::IsNullOrWhiteSpace($appUrl)) { $appUrl = "http://localhost:$AppPort" }

    $envContent = @"
## Nova POS - Production Environment
## Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
## Keep this file private - it contains secret keys.

DATABASE_URL=postgres://nova_dev:nova_password@db:5432/nova_crm

BETTER_AUTH_SECRET=$authSecret
BETTER_AUTH_URL=$appUrl

PORT=$AppPort
NODE_ENV=production
PUBLIC_APP_VERSION=1.0.0

VERSION_CHECK_URL=$VersionCheckUrl

WATCHTOWER_API_URL=http://watchtower:8080
WATCHTOWER_API_TOKEN=$watchtowerToken
"@

    # Write via temp file so there are no CRLF or quoting issues
    Write-WslFile -Content $envContent -WslDestPath "$LinuxInstallDir/.env"
    Write-Ok ".env written to $LinuxInstallDir/.env"
}

# ---------------------------------------------------------------------------
# Containers
# ---------------------------------------------------------------------------
function Start-AppContainers {
    Write-Step "Building and starting Nova POS (first build ~5 min)..."
    Invoke-Wsl "cd $LinuxInstallDir && docker compose up -d --build"
    Write-Ok "Containers started"
}

# ---------------------------------------------------------------------------
# Systemd service inside WSL2
# ---------------------------------------------------------------------------
function Register-SystemdService {
    Write-Step "Registering nova-pos systemd service in WSL2..."

    $unit = @"
[Unit]
Description=Nova POS
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$LinuxInstallDir
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"@
    Write-WslFile -Content $unit -WslDestPath "/etc/systemd/system/nova-pos.service"
    Invoke-Wsl "systemctl daemon-reload && systemctl enable nova-pos"
    Write-Ok "nova-pos.service enabled (auto-starts with WSL2)"
}

# ---------------------------------------------------------------------------
# Windows Task Scheduler - wake WSL2 30 s after every Windows boot
# ---------------------------------------------------------------------------
function Register-BootTask {
    Write-Step "Registering Windows boot task..."
    Unregister-ScheduledTask -TaskName $WslTaskName -Confirm:$false -ErrorAction SilentlyContinue

    # Just wake WSL2 - systemd then starts docker + nova-pos.service automatically
    $action   = New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d $Distro -u root -- true"
    $trigger  = New-ScheduledTaskTrigger -AtStartup
    $trigger.Delay = "PT30S"
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    Register-ScheduledTask -TaskName $WslTaskName -Description "Wakes WSL2 on boot so Nova POS starts automatically" `
        -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

    Write-Ok "Boot task '$WslTaskName' registered (fires 30 s after Windows starts)"
}

# ---------------------------------------------------------------------------
# Firewall
# ---------------------------------------------------------------------------
function Set-FirewallRule {
    Write-Step "Adding firewall rule for port $AppPort..."
    Remove-NetFirewallRule -DisplayName "Nova POS HTTP" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Nova POS HTTP" -Direction Inbound -Protocol TCP `
        -LocalPort $AppPort -Action Allow -Profile Any | Out-Null
    Write-Ok "Firewall rule added"
}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
function Wait-AppReady {
    Write-Step "Waiting for Nova POS to respond..."
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$AppPort" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -lt 500) { Write-Ok "Nova POS is responding at http://localhost:$AppPort"; return }
        } catch {}
        Start-Sleep -Seconds 4
    }
    Write-Warn "App hasn't responded yet - containers may still be initialising. Check in a moment."
}

# ---------------------------------------------------------------------------
# Reboot resume (only needed if WSL2 was not installed)
# ---------------------------------------------------------------------------
function Register-ResumeAfterReboot {
    param([hashtable]$Data)
    Save-State $Data

    $a = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($GitHubRepo -ne "https://github.com/youngrichu/nova-metal-crm") { $a += " -GitHubRepo `"$GitHubRepo`"" }
    if ($GitHubPAT  -ne "")   { $a += " -GitHubPAT `"$GitHubPAT`"" }
    if ($AppPort    -ne 3000) { $a += " -AppPort $AppPort" }

    Unregister-ScheduledTask -TaskName $ResumeTaskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $ResumeTaskName `
        -Description "Resumes Nova POS installation after reboot" `
        -Action    (New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument $a) `
        -Trigger   (New-ScheduledTaskTrigger -AtLogOn) `
        -Principal (New-ScheduledTaskPrincipal -UserId (whoami) -RunLevel Highest) `
        -Force | Out-Null
}

function Remove-ResumeTask {
    Unregister-ScheduledTask -TaskName $ResumeTaskName -Confirm:$false -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
function Main {
    Show-Banner
    Assert-Admin

    # Resume after a WSL2-required reboot?
    $state    = Load-State
    $resuming = ($null -ne $state)

    if ($resuming) {
        Write-Host "  Resuming installation after reboot..." -ForegroundColor Yellow
        Write-Host ""
        if ($state.GitHubRepo) { $script:GitHubRepo = $state.GitHubRepo }
        if ($state.GitHubPAT)  { $script:GitHubPAT  = $state.GitHubPAT }
        if ($state.AppPort)    { $script:AppPort    = $state.AppPort }
        Remove-ResumeTask
    } else {
        Write-Host "  This installer will:" -ForegroundColor White
        Write-Note "  1. Install WSL2 + Docker Engine (lightweight, no Docker Desktop GUI)"
        Write-Note "  2. Download and build Nova POS"
        Write-Note "  3. Start the server at http://localhost:$AppPort"
        Write-Note "  4. Register auto-start on every Windows reboot"
        Write-Host ""
        Write-Note "  A one-time reboot may be required if WSL2 is not already present."
        Write-Host ""

        $confirm = Read-Host "  Start installation? [Y/n]"
        if ($confirm -match '^[Nn]') { Write-Host "  Cancelled."; exit 0 }
        Write-Host ""
    }

    # Phase 1: WSL2 platform
    if (-not (Test-Wsl2Available)) {
        Write-Step "Enabling WSL2..."
        Enable-Wsl2

        Write-Host ""
        Write-Host "  +--------------------------------------------------+" -ForegroundColor Yellow
        Write-Host "  |  A reboot is required to activate WSL2.          |" -ForegroundColor Yellow
        Write-Host "  |  The installer resumes automatically after login. |" -ForegroundColor Yellow
        Write-Host "  +--------------------------------------------------+" -ForegroundColor Yellow
        Write-Host ""

        Register-ResumeAfterReboot @{
            GitHubRepo = $script:GitHubRepo
            GitHubPAT  = $script:GitHubPAT
            AppPort    = $AppPort
        }

        $r = Read-Host "  Reboot now? [Y/n]"
        if ($r -notmatch '^[Nn]') { Restart-Computer -Force }
        else { Write-Note "Reboot when ready. Installer will resume automatically after login." }
        exit 0
    }
    Write-Ok "WSL2 is available"

    # Phase 2: Ubuntu
    if (-not (Test-DistroInstalled -Name $Distro)) {
        Install-Distro -Name $Distro
    } else {
        Write-Ok "$Distro already installed"
    }

    # Phase 3: Docker Engine + Git
    if (-not (Test-DockerInWsl)) {
        Install-DockerEngine
    } else {
        Write-Ok "Docker Engine already installed"
    }

    # Phase 4: App files + .env
    Setup-AppFiles
    Setup-EnvFile

    # Phase 5: Start containers
    Start-AppContainers

    # Phase 6: Systemd service (auto-start inside WSL2)
    Register-SystemdService

    # Phase 7: Windows boot task (wake WSL2 on Windows boot)
    Register-BootTask

    # Phase 8: Firewall
    Set-FirewallRule

    # Phase 9: Health check
    Wait-AppReady

    Clear-State

    Write-Host ""
    Write-Host "  +------------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |   Nova POS installed successfully!                   |" -ForegroundColor Green
    Write-Host "  |                                                      |" -ForegroundColor Green
    Write-Host "  |   Browser  : http://localhost:$AppPort                    |" -ForegroundColor Green
    Write-Host "  |   Auto-starts after every Windows reboot             |" -ForegroundColor Green
    Write-Host "  |                                                      |" -ForegroundColor Green
    Write-Host "  |   Logs : wsl -d $Distro -- journalctl -u nova-pos   |" -ForegroundColor Green
    Write-Host "  |   .env : wsl -d $Distro -- nano $LinuxInstallDir/.env  |" -ForegroundColor Green
    Write-Host "  +------------------------------------------------------+" -ForegroundColor Green
    Write-Host ""

    $open = Read-Host "  Open Nova POS in your browser now? [Y/n]"
    if ($open -notmatch '^[Nn]') { Start-Process "http://localhost:$AppPort" }

    Write-Host ""
    Read-Host "  Press Enter to close"
}

Main
