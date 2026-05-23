import { NextRequest, NextResponse } from 'next/server';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, projectPath } = body;
    // 'cmd' or 'powershell' — defaults to 'cmd'
    const terminalType: 'cmd' | 'powershell' =
      body.terminalType === 'powershell' ? 'powershell' : 'cmd';

    // CSRF check (S-H3)
    const origin = req.headers.get('origin');
    if (origin && origin !== 'http://localhost:3000') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!projectPath || !command) {
      return NextResponse.json({ error: 'projectPath and command are required' }, { status: 400 });
    }

    // Path boundary check (S-H2)
    const resolvedPath = path.resolve(projectPath);
    const homeDir = os.homedir();
    if (!resolvedPath.startsWith(homeDir + path.sep) && resolvedPath !== homeDir) {
      return NextResponse.json({ error: 'Forbidden: path outside home directory' }, { status: 403 });
    }

    const isWindows = os.platform() === 'win32';

    // Safety list of allowed commands
    const allowedCommands = ['claude', 'gemini', 'opencode', 'codex', 'openclaude', 'ollama', 'mirofish'];
    if (!allowedCommands.includes(command)) {
       return NextResponse.json({ error: 'Command not in whitelist' }, { status: 403 });
    }

    if (isWindows) {
      // Auto-install map for known CLI tools
      const installCommands: Record<string, string> = {
        claude: 'npm install -g @anthropic-ai/claude-code',
        gemini: 'npm install -g @google/gemini-cli',
        opencode: 'npm install -g opencode-ai',
        codex: 'npm install -g @openai/codex',
        openclaude: 'npm install -g @gitlawb/openclaude',
        ollama: 'winget install Ollama.Ollama',
        mirofish: 'winget install Docker.DockerDesktop',
      };
      const binaryName: Record<string, string> = {
        claude: 'claude',
        gemini: 'gemini',
        opencode: 'opencode',
        codex: 'codex',
        openclaude: 'openclaude',
        ollama: 'ollama',
        mirofish: 'docker',
      };
      const installCmd = installCommands[command];
      const bin = binaryName[command] || command;
      const launchCmd = `${bin}${command === 'claude' ? ' --dangerously-skip-permissions' : ''}`;

      // Full custom bat/ps1 scripts for tools that need more than a single launch line.
      // Each entry is the complete list of lines written to the script file.
      const batScriptOverride: Record<string, string[]> = {
        mirofish: [
          '@echo off',
          `echo === MiroFish Setup ===`,
          `echo.`,
          `where docker >nul 2>nul`,
          `if errorlevel 1 (`,
          `  echo Docker not found. Installing Docker Desktop via winget...`,
          `  echo.`,
          `  winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements`,
          `  if errorlevel 1 (`,
          `    echo.`,
          `    echo Auto-install failed. Install Docker Desktop manually from:`,
          `    echo   https://www.docker.com/products/docker-desktop/`,
          `    echo.`,
          `    pause`,
          `    exit /b 1`,
          `  )`,
          `  echo.`,
          `  echo Docker Desktop installed. You may need to restart your PC before Docker is available.`,
          `  echo After restart, re-launch MiroFish from OmniAgent Studio.`,
          `  echo.`,
          `  pause`,
          `  exit /b 0`,
          `)`,
          `echo Step 1: Clone MiroFish ^(if not already cloned^):`,
          `echo   git clone https://github.com/666ghj/MiroFish.git`,
          `echo   cd MiroFish`,
          `echo.`,
          `echo Step 2: Configure environment variables:`,
          `echo   Copy backend/.env.example to backend/.env`,
          `echo   Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, ZEP_API_KEY`,
          `echo.`,
          `echo Step 3: Remap frontend port in docker-compose.yml ^(port 3000 is taken by OmniAgent^):`,
          `echo   Change  - '3000:3000'  to  - '3001:3000'  under the frontend service`,
          `echo.`,
          `echo Step 4: Start MiroFish with Docker:`,
          `echo   docker compose up`,
          `echo.`,
          `echo Once running, MiroFish UI will be at http://localhost:3001`,
          `echo.`,
          `curl -s --connect-timeout 2 http://localhost:3001 >nul 2>nul`,
          `if not errorlevel 1 (`,
          `  echo MiroFish is already running! Opening browser...`,
          `  start "" "http://localhost:3001"`,
          `) else (`,
          `  echo MiroFish is not running yet. Follow the steps above to start it.`,
          `)`,
          `echo.`,
          `pause`,
        ],
        ollama: [
          '@echo off',
          `cd /d "${resolvedPath}"`,
          `where ollama >nul 2>nul || (echo Ollama not found. Download from https://ollama.com/download && pause && exit /b 1)`,
          `echo Checking if Ollama is already running...`,
          `curl -s http://localhost:11434 >nul 2>nul`,
          `if not errorlevel 1 (`,
          `  echo Ollama is already running on http://localhost:11434`,
          `  echo You can use OpenClaude now. This window is safe to close.`,
          `  pause`,
          `  exit /b 0`,
          `)`,
          `echo Checking for installed Ollama models...`,
          `ollama list 2>nul | find ":" >nul 2>nul`,
          `if errorlevel 1 (`,
          `  echo No models installed. Pulling qwen2.5-coder:7b ^(~4 GB, recommended for coding^)...`,
          `  echo Press Ctrl+C to cancel and pull a different model manually instead.`,
          `  echo.`,
          `  ollama pull qwen2.5-coder:7b`,
          `)`,
          `echo.`,
          `echo Starting Ollama API server on http://localhost:11434 ...`,
          `echo ^(Keep this window open while using OpenClaude. Close it to stop Ollama.^)`,
          `echo.`,
          `ollama serve`,
          `echo.`,
          `echo Ollama stopped. It may already be running in the background.`,
          `pause`,
        ],
      };

      const psScriptOverride: Record<string, string[]> = {
        mirofish: [
          `Write-Host "=== MiroFish Setup ===" -ForegroundColor Cyan`,
          `Write-Host ""`,
          `if (-not (Get-Command 'docker' -ErrorAction SilentlyContinue)) {`,
          `  Write-Host "Docker not found. Installing Docker Desktop via winget..." -ForegroundColor Yellow`,
          `  Write-Host ""`,
          `  winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements`,
          `  if ($LASTEXITCODE -ne 0) {`,
          `    Write-Host ""`,
          `    Write-Host "Auto-install failed. Install Docker Desktop manually from:" -ForegroundColor Red`,
          `    Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray`,
          `    Write-Host ""`,
          `    Read-Host "Press Enter to exit"`,
          `    exit 1`,
          `  }`,
          `  Write-Host ""`,
          `  Write-Host "Docker Desktop installed. You may need to restart your PC before Docker is available." -ForegroundColor Green`,
          `  Write-Host "After restart, re-launch MiroFish from OmniAgent Studio." -ForegroundColor Green`,
          `  Write-Host ""`,
          `  Read-Host "Press Enter to close"`,
          `  exit 0`,
          `}`,
          `Write-Host "Checking MiroFish setup..." -ForegroundColor Green`,
          `Write-Host ""`,
          `Write-Host "Step 1: Clone MiroFish (if not already cloned):" -ForegroundColor White`,
          `Write-Host "  git clone https://github.com/666ghj/MiroFish.git" -ForegroundColor Gray`,
          `Write-Host "  cd MiroFish" -ForegroundColor Gray`,
          `Write-Host ""`,
          `Write-Host "Step 2: Configure environment variables:" -ForegroundColor White`,
          `Write-Host "  Copy backend/.env.example to backend/.env" -ForegroundColor Gray`,
          `Write-Host "  Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, ZEP_API_KEY" -ForegroundColor Gray`,
          `Write-Host ""`,
          `Write-Host "Step 3: Remap frontend port in docker-compose.yml (port 3000 is taken by OmniAgent Studio):" -ForegroundColor White`,
          `Write-Host "  Change  - '3000:3000'  to  - '3001:3000'  under the frontend service" -ForegroundColor Gray`,
          `Write-Host ""`,
          `Write-Host "Step 4: Start MiroFish with Docker:" -ForegroundColor White`,
          `Write-Host "  docker compose up" -ForegroundColor Gray`,
          `Write-Host ""`,
          `Write-Host "Once running, MiroFish UI will be available at http://localhost:3001" -ForegroundColor Cyan`,
          `Write-Host ""`,
          `$running = $false`,
          `try {`,
          `  $null = Invoke-WebRequest -Uri 'http://localhost:3001' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop`,
          `  $running = $true`,
          `} catch {}`,
          `if ($running) {`,
          `  Write-Host "MiroFish is already running! Opening browser..." -ForegroundColor Green`,
          `  Start-Process "http://localhost:3001"`,
          `} else {`,
          `  Write-Host "MiroFish is not running yet. Follow the steps above to start it." -ForegroundColor Yellow`,
          `}`,
          `Write-Host ""`,
          `Read-Host "Press Enter to close"`,
        ],
        ollama: [
          `Set-Location "${resolvedPath}"`,
          `if (-not (Get-Command 'ollama' -ErrorAction SilentlyContinue)) {`,
          `  Write-Host "Ollama not found. Download from https://ollama.com/download"`,
          `  Read-Host "Press Enter to exit"`,
          `  exit 1`,
          `}`,
          `Write-Host "Checking if Ollama is already running..."`,
          `try {`,
          `  $null = Invoke-WebRequest -Uri 'http://localhost:11434' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop`,
          `  Write-Host "Ollama is already running on http://localhost:11434" -ForegroundColor Green`,
          `  Write-Host "You can use OpenClaude now. This window is safe to close."`,
          `  Read-Host "Press Enter to close"`,
          `  exit 0`,
          `} catch {}`,
          `Write-Host "Checking for installed Ollama models..."`,
          `$models = & ollama list 2>$null | Select-Object -Skip 1 | Where-Object { $_ -match ':' }`,
          `if (-not $models) {`,
          `  Write-Host "No models installed. Pulling qwen2.5-coder:7b (~4 GB, recommended for coding)..."`,
          `  Write-Host "Press Ctrl+C to cancel and pull a different model manually instead."`,
          `  & ollama pull qwen2.5-coder:7b`,
          `}`,
          `Write-Host ""`,
          `Write-Host "Starting Ollama API server on http://localhost:11434 ..."`,
          `Write-Host "(Keep this window open while using OpenClaude. Close it to stop Ollama.)"`,
          `Write-Host ""`,
          `& ollama serve`,
          `Write-Host ""`,
          `Write-Host "Ollama stopped. It may already be running in the background." -ForegroundColor Yellow`,
          `Read-Host "Press Enter to close"`,
        ],
      };

      // Resolve system paths so we never rely on PATH inside spawn
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const conhostExe = path.join(sysRoot, 'System32', 'conhost.exe');
      const cmdExe     = path.join(sysRoot, 'System32', 'cmd.exe');
      const psExe      = path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

      let child;

      if (terminalType === 'powershell') {
        // Write a .ps1 launcher — resolvedPath written as a literal string value (no shell interpolation)
        const psLines = psScriptOverride[command] ?? [
          `$env:OPENAI_API_KEY = [System.Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'User')`,
          `Set-Location "${resolvedPath}"`,
          `if (-not (Get-Command '${bin}' -ErrorAction SilentlyContinue)) {`,
          `  Write-Host "${command} is not installed. Auto-installing..."`,
          `  ${installCmd}`,
          `}`,
          launchCmd,
        ];
        const ps1Path = path.join(resolvedPath, '.omni-launch.ps1');
        fs.writeFileSync(ps1Path, psLines.join('\r\n'), { encoding: 'utf8' });

        // Use exec with start to launch the window with proper Explorer
        // process parentage — required for WM_DROPFILES (file drag-drop) to work.
        // We use exec instead of spawn to avoid Node.js array quoting issues on Windows.
        exec(`start "" "${psExe}" -NoExit -ExecutionPolicy Bypass -File "${ps1Path}"`, (err) => {
          if (err) {
            const errorMsg = `Error spawning terminal: ${err.message}\n`;
            console.error(errorMsg);
            fs.appendFileSync(path.join(resolvedPath, 'launch-debug.log'), errorMsg);
          }
        });
      } else {
        // Write a .bat intermediary so resolvedPath is never interpolated into
        // a shell command string — it is written into the file as a quoted value (C2)
        const batLines = batScriptOverride[command] ?? [
          '@echo off',
          `cd /d "${resolvedPath}"`,
          `where ${bin} >nul 2>nul || (echo ${command} is not installed. Auto-installing... && ${installCmd})`,
          launchCmd,
        ];
        const batPath = path.join(resolvedPath, '.omni-launch.bat');
        fs.writeFileSync(batPath, batLines.join('\r\n'), { encoding: 'utf8' });

        // Open the .bat via start so the spawned CMD window has proper
        // Explorer process parentage — required for WM_DROPFILES (file drag-drop).
        exec(`start "" "${cmdExe}" /c "${batPath}"`, (err) => {
          if (err) {
            const errorMsg = `Error spawning terminal: ${err.message}\n`;
            console.error(errorMsg);
            fs.appendFileSync(path.join(resolvedPath, 'launch-debug.log'), errorMsg);
          }
        });
      }

      return NextResponse.json({ success: true, message: `Spawned ${command} terminal.` });
    } else {
      // Mac/Linux implementation (gnome-terminal, xterm, Terminal.app) - limited support here for now.
      return NextResponse.json({ error: 'Terminal spawning currently only fully supported on Windows via start cmd.exe' }, { status: 501 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
