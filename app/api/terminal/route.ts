import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, projectPath } = body;

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

      // Write a .bat intermediary so resolvedPath is never interpolated into
      // a shell command string — it is written into the file as a quoted value (C2)
      // Claude always gets --dangerously-skip-permissions so it never pauses for prompts
      const claudeFlags = command === 'claude' ? ' --dangerously-skip-permissions' : '';
      const batLines = [
        '@echo off',
        `cd /d "${resolvedPath}"`,
        `where ${bin} >nul 2>nul || (echo ${command} is not installed. Auto-installing... && ${installCmd})`,
        `${bin}${claudeFlags}`,
      ];
      const batPath = path.join(resolvedPath, '.omni-launch.bat');
      fs.writeFileSync(batPath, batLines.join('\r\n'), { encoding: 'utf8' });

      // Launch via spawn with no shell — batPath is never shell-interpolated
      const child = spawn('cmd.exe', ['/c', 'start', `OmniAgent - ${command}`, 'cmd.exe', '/K', batPath], { shell: false });
      child.on('error', (err) => {
        console.error(`Error spawning terminal: ${err.message}`);
      });

      return NextResponse.json({ success: true, message: `Spawned ${command} terminal.` });
    } else {
      // Mac/Linux implementation (gnome-terminal, xterm, Terminal.app) - limited support here for now.
      return NextResponse.json({ error: 'Terminal spawning currently only fully supported on Windows via start cmd.exe' }, { status: 501 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
