#Requires -Version 5.1
<#
.SYNOPSIS
    Uninstalls Nova POS Windows services and application files.
.DESCRIPTION
    Data is preserved by default. Pass -RemoveData to delete database, backups,
    logs, update packages, and configuration under C:\ProgramData\NovaPOS.
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "$env:ProgramFiles\Nova POS",
    [string]$DataDir = "$env:ProgramData\NovaPOS",
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"
$AppServiceName = "NovaPOS"
$DbServiceName = "NovaPostgres"
$ServiceDir = Join-Path $InstallDir "service"

function Assert-Admin {
    $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { return }

    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-InstallDir", "`"$InstallDir`"", "-DataDir", "`"$DataDir`"")
    if ($RemoveData) { $args += "-RemoveData" }
    Start-Process PowerShell -ArgumentList ($args -join " ") -Verb RunAs
    exit
}

function Remove-ServiceIfPresent {
    param([string]$Name, [string]$WrapperPath = "")
    $service = Get-Service $Name -ErrorAction SilentlyContinue
    if (!$service) { return }
    if ($service.Status -ne "Stopped") {
        Stop-Service $Name -Force -ErrorAction SilentlyContinue
    }
    if ($WrapperPath -and (Test-Path $WrapperPath)) {
        & $WrapperPath uninstall | Out-Null
    } else {
        sc.exe delete $Name | Out-Null
    }
}

Assert-Admin

$appWrapper = Join-Path $ServiceDir "$AppServiceName.exe"
Remove-ServiceIfPresent -Name $AppServiceName -WrapperPath $appWrapper
Remove-ServiceIfPresent -Name $DbServiceName

Remove-Item "$env:PUBLIC\Desktop\Nova POS.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Nova POS.lnk" -Force -ErrorAction SilentlyContinue
Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

if ($RemoveData) {
    Remove-Item $DataDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Nova POS removed, including local data." -ForegroundColor Green
} else {
    Write-Host "Nova POS removed. Local data was preserved at $DataDir." -ForegroundColor Green
}
