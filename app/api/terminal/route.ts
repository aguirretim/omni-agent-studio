import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
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
    const allowedCommands = ['claude', 'gemini', 'opencode', 'codex', 'openclaude', 'ollama'];
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
      };
      const binaryName: Record<string, string> = {
        claude: 'claude',
        gemini: 'gemini',
        opencode: 'opencode',
        codex: 'codex',
        openclaude: 'openclaude',
        ollama: 'ollama',
      };
      const installCmd = installCommands[command];
      const bin = binaryName[command] || command;
      const launchCmd = `${bin}${command === 'claude' ? ' --dangerously-skip-permissions' : ''}`;

      // Full custom bat/ps1 scripts for tools that need more than a single launch line.
      // Each entry is the complete list of lines written to the script file.
      const batScriptOverride: Record<string, string[]> = {
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
          `Set-Location "${resolvedPath}"`,
          `if (-not (Get-Command '${bin}' -ErrorAction SilentlyContinue)) {`,
          `  Write-Host "${command} is not installed. Auto-installing..."`,
          `  ${installCmd}`,
          `}`,
          launchCmd,
        ];
        const ps1Path = path.join(resolvedPath, '.omni-launch.ps1');
        fs.writeFileSync(ps1Path, psLines.join('\r\n'), { encoding: 'utf8' });

        // Wrap the .ps1 in a .bat so explorer.exe can open it — explorer gives the
        // spawned CMD window proper Explorer process parentage, which is required for
        // WM_DROPFILES (file drag-drop) to work. Spawning via conhost.exe directly
        // from Node.js breaks drag-drop because the window inherits WSL/Node lineage.
        const psWrapLines = [
          '@echo off',
          `"${psExe}" -NoExit -ExecutionPolicy Bypass -File "${ps1Path}"`,
        ];
        const psWrapPath = path.join(resolvedPath, '.omni-launch-ps.bat');
        fs.writeFileSync(psWrapPath, psWrapLines.join('\r\n'), { encoding: 'utf8' });

        child = spawn(
          'explorer.exe',
          [psWrapPath],
          { shell: false, detached: true, stdio: 'ignore' },
        );
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

        // Open the .bat via explorer.exe so the spawned CMD window has proper
        // Explorer process parentage — required for WM_DROPFILES (file drag-drop).
        // Spawning conhost.exe directly from Node.js breaks drag-drop because the
        // window inherits Node/WSL process lineage instead of Explorer's.
        child = spawn(
          'explorer.exe',
          [batPath],
          { shell: false, detached: true, stdio: 'ignore' },
        );
      }

      child.on('error', (err) => {
        console.error(`Error spawning terminal: ${err.message}`);
      });
      child.unref();

      return NextResponse.json({ success: true, message: `Spawned ${command} terminal.` });
    } else {
      // Mac/Linux implementation (gnome-terminal, xterm, Terminal.app) - limited support here for now.
      return NextResponse.json({ error: 'Terminal spawning currently only fully supported on Windows via start cmd.exe' }, { status: 501 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
