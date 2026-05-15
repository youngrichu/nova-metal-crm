@echo off
title Nova POS Installer
cd /d "%~dp0"

>nul 2>&1 net session || (
  echo Requesting administrator privileges...
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)

echo Looking for Nova POS release package...
set "ZIP="
if exist "%~dp0..\*.zip" (
  for /f "delims=" %%f in ('dir "%~dp0..\nova-pos-*.zip" /b /o:-n 2^>nul') do set "ZIP=%~dp0..\%%f"
)
if not defined ZIP if exist "%~dp0*.zip" (
  for /f "delims=" %%f in ('dir "%~dp0nova-pos-*.zip" /b /o:-n 2^>nul') do set "ZIP=%~dp0%%f"
)
if not defined ZIP (
  echo WARNING: Could not find nova-pos-*.zip near this folder.
  echo The installer will download the package from GitHub instead.
  echo.
)

if defined ZIP (
  echo Found: %ZIP%
  echo Starting installation...
  powershell -ExecutionPolicy Bypass -File "%~dp0packaging\windows\install.ps1" -ReleasePackagePath "%ZIP%"
) else (
  echo Starting installation (downloading from GitHub)...
  powershell -ExecutionPolicy Bypass -File "%~dp0packaging\windows\install.ps1" -ManifestUrl "https://github.com/youngrichu/nova-metal-crm/releases/latest/download/latest.json"
)

echo.
if %errorlevel% equ 0 (
  echo Installation complete. Press any key to exit.
) else (
  echo Installation failed. Check the log file for details.
  echo Press any key to exit.
)
pause >nul
