@echo off
cd /d "%~dp0"

:: Admin rights are needed to install Node.js and Git automatically.
:: Without admin, winget cannot write to Program Files.
:: The script will request elevation below if needed.

title OmniAgent Studio - Checking permissions...

net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  Admin rights are needed to install Node.js and Git automatically.
    echo  You may see a "Do you want to allow..." dialog -- click Yes to continue.
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title OmniAgent Studio - Starting...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %ERRORLEVEL% neq 0 pause
