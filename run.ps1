$Host.UI.RawUI.WindowTitle = "OmniAgent Studio - Setup"
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot

# Track whether anything needed to be installed this run
$freshInstall = $false

function Write-Step { param($msg) Write-Host "  >> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "      $msg" -ForegroundColor DarkGray }
function Write-Banner { param($msg) Write-Host "  $msg" -ForegroundColor DarkCyan }

Write-Host ""
Write-Banner "============================================"
Write-Host "   OmniAgent Studio  --  Starting up..." -ForegroundColor White
Write-Banner "============================================"
Write-Host ""

# ---------------------------------------------------------------
# [1/5] Ensure Node.js 18+ is installed
# ---------------------------------------------------------------

$minNodeMajor = 18
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$needsNode = $false

if (-not $nodeCmd) {
    $needsNode = $true
    Write-Fail "Node.js is not installed."
} else {
    $rawVer = (node --version 2>&1).ToString().TrimStart('v')
    $majorVer = [int]($rawVer.Split('.')[0])
    if ($majorVer -lt $minNodeMajor) {
        $needsNode = $true
        Write-Fail "Node.js v$rawVer is too old (need v$minNodeMajor or newer)."
    }
}

if ($needsNode) {
    $freshInstall = $true
    Write-Host ""
    Write-Step "[1/5] Installing Node.js (first time only -- about 1-2 minutes)..."
    Write-Info "(Admin rights are needed for this -- you may see a permission dialog)"
    Write-Host ""

    try {
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>&1 | ForEach-Object { Write-Info $_ }
    } catch {
        Write-Fail "Could not install automatically."
        Write-Host ""
        Write-Host "  Please visit: https://nodejs.org" -ForegroundColor Yellow
        Write-Host "  Download the file labelled 'LTS' and run it." -ForegroundColor White
        Write-Host "  Then double-click run.bat again." -ForegroundColor White
        Start-Process "https://nodejs.org"
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
} else {
    $rawVer = (node --version 2>&1)
    Write-OK "[1/5] Node.js $rawVer"
    Write-Host ""
}

# ---------------------------------------------------------------
# [2/5] Ensure Git for Windows is installed
# ---------------------------------------------------------------

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
$needsGit = $false

if (-not $gitCmd) {
    $needsGit = $true
    Write-Fail "Git is not installed."
} else {
    Write-OK "[2/5] Git $(git --version 2>&1)"
}

if ($needsGit) {
    $freshInstall = $true
    Write-Host ""
    Write-Step "[2/5] Installing Git for Windows (first time only -- about 1-2 minutes)..."
    Write-Info "(Claude Code needs git-bash, which comes bundled with Git for Windows)"
    Write-Host ""

    try {
        winget install Git.Git --accept-source-agreements --accept-package-agreements 2>&1 | ForEach-Object { Write-Info $_ }
    } catch {
        Write-Fail "Could not install automatically."
        Write-Host ""
        Write-Host "  Please visit: https://git-scm.com/downloads/win" -ForegroundColor Yellow
        Write-Host "  Click 'Download for Windows' and run the installer." -ForegroundColor White
        Write-Host "  Then double-click run.bat again." -ForegroundColor White
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
    # git.exe is typically at ...\Git\cmd\git.exe -- bash.exe is at ...\Git\bin\bash.exe
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
    Write-Info "Could not locate bash.exe -- Claude Code may prompt you to set CLAUDE_CODE_GIT_BASH_PATH"
}
Write-Host ""

# ---------------------------------------------------------------
# [3/5] Ensure Claude Code CLI is installed
# ---------------------------------------------------------------

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue

if (-not $claudeCmd) {
    $freshInstall = $true
    Write-Host ""
    Write-Step "[3/5] Installing Claude Code (the main AI tool -- about 1-2 minutes)..."
    Write-Host ""

    try {
        $ErrorActionPreference = 'Continue'
        npm install -g @anthropic-ai/claude-code 2>&1 | ForEach-Object { Write-Info $_ }
        $npmExitCode = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'

        if ($npmExitCode -ne 0) {
            throw "npm exited with code $npmExitCode"
        }

        Write-OK "Claude Code installed!"
        Write-Info "You will need to log in on first use (run: claude login)"
        Write-Host ""
    } catch {
        $ErrorActionPreference = 'Stop'
        Write-Fail "Could not install Claude Code automatically."
        Write-Host ""
        Write-Host "  You can install it later by running this command in any terminal:" -ForegroundColor Yellow
        Write-Host "  npm install -g @anthropic-ai/claude-code" -ForegroundColor White
        Write-Host ""
        Write-Host "  The app will still open -- you can install Claude Code later." -ForegroundColor DarkGray
        Write-Host ""
    }
} else {
    Write-OK "[3/5] Claude Code $(claude --version 2>&1)"
    Write-Host ""
}

# ---------------------------------------------------------------
# [4/5] Install npm dependencies if needed
# ---------------------------------------------------------------

if (-not (Test-Path "node_modules")) {
    $freshInstall = $true
    Write-Step "[4/5] Installing app files (first time only -- about 1 minute)..."
    $ErrorActionPreference = 'Continue'
    npm install 2>&1 | Where-Object { $_ -notmatch "^npm warn" } | Out-Null
    $npmExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'

    if ($npmExitCode -ne 0) {
        Write-Fail "Failed to install app files."
        Write-Host ""
        Write-Host "  Check your internet connection and try again." -ForegroundColor Yellow
        Write-Host "  If the problem persists, try disabling your antivirus temporarily." -ForegroundColor White
        Read-Host "`n  Press Enter to exit"
        exit 1
    }
    Write-OK "App files installed."
    Write-Host ""
} else {
    Write-OK "[4/5] App files ready."
    Write-Host ""
}

# ---------------------------------------------------------------
# [5/5] Launch the app
# ---------------------------------------------------------------

$Host.UI.RawUI.WindowTitle = "OmniAgent Studio - Running"

$firstRunDoneFile = Join-Path $PSScriptRoot ".first-run-done"
$isFirstRun = (-not (Test-Path $firstRunDoneFile)) -or $freshInstall

if ($isFirstRun) {
    Write-Host ""
    Write-Banner "============================================"
    Write-Host "   Setup complete!  Here is what to do next:" -ForegroundColor Green
    Write-Banner "============================================"
    Write-Host ""
    Write-Host "   1. The app is now opening in your browser." -ForegroundColor White
    Write-Host "   2. On the Home page, click the folder icon" -ForegroundColor White
    Write-Host "      and select your project folder." -ForegroundColor White
    Write-Host "   3. Click 'Shared Context' in the sidebar" -ForegroundColor White
    Write-Host "      and describe your project to the AI." -ForegroundColor White
    Write-Host "   4. Click 'AI Tools' to launch Claude Code" -ForegroundColor White
    Write-Host "      and start coding!" -ForegroundColor White
    Write-Host ""
    Write-Banner "============================================"
    Write-Host ""
    Write-Host "   Keep this window open while using the app." -ForegroundColor DarkGray
    Write-Host "   Close this window to stop the app." -ForegroundColor DarkGray
    Write-Host "   App address: http://localhost:3000" -ForegroundColor DarkGray
    Write-Host ""
    Write-Banner "============================================"
    Write-Host ""

    # Record that setup has been completed
    Set-Content -Path $firstRunDoneFile -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Encoding ASCII
} else {
    Write-Host ""
    Write-Banner "============================================"
    Write-Host "   Everything ready.  Opening the app..." -ForegroundColor Green
    Write-Banner "============================================"
    Write-Host ""
    Write-Host "   App address: http://localhost:3000" -ForegroundColor White
    Write-Host "   Keep this window open while using the app." -ForegroundColor DarkGray
    Write-Host "   Close this window to stop the app." -ForegroundColor DarkGray
    Write-Host ""
    Write-Banner "============================================"
    Write-Host ""
}

# Open browser after a short delay (server needs a moment to start)
Start-Job -ScriptBlock { Start-Sleep 5; Start-Process "http://localhost:3000" } | Out-Null

npm run dev
