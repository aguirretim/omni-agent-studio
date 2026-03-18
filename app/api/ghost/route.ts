import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, prompt, projectPath } = body;

    if (!projectPath || !prompt || !model) {
      return NextResponse.json({ error: 'projectPath, model, and prompt are required' }, { status: 400 });
    }
    
    // Whitelist allowed models to execute in headless mode
    const allowedModels = ['claude', 'gemini', 'opencode', 'codex'];
    if (!allowedModels.includes(model)) {
       return NextResponse.json({ error: 'Model not supported for headless execution' }, { status: 403 });
    }

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
    const installCmd = installCommands[model];
    const bin = binaryName[model] || model;
    
    const baseCheck = `where ${bin} >nul 2>nul || (echo ${model} is not installed. Auto-installing... && ${installCmd})`;

    // Prepare the command dynamically based on the agent
    let cmdToExecute = '';
    
    if (model === 'gemini') {
      cmdToExecute = `${baseCheck} && ${bin} -p "${prompt.replace(/"/g, '\\"')}"`;
    } else if (model === 'claude') {
      cmdToExecute = `${baseCheck} && ${bin} -p "${prompt.replace(/"/g, '\\"')}"`;
    } else if (model === 'opencode') {
      cmdToExecute = `${baseCheck} && ${bin} run "${prompt.replace(/"/g, '\\"')}"`;
    } else if (model === 'codex') {
      cmdToExecute = `${baseCheck} && ${bin} run "${prompt.replace(/"/g, '\\"')}"`;
    }

    const encoder = new TextEncoder();
    const isWindows = os.platform() === 'win32';
    
    // Gemini and Codex strictly require a Windows TTY (or execSync blocking) to output text without crashing/hanging.
    // Claude and OpenCode can cleanly pipe their stdout async via spawn/exec streams.
    const requiresSyncBuffer = model === 'gemini' || model === 'codex';

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`[OmniAgent] Spawning ${model} session...\n`));
        
        if (requiresSyncBuffer) {
           // Fallback to execSync for models that refuse to output over an async pipe on Windows 
           try {
             controller.enqueue(encoder.encode(`[Notice]: ${model} requires TTY. Buffering execution (this may take a minute)...\n`));
             const { execSync } = require('child_process');
             const output = execSync(cmdToExecute, { cwd: projectPath, stdio: 'pipe' });
             controller.enqueue(encoder.encode(output.toString()));
             controller.enqueue(encoder.encode(`\n[OmniAgent Process exited with code 0]`));
           } catch (err: any) {
             if (err.stdout) controller.enqueue(encoder.encode(err.stdout.toString()));
             if (err.stderr) controller.enqueue(encoder.encode(err.stderr.toString()));
             controller.enqueue(encoder.encode(`\n[Fatal OmniAgent Error]: Process failed with code ${err.status}`));
           }
           controller.close();
           return;
        }

        // Standard SSE Streaming for compliant agents (Claude / OpenCode)
        const child = spawn(isWindows ? 'cmd.exe' : 'sh', [isWindows ? '/c' : '-c', cmdToExecute], {
          cwd: projectPath
        });

        child.stdout.on('data', (data) => {
          controller.enqueue(encoder.encode(data.toString()));
        });

        child.stderr.on('data', (data) => {
          controller.enqueue(encoder.encode(data.toString()));
        });

        child.on('close', (code) => {
          controller.enqueue(encoder.encode(`\n[OmniAgent Process exited with code ${code}]`));
          controller.close();
        });
        
        child.on('error', (error) => {
          controller.enqueue(encoder.encode(`\n[Fatal OmniAgent Error]: ${error.message}`));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Fatal execution error' }, { status: 500 });
  }
}
