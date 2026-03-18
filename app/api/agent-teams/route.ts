import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SKILL_FILE_CONTENT = `# Build with Agent Team

You are a lead orchestrator agent. Coordinate a Claude Code agent team to complete:

$ARGUMENTS

## Step 1: Analyze & Plan

Before spawning any agents:
1. Break the task into distinct work domains (database, backend, frontend, testing, etc.)
2. Map dependencies — what must be built before what?
3. Determine team size: 1 agent per domain, 2–5 agents typical
4. Define contracts: what does each agent produce that others depend on?

## Step 2: Create AGENT_TASKS.md

Create AGENT_TASKS.md in the project root BEFORE spawning agents:

\`\`\`markdown
# Agent Team Tasks
Status: IN PROGRESS

## Agents
- [ ] [role]: [responsibility]

## Contract Chain
[upstream] → produces: [artifact]
  ↓
[downstream] → consumes: [artifact], produces: [artifact]

## Task List
### Phase 1 — Sequential (must finish before Phase 2)
- [ ] [[agent]] [task] → CONTRACT: [what to emit when done]

### Phase 2 — Parallel
- [ ] [[agent]] [task]
- [ ] [[agent]] [task]

### Phase 3 — Integration
- [ ] [[agent]] [task]
\`\`\`

## Step 3: Contract-First Spawning with tmux Split Panes

NEVER spawn all agents at once when dependencies exist.

### Check for tmux and set up split panes

First, detect the environment:

\`\`\`bash
# Are we inside a tmux session?
if [ -n "$TMUX" ]; then
  TMUX_AVAILABLE=true
else
  TMUX_AVAILABLE=false
fi
\`\`\`

### Spawn each agent in its own tmux pane

Use this pattern for every agent you spawn (replace the role/prompt accordingly):

\`\`\`bash
# Split pane and run the agent inside it
tmux split-window -h "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions -p 'AGENT ROLE: [role-name]

You are working as part of an agent team. Your ONLY responsibility is: [specific scope].

Read AGENT_TASKS.md first for the full task list and contract chain.

YOUR CONTRACT TO EMIT: When you finish [output artifact], write it to [file path] and print CONTRACT READY: [role-name] to stdout so the lead agent knows to proceed.

[Additional role-specific instructions here]'"
\`\`\`

### Layout by team size

After spawning all agents, apply an even layout:

\`\`\`bash
# 2 agents  → side by side
tmux select-layout even-horizontal

# 3–6 agents → tiled grid
tmux select-layout tiled

# Always return focus to the lead pane (pane 0)
tmux select-pane -t 0
\`\`\`

### Spawn order (contract-first)

1. Spawn the **most upstream** agent first (e.g., database schema)
2. **Wait** for it to print \`CONTRACT READY: [role]\` before spawning dependents
3. Agents with no interdependencies can be spawned in parallel in separate panes

### Fallback (no tmux)

If \`$TMUX\` is empty (not in a tmux session), run agents sequentially using the
built-in Claude Code agent spawning — split panes won't appear but coordination still works.

## Step 4: Monitor & Complete

- Your lead pane (pane 0) stays active — watch other panes for CONTRACT READY signals
- Periodically check AGENT_TASKS.md for overall progress
- Unblock stuck agents by messaging them via their pane: \`tmux send-keys -t [pane] "..." Enter\`
- When all phases complete, summarize what was built
- Update AGENT_TASKS.md with final [✓] status
- Clean up: \`tmux kill-pane\` on finished agent panes

## Rules

- Each agent owns only their domain — no overlapping work
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete artifacts (files, code, schemas) — not summaries
- Default to production-quality code from the start
- When uncertain about scope, agents ask the lead agent (pane 0) before proceeding
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectPath, plan, agentCount } = body;

    // ── Enable Agent Teams in ~/.claude/settings.json ──────────────────────
    if (action === 'enable') {
      const claudeDir = path.join(os.homedir(), '.claude');
      const settingsPath = path.join(claudeDir, 'settings.json');

      let settings: Record<string, unknown> = {};
      if (fs.existsSync(settingsPath)) {
        try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
      }

      settings.experimental = {
        ...((settings.experimental as Record<string, unknown>) || {}),
        agentTeams: true,
      };

      if (!fs.existsSync(claudeDir)) fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      return NextResponse.json({ success: true, path: settingsPath });
    }

    // ── Install /build-with-agent-team skill to project ────────────────────
    if (action === 'install-skill') {
      if (!projectPath) return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });

      const commandsDir = path.join(projectPath, '.claude', 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      const skillPath = path.join(commandsDir, 'build-with-agent-team.md');
      fs.writeFileSync(skillPath, SKILL_FILE_CONTENT);

      return NextResponse.json({ success: true, path: skillPath });
    }

    // ── Launch interactive terminal with Agent Teams enabled ────────────────
    if (action === 'launch-terminal') {
      if (!projectPath) return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });

      const agentFlag = agentCount ? ` --agents ${agentCount}` : '';
      // Escape single quotes in the plan so it's safe inside bash single-quoted strings
      const safePlan = plan ? plan.trim().replace(/'/g, `'"'"'`) : '';
      const buildCmd = safePlan
        ? `/build-with-agent-team ${safePlan}${agentFlag}`
        : null;

      const { exec, execSync } = await import('child_process');

      // ── Helper: Windows path → WSL mount path ───────────────────────────
      const toWslPath = (p: string) =>
        p.replace(/^([A-Za-z]):/, (_, l) => `/mnt/${l.toLowerCase()}`).replace(/\\/g, '/');

      // ── Capability detection ─────────────────────────────────────────────
      let hasWindowsTerminal = false;
      let hasTmux = false;

      try { execSync('where wt', { stdio: 'pipe', timeout: 3000 }); hasWindowsTerminal = true; } catch {}
      try {
        execSync('where wsl', { stdio: 'pipe', timeout: 3000 });
        const out = execSync('wsl -e which tmux', { stdio: 'pipe', timeout: 5000 }).toString().trim();
        hasTmux = out.length > 0;
      } catch {}

      // ── Tier 1 & 2: tmux split-pane (Windows Terminal preferred) ─────────
      if (hasTmux) {
        const wslProject = toWslPath(projectPath);
        const SESSION = 'agent-team'; // reuse/overwrite any stale session

        // Build the shell script lines
        const lines = [
          '#!/bin/bash',
          `cd '${wslProject}'`,
          'export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1',
          '',
          `SESSION="${SESSION}-$$"`,
          '',
          '# Start Claude in a detached tmux session',
          'tmux new-session -d -s "$SESSION" "claude"',
          '',
          '# Wait for Claude to finish initialising, then auto-send the plan',
        ];

        if (buildCmd) {
          lines.push(
            '(',
            '  sleep 6',
            `  tmux send-keys -t "$SESSION" '/build-with-agent-team ${safePlan}${agentFlag}' Enter`,
            ') &',
          );
        } else {
          lines.push('echo "[AgentTeams] Claude ready — type /build-with-agent-team [plan]"');
        }

        lines.push(
          '',
          '# Attach so the user sees the split panes as agents spawn',
          'tmux attach-session -t "$SESSION"',
        );

        const scriptWinPath = path.join(projectPath, '.agent-team-launch.sh');
        fs.writeFileSync(scriptWinPath, lines.join('\n'), { encoding: 'utf8' });
        const scriptWslPath = toWslPath(scriptWinPath);

        if (hasWindowsTerminal) {
          // Windows Terminal renders tmux panes beautifully
          exec(`wt.exe --title "Agent Team" wsl.exe bash "${scriptWslPath}"`);
          return NextResponse.json({ success: true, mode: 'wt-tmux' });
        } else {
          // Fall back to cmd.exe hosting WSL+tmux
          exec(`start "Agent Team — tmux" cmd.exe /K "wsl bash '${scriptWslPath}'"`);
          return NextResponse.json({ success: true, mode: 'cmd-tmux' });
        }
      }

      // ── Tier 3: no tmux — plain terminal, no split panes ─────────────────
      const echoLine = buildCmd
        ? `echo.[AgentTeams] Ready — type: ${buildCmd.replace(/'/g, '')} && echo.`
        : '';
      const parts = [
        `cd /d "${projectPath}"`,
        'set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1',
        echoLine,
        'claude',
      ].filter(Boolean);

      if (hasWindowsTerminal) {
        exec(`wt.exe --title "Agent Team" cmd.exe /K "${parts.join(' && ')}"`);
        return NextResponse.json({ success: true, mode: 'wt-cmd' });
      }

      exec(`start "Agent Team — Claude Code" cmd.exe /K "${parts.join(' && ')}"`);
      return NextResponse.json({ success: true, mode: 'cmd' });
    }

    // ── Launch headless (streaming) ─────────────────────────────────────────
    if (action === 'launch-headless') {
      if (!projectPath || !plan) {
        return NextResponse.json({ error: 'projectPath and plan are required' }, { status: 400 });
      }

      const agentFlag = agentCount ? ` --agents ${agentCount}` : '';
      const fullPrompt = `/build-with-agent-team ${plan.trim()}${agentFlag}`;
      const safePrompt = fullPrompt.replace(/"/g, '\\"');
      const cmdToExecute = `claude --dangerously-skip-permissions -p "${safePrompt}"`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`[AgentTeams] Launching headless team...\n`));
          controller.enqueue(encoder.encode(`[AgentTeams] Plan: ${plan.trim().substring(0, 120)}\n\n`));

          const child = spawn('cmd.exe', ['/c', cmdToExecute], {
            cwd: projectPath,
            env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' },
          });

          child.stdout.on('data', (data: Buffer) => controller.enqueue(encoder.encode(data.toString())));
          child.stderr.on('data', (data: Buffer) => controller.enqueue(encoder.encode(data.toString())));
          child.on('close', (code: number | null) => {
            controller.enqueue(encoder.encode(`\n[AgentTeams] Exited with code ${code}`));
            controller.close();
          });
          child.on('error', (err: Error) => {
            controller.enqueue(encoder.encode(`\n[Fatal] ${err.message}`));
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // ── Check WSL + tmux status ─────────────────────────────────────────────
    if (action === 'check-wsl') {
      const { execSync } = require('child_process');

      let wslAvailable = false;
      let distroInstalled = false;
      let tmuxInstalled = false;

      // Step 1: is wsl.exe reachable?
      try {
        execSync('where wsl', { stdio: 'pipe', timeout: 4000 });
        wslAvailable = true;
      } catch {}

      // Step 2: is at least one distro registered?
      if (wslAvailable) {
        try {
          // wsl -l outputs UTF-16LE on Windows — decode carefully
          const buf: Buffer = execSync('wsl -l --quiet', { stdio: 'pipe', timeout: 6000 });
          const text = buf.toString('utf16le').replace(/\0/g, '').trim();
          distroInstalled = text.length > 0 && !text.toLowerCase().includes('no installed');
        } catch {}
      }

      // Step 3: is tmux installed inside WSL?
      if (distroInstalled) {
        try {
          const out = execSync('wsl -e which tmux', { stdio: 'pipe', timeout: 6000 }).toString().trim();
          tmuxInstalled = out.length > 0;
        } catch {}
      }

      return NextResponse.json({ wslAvailable, distroInstalled, tmuxInstalled });
    }

    // ── Install WSL (elevated UAC prompt) ───────────────────────────────────
    if (action === 'install-wsl') {
      const { exec } = await import('child_process');
      // PowerShell Start-Process with RunAs triggers UAC elevation
      exec(`powershell -Command "Start-Process cmd -ArgumentList '/c wsl --install' -Verb RunAs"`);
      return NextResponse.json({
        success: true,
        message: 'UAC prompt opened. Approve it, then restart Windows when installation completes.',
      });
    }

    // ── Install tmux inside WSL (streaming) ─────────────────────────────────
    if (action === 'install-tmux') {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode('[WSL] Installing tmux inside WSL...\n\n'));

          const child = spawn('wsl.exe', [
            '-e', 'bash', '-c',
            'sudo apt-get update -qq 2>&1 && sudo apt-get install -y tmux 2>&1 && echo "" && echo "[Done] tmux installed successfully"',
          ]);

          child.stdout.on('data', (d: Buffer) => controller.enqueue(encoder.encode(d.toString())));
          child.stderr.on('data', (d: Buffer) => controller.enqueue(encoder.encode(d.toString())));
          child.on('close', (code: number | null) => {
            controller.enqueue(encoder.encode(`\n[WSL] Process exited with code ${code}`));
            controller.close();
          });
          child.on('error', (err: Error) => {
            controller.enqueue(encoder.encode(`\n[Fatal] ${err.message}\nMake sure WSL is installed and a Linux distro is set up.`));
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Fatal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
