import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, projectPath } = body;

    if (!projectPath || !command) {
      return NextResponse.json({ error: 'projectPath and command are required' }, { status: 400 });
    }

    const isWindows = os.platform() === 'win32';
    
    // Safety list of allowed commands
    const allowedCommands = ['claude', 'gemini', 'opencode', 'codex'];
    if (!allowedCommands.includes(command)) {
       return NextResponse.json({ error: 'Command not in whitelist' }, { status: 403 });
    }

    if (isWindows) {
      // Auto-install map for known CLI tools
      const installCommands: Record<string, string> = {
        claude: 'npm install -g @anthropic-ai/claude-code',
        gemini: 'npm install -g @google/gemini-cli',
        opencode: 'npm install -g opencode-ai',
        codex: 'npm install -g @openai/codex'
      };
      const binaryName: Record<string, string> = {
        claude: 'claude',
        gemini: 'gemini',
        opencode: 'opencode',
        codex: 'codex'
      };
      
      const installCmd = installCommands[command];
      const bin = binaryName[command] || command;

      // In Windows, we spawn a new CMD window that stays open (/K) running the requested tool
      // "start" spawns a separate window independent of our Node.js process.
      // We use 'where' to check if the tool is installed, and if not, we auto-install it first.
      const winCmd = `start "OmniAgent - ${command}" cmd.exe /K "cd /d ${projectPath} && (where ${bin} >nul 2>nul || (echo ${command} is not installed. Auto-installing... && ${installCmd})) && ${bin}"`;
      
      exec(winCmd, (error) => {
        if (error) {
          console.error(`Error spawning terminal: ${error.message}`);
        }
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
