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

# ── Step 1: Ensure Node.js is installed ──────────────────────

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    Write-Host "  Node.js is not installed. Installing automatically..." -ForegroundColor Yellow
    Write-Host ""
    $installed = $false

    # Try winget first (available on Windows 10 20H2+ and Windows 11)
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Step "Installing Node.js via Windows Package Manager..."
        winget install --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $installed = $true
            Write-OK "Node.js installed."
        }
    }

    # Fallback: download and silently install the MSI
    if (-not $installed) {
        try {
            Write-Step "Fetching latest Node.js LTS version..."
            $index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
            $lts   = $index | Where-Object { $_.lts } | Select-Object -First 1
            $ver   = $lts.version
            $arch  = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
            $url   = "https://nodejs.org/dist/$ver/node-$ver-$arch.msi"
            $msi   = "$env:TEMP\node-lts-installer.msi"

            Write-Step "Downloading Node.js $ver (~30 MB)..."
            Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing

            Write-Step "Installing Node.js $ver..."
            Write-Info "(You may see a security prompt — click Yes to allow the install)"
            Start-Process msiexec -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
            $installed = $true
            Write-OK "Node.js $ver installed."
        }
        catch {
            Write-Fail "Automatic install failed: $_"
            Write-Host ""
            Write-Host "  Please install Node.js manually:" -ForegroundColor Yellow
            Write-Host "  https://nodejs.org/en/download  (choose LTS)" -ForegroundColor White
            Write-Host "  Then double-click run.bat again." -ForegroundColor Yellow
            Start-Process "https://nodejs.org/en/download"
            Read-Host "`n  Press Enter to exit"
            exit 1
        }
    }

    # Refresh PATH in the current session so we don't need to restart
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"

    # Verify node is now available
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host ""
        Write-Host "  Node.js installed but a window restart is needed." -ForegroundColor Yellow
        Write-Host "  Close this window and double-click run.bat again." -ForegroundColor White
        Read-Host "`n  Press Enter to exit"
        exit 0
    }

    Write-Host ""
}

$nodeVer = (node --version 2>&1)
Write-OK "Node.js $nodeVer"
Write-Host ""

# ── Step 2: Install npm dependencies if needed ───────────────

if (-not (Test-Path "node_modules")) {
    Write-Step "Installing app dependencies (first run — about 1 minute)..."
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
