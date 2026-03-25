@echo off
cd /d "%~dp0"

:: Check for admin rights (needed for winget install)
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Requesting admin permissions...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %ERRORLEVEL% neq 0 pause
