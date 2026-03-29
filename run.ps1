$Host.UI.RawUI.WindowTitle = "OmniAgent Studio"
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot

function Write-Step { param($msg) Write-Host "  >> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  OK $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  !! $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "     $msg" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host "   OmniAgent Studio" -ForegroundColor White
Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host ""

# ── Step 1: Ensure Node.js 18+ is installed ──────────────────

$minNodeMajor = 18
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$needsInstall = $false

if (-not $nodeCmd) {
    $needsInstall = $true
    Write-Fail "Node.js is not installed."
} else {
    $rawVer = (node --version 2>&1).ToString().TrimStart('v')
    $majorVer = [int]($rawVer.Split('.')[0])
    if ($majorVer -lt $minNodeMajor) {
        $needsInstall = $true
        Write-Fail "Node.js v$rawVer is too old (need v$minNodeMajor+)."
    }
}

if ($needsInstall) {
    Write-Host ""
    Write-Step "Installing Node.js LTS via winget..."
    Write-Info "(You may see a UAC prompt - click Yes to allow)"
    Write-Host ""

    try {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>&1 | ForEach-Object { Write-Info $_ }
    } catch {
        Write-Fail "winget install failed: $_"
        Write-Host ""
        Write-Host "  Please install Node.js 20+ manually:" -ForegroundColor Yellow
        Write-Host "  https://nodejs.org/en/download  (choose LTS)" -ForegroundColor White
        Start-Process "https://nodejs.org/en/download"
        Read-Host "`n  Press Enter to exit"
        exit 1
    }

    # Refresh PATH so the current session picks up the new install
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host ""
        Write-Host "  Node.js was installed but a terminal restart is needed." -ForegroundColor Yellow
        Write-Host "  Close this window and double-click run.bat again." -ForegroundColor White
        Read-Host "`n  Press Enter to exit"
        exit 0
    }

    Write-OK "Node.js installed successfully."
    Write-Host ""
}

$nodeVer = (node --version 2>&1)
Write-OK "Node.js $nodeVer"
Write-Host ""

# ── Step 1b: Ensure Git for Windows is installed (provides git-bash for Claude Code) ──

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
$needsGit = $false

if (-not $gitCmd) {
    $needsGit = $true
    Write-Fail "Git is not installed."
} else {
    Write-OK "Git $(git --version 2>&1)"
}

if ($needsGit) {
    Write-Host ""
    Write-Step "Installing Git for Windows via winget..."
    Write-Info "(Claude Code requires git-bash which ships with Git for Windows)"
    Write-Host ""

    try {
        winget install Git.Git --accept-source-agreements --accept-package-agreements 2>&1 | ForEach-Object { Write-Info $_ }
    } catch {
        Write-Fail "winget install failed: $_"
        Write-Host ""
        Write-Host "  Please install Git for Windows manually:" -ForegroundColor Yellow
        Write-Host "  https://git-scm.com/downloads/win" -ForegroundColor White
        Start-Process "https://git-scm.com/downloads/win"
        Read-Host "`n  Press Enter to exit"
        exit 1
    }

    # Refresh PATH so the current session picks up the new install
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"

    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCmd) {
        Write-Host ""
        Write-Host "  Git was installed but a terminal restart is needed." -ForegroundColor Yellow
        Write-Host "  Close this window and double-click run.bat again." -ForegroundColor White
        Read-Host "`n  Press Enter to exit"
        exit 0
    }

    Write-OK "Git installed successfully."
    Write-Host ""
}

# Ensure CLAUDE_CODE_GIT_BASH_PATH is set for Claude Code
$bashExe = $null
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if ($gitPath) {
    # git.exe is typically at ...\Git\cmd\git.exe — bash.exe is at ...\Git\bin\bash.exe
    $gitRoot = Split-Path (Split-Path $gitPath)
    $candidateBash = Join-Path $gitRoot "bin\bash.exe"
    if (Test-Path $candidateBash) { $bashExe = $candidateBash }
}
# Fallback: check common install path
if (-not $bashExe -and (Test-Path "C:\Program Files\Git\bin\bash.exe")) {
    $bashExe = "C:\Program Files\Git\bin\bash.exe"
}
if ($bashExe) {
    $env:CLAUDE_CODE_GIT_BASH_PATH = $bashExe
    Write-OK "Git bash: $bashExe"
} else {
    Write-Info "Could not locate bash.exe — Claude Code may prompt you to set CLAUDE_CODE_GIT_BASH_PATH"
}
Write-Host ""

# ── Step 2: Install npm dependencies if needed ───────────────

if (-not (Test-Path "node_modules")) {
    Write-Step "Installing app dependencies (first run - about 1 minute)..."
    npm install 2>&1 | Where-Object { $_ -notmatch "^npm warn" } | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to install dependencies."
        Write-Info "Check your internet connection and try again."
        Read-Host "`n  Press Enter to exit"
        exit 1
    }
    Write-OK "Dependencies installed."
    Write-Host ""
}
else {
    Write-OK "Dependencies ready."
    Write-Host ""
}

# ── Step 3: Launch the app ────────────────────────────────────

Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host "   App address:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "   Keep this window open while using the app." -ForegroundColor DarkGray
Write-Host "   Close this window to stop the app." -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host ""

# Open browser after a short delay (server needs a moment to start)
Start-Job -ScriptBlock { Start-Sleep 5; Start-Process "http://localhost:3000" } | Out-Null

npm run dev
