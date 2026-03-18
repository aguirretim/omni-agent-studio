@echo off
setlocal
title OmniAgent Studio Setup and Launcher

echo =======================================================
echo              OMNIAGENT STUDIO LAUNCHER
echo =======================================================
echo.
echo Initializing environment...
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please download and install Node.js from https://nodejs.org/
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

:: Ensure we are in the correct directory
cd /d "%~dp0"

echo [1/3] Checking for local NPM dependencies...
if not exist "node_modules\" (
    echo Local node_modules not found. Installing now...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install local dependencies.
        pause
        exit /b 1
    )
) else (
    echo Local dependencies found. Verifying installation...
    call npm install >nul 2>&1
)
echo.

echo [2/3] Checking for Development Tools...
where tsx >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Missing 'tsx' package. Installing locally...
    call npm install -D tsx >nul 2>&1
)
echo.

echo [3/3] Starting OmniAgent Studio Server...
echo The pre-boot script will automatically install missing AI Agent tools (Claude/Gemini/OpenCode).
echo.
echo -------------------------------------------------------
echo Studio is launching... Please wait for the Next.js server.
echo Your default web browser will open shortly.
echo -------------------------------------------------------
echo.

:: Start the Next.js dev server which triggers our predev hook
start http://localhost:3000
call npm run dev

pause
