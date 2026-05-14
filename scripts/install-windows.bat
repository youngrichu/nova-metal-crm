@echo off
:: Nova POS - Windows Installer Launcher
:: Double-click this file to install Nova POS

PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo   Installation failed - see errors above.
    pause
)
