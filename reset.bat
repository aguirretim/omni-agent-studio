@echo off
title OmniAgent Studio - Reset Claude Code
cd /d "%~dp0"

echo.
echo  ============================================
echo   OmniAgent Studio -- Reset Claude Code
echo  ============================================
echo.
echo  This will:
echo    1. Remove your Claude Code config folder
echo    2. Reinstall Claude Code globally
echo    3. You will need to log in again (claude login)
echo.
echo  Press Ctrl+C to cancel, or
pause

echo.

:: Step 1: Delete %USERPROFILE%\.claude if it exists
if exist "%USERPROFILE%\.claude" (
    echo  Removing %USERPROFILE%\.claude ...
    rmdir /s /q "%USERPROFILE%\.claude"
    if exist "%USERPROFILE%\.claude" (
        echo  [!!] Could not fully remove .claude folder.
        echo       Close any terminals running Claude Code and try again.
        pause
        exit /b 1
    )
    echo  [OK] Removed .claude config folder.
) else (
    echo  [OK] No .claude config folder found -- nothing to remove.
)

echo.

:: Step 2: Uninstall and reinstall Claude Code
echo  Reinstalling Claude Code...
call npm uninstall -g @anthropic-ai/claude-code >nul 2>&1
call npm install -g @anthropic-ai/claude-code
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [!!] Failed to install Claude Code.
    echo       Make sure Node.js is installed (run run.bat first).
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Reset complete!
echo  ============================================
echo.
echo   Next steps:
echo     1. Double-click run.bat to start the app
echo     2. Open a Claude Code terminal from the AI Tools page
echo     3. Run: claude login
echo        to sign in again
echo.
pause
