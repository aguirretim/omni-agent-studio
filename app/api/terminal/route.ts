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
    const allowedCommands = ['claude', 'gemini', 'opencode', 'codex', 'openclaude'];
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
      };
      const binaryName: Record<string, string> = {
        claude: 'claude',
        gemini: 'gemini',
        opencode: 'opencode',
        codex: 'codex',
        openclaude: 'openclaude',
      };

      const installCmd = installCommands[command];
      const bin = binaryName[command] || command;

      // Resolve system paths so we never rely on PATH inside spawn
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const conhostExe = path.join(sysRoot, 'System32', 'conhost.exe');
      const cmdExe     = path.join(sysRoot, 'System32', 'cmd.exe');
      const psExe      = path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

      // Claude always gets --dangerously-skip-permissions so it never pauses for prompts
      const claudeFlags = command === 'claude' ? ' --dangerously-skip-permissions' : '';

      let child;

      if (terminalType === 'powershell') {
        // Write a .ps1 launcher — resolvedPath written as a literal string value (no shell interpolation)
        const psLines = [
          `Set-Location "${resolvedPath}"`,
          `if (-not (Get-Command '${bin}' -ErrorAction SilentlyContinue)) {`,
          `  Write-Host "${command} is not installed. Auto-installing..."`,
          `  ${installCmd}`,
          `}`,
          `& '${bin}'${claudeFlags}`,
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
        const batLines = [
          '@echo off',
          `cd /d "${resolvedPath}"`,
          `where ${bin} >nul 2>nul || (echo ${command} is not installed. Auto-installing... && ${installCmd})`,
          `${bin}${claudeFlags}`,
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
