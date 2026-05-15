@echo off
title Nova POS Installer

rem 1. Force backslash path normalization
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:/=\%"

rem 2. Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    rem Use properly quoted ArgumentList and run the script elevated (use /c so the elevated cmd runs the script then exits)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c','cd /d \"%SCRIPT_DIR%\" && \"%~f0\"' -Verb RunAs"
    exit /b
)

rem 3. Change to working directory
cd /d "%SCRIPT_DIR%" || (
  echo ERROR: Failed to change to "%SCRIPT_DIR%"
  pause >nul
  exit /b 1
)
echo Working directory verified: %CD%
echo.

rem 4. Locate Zip File (pick newest matching file)
echo Looking for Nova POS release package...
set "ZIP="

if exist "..\nova-pos-*.zip" (
  for /f "delims=" %%f in ('dir "..\nova-pos-*.zip" /b /o:-n 2^>nul') do (
    set "ZIP=..\%%f"
    goto :ZipFound
  )
)

if not defined ZIP if exist "nova-pos-*.zip" (
  for /f "delims=" %%f in ('dir "nova-pos-*.zip" /b /o:-n 2^>nul') do (
    set "ZIP=%%f"
    goto :ZipFound
  )
)

:ZipFound

rem 5. Execute Installer Logic
if defined ZIP (
  echo Found payload: %ZIP%
  echo Starting local installation...
  powershell -NoProfile -ExecutionPolicy Bypass -File "packaging\windows\install.ps1" -ReleasePackagePath "%ZIP%"
) else (
  echo WARNING: Could not find nova-pos-*.zip near this folder.
  echo Starting remote installation from GitHub...
  powershell -NoProfile -ExecutionPolicy Bypass -File "packaging\windows\install.ps1" -ManifestUrl "https://github.com/youngrichu/nova-metal-crm/releases/latest/download/latest.json"
)

rem Capture installer exit code immediately so later checks reflect the installer outcome
set "INSTALL_EXIT=%ERRORLEVEL%"

rem 6. Persistent Status Screen
echo.
echo --------------------------------------------------
if "%INSTALL_EXIT%"=="0" (
  echo SUCCESS: Installation complete.
) else (
  echo ERROR: Installation failed with exit code %INSTALL_EXIT%.
)
echo --------------------------------------------------
echo Press any key to close this installer window.
pause >nul
exit /b %INSTALL_EXIT%