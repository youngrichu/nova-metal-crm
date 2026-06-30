@echo off
title Nova Metal CRM
cd /d D:\nova-metal-crm

netstat -an | find "5173" | find "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Server already running. Opening browser...
    start "" "http://localhost:5173"
    exit
)

echo Starting Nova Metal CRM server...
start /min "Nova Metal CRM Server" cmd /k "cd /d D:\nova-metal-crm && pnpm dev"

echo Waiting for server to start...
timeout /t 15 /nobreak >nul

echo Opening browser...
start "" "http://localhost:5173"
