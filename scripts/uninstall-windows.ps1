#Requires -Version 5.1
<#
.SYNOPSIS
    Nova POS - Windows Uninstaller
.PARAMETER Distro
    WSL2 distro where Nova POS is installed. Default: Ubuntu-24.04
.PARAMETER KeepData
    If set, Docker volumes (database) are preserved.
.PARAMETER KeepDistro
    If set, the WSL2 Ubuntu distro is NOT removed.
#>
[CmdletBinding()]
param(
    [string]$Distro    = "Ubuntu-24.04",
    [switch]$KeepData,
    [switch]$KeepDistro
)

$ErrorActionPreference = "Stop"
$WslTaskName           = "NovaPOS-Startup"
$LinuxInstallDir       = "/opt/nova"

function Write-Step { param([string]$M) Write-Host "  >>  $M" -ForegroundColor Yellow }
function Write-Ok   { param([string]$M) Write-Host "  OK  $M" -ForegroundColor Green }
function Write-Warn { param([string]$M) Write-Host "  !!  $M" -ForegroundColor DarkYellow }
function Write-Note { param([string]$M) Write-Host "      $M" -ForegroundColor DarkGray }

function Assert-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        if ($KeepData)   { $args += " -KeepData" }
        if ($KeepDistro) { $args += " -KeepDistro" }
        Start-Process PowerShell -ArgumentList $args -Verb RunAs
        exit
    }
}

function Invoke-Wsl {
    param([string]$Command)
    wsl -d $Distro -u root -- bash -c $Command 2>&1 | ForEach-Object { Write-Note $_ }
}

function Main {
    Clear-Host
    Write-Host ""
    Write-Host "  +------------------------------------------+" -ForegroundColor Red
    Write-Host "  |        Nova POS  -  Uninstaller          |" -ForegroundColor Red
    Write-Host "  +------------------------------------------+" -ForegroundColor Red
    Write-Host ""
    Write-Note "WSL2 distro      : $Distro"
    Write-Note "App directory    : $LinuxInstallDir (inside WSL2)"
    if ($KeepData)   { Write-Note "Database volumes : PRESERVED" } else { Write-Host "      Database volumes : WILL BE DELETED" -ForegroundColor Red }
    if ($KeepDistro) { Write-Note "WSL2 distro      : PRESERVED" } else { Write-Note "WSL2 distro      : will be removed" }
    Write-Host ""

    $confirm = Read-Host "  Type YES to uninstall Nova POS"
    if ($confirm -ne 'YES') { Write-Host "  Cancelled."; exit 0 }

    Assert-Admin

    # Stop and remove containers
    $exists = wsl -d $Distro -u root -- bash -c "test -f $LinuxInstallDir/docker-compose.yml && echo yes || echo no" 2>&1
    if ($exists -match "yes") {
        Write-Step "Stopping Nova POS containers..."
        if ($KeepData) {
            Invoke-Wsl "cd $LinuxInstallDir && docker compose down"
        } else {
            Invoke-Wsl "cd $LinuxInstallDir && docker compose down -v"
        }
        Write-Ok "Containers stopped"
    }

    # Disable systemd service
    Write-Step "Disabling systemd service..."
    Invoke-Wsl "systemctl disable nova-pos 2>/dev/null; rm -f /etc/systemd/system/nova-pos.service"
    Write-Ok "Service removed"

    # Remove app files
    if (-not $KeepDistro) {
        Write-Step "Removing WSL2 distro $Distro..."
        wsl --unregister $Distro 2>&1 | Out-Null
        Write-Ok "WSL2 distro removed"
    } else {
        Write-Step "Removing app files from $LinuxInstallDir..."
        Invoke-Wsl "rm -rf $LinuxInstallDir"
        Write-Ok "App files removed (WSL2 distro kept)"
    }

    # Remove Windows scheduled task
    Write-Step "Removing boot task..."
    Unregister-ScheduledTask -TaskName $WslTaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Ok "Boot task removed"

    # Remove firewall rule
    Write-Step "Removing firewall rule..."
    Remove-NetFirewallRule -DisplayName "Nova POS HTTP" -ErrorAction SilentlyContinue
    Write-Ok "Firewall rule removed"

    # Remove state directory
    Remove-Item "$env:ProgramData\NovaPOS" -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "  Nova POS has been uninstalled." -ForegroundColor Green
    if ($KeepData) { Write-Warn "Docker volumes were kept inside WSL2." }
    Write-Host ""
    Read-Host "  Press Enter to close"
}

Main
