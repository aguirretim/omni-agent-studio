@echo off
title OmniAgent Studio
color 0A
echo.
echo  ============================================
echo   OmniAgent Studio — Starting Up
echo  ============================================
echo.

:: ── Step 1: Check for Node.js ──────────────────
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [!] Node.js is not installed on this computer.
    echo.
    echo  Node.js is required to run OmniAgent Studio.
    echo  It is free and takes about 2 minutes to install.
    echo.
    echo  Opening the download page now...
    echo  Choose the version labelled "LTS" and install it.
    echo.
    echo  After installing Node.js:
    echo    1. Close this window
    echo    2. Double-click run.bat again
    echo.
    pause
    start https://nodejs.org/en/download
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER% found.
echo.

:: ── Step 2: Install dependencies if needed ─────
if not exist "node_modules\" (
    echo  [..] Installing dependencies for the first time.
    echo       This will take 1-2 minutes. Please wait...
    echo.
    call npm install --silent
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo  [!] Failed to install dependencies.
        echo.
        echo  Possible causes:
        echo    - No internet connection
        echo    - Antivirus blocking npm
        echo.
        echo  Try running this file again. If the problem
        echo  persists, contact the person who gave you this app.
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
    echo.
) else (
    echo  [OK] Dependencies already installed.
    echo.
)

:: ── Step 3: Open browser after delay ───────────
echo  [..] Starting OmniAgent Studio...
echo.
echo  ============================================
echo   App will open at: http://localhost:3000
echo.
echo   Keep this window open while using the app.
echo   To stop the app, close this window.
echo  ============================================
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: ── Step 4: Run the app ─────────────────────────
npm run dev

echo.
echo  OmniAgent Studio has stopped.
pause
