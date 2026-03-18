# Build with Agent Team

You are a lead orchestrator agent. Coordinate a Claude Code agent team to complete:

$ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the shared context file to get full project state:

```bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
```

From this file, extract and internalize before proceeding:
- **Project identity** — name, domain, goal, audience, constraints
- **Tech stack** — language, framework, tools, package manager
- **Project structure** — which files exist and what they do (skip re-exploring the codebase)
- **Session Log** — what was done in prior sessions; do not repeat completed work
- **Active Goals** — what is planned or in progress; use this to inform task decomposition
- **Working Rules** — constraints that apply to this session (style, permissions, environment)

If no context file exists, note the absence and proceed without it.

## Step 1: Analyze & Plan

Before spawning any agents:
1. Break the task into distinct work domains (database, backend, frontend, testing, etc.)
2. Map dependencies — what must be built before what?
3. Determine team size: 1 agent per domain, 2–5 agents typical
4. Define contracts: what does each agent produce that others depend on?

## Step 2: Create AGENT_TASKS.md

Write this file to the project root BEFORE spawning any agents:

```markdown
# Agent Team Tasks
Status: IN PROGRESS

## Agents
- [ ] [role]: [responsibility]

## Contract Chain
[upstream] → produces: [artifact path]
  ↓
[downstream] → consumes: [artifact path], produces: [artifact path]

## Task List
### Phase 1 — Sequential (must finish before Phase 2)
- [ ] [[agent]] [task] → CONTRACT: [output file path]

### Phase 2 — Parallel
- [ ] [[agent]] [task]
- [ ] [[agent]] [task]

### Phase 3 — Integration
- [ ] [[agent]] [task]
```

## Step 3: Contract-First Spawning with tmux Split Panes

NEVER spawn all agents at once when dependencies exist.

### Detect tmux

```bash
if [ -n "$TMUX" ]; then TMUX_AVAILABLE=true; else TMUX_AVAILABLE=false; fi
```

### Spawn each agent in its own pane

```bash
tmux split-window -h "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions -p 'AGENT ROLE: [role-name]

You are part of a Claude agent team. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. .claude.md (or .gemini.md / agents.md) — shared project context, tech stack, working rules, session history
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope. The context files contain what you need.

CONTRACT TO EMIT: When done, write output to [file path] and print CONTRACT READY: [role-name]'"
```

### Layout

```bash
tmux select-layout even-horizontal   # 2 agents
tmux select-layout tiled              # 3–6 agents
tmux select-pane -t 0                 # return focus to lead
```

### Spawn order

1. Spawn the most upstream agent first
2. Wait for `CONTRACT READY: [role]` before spawning dependents
3. Agents with no interdependencies can run in parallel

### Fallback (no tmux)

Run agents sequentially using Claude Code's built-in agent spawning.

## Step 4: Monitor & Complete

- Watch panes for `CONTRACT READY` signals
- Check AGENT_TASKS.md for progress
- Unblock stuck agents: `tmux send-keys -t [pane] "..." Enter`
- When all phases complete, update AGENT_TASKS.md with [✓] status
- Clean up: `tmux kill-pane` on finished panes

## Rules

- Each agent owns only their domain — no overlapping work
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete file paths, not summaries
- Production-quality output from the start
- When uncertain, ask the lead (pane 0) before proceeding
- **Research gate**: If any step depends on a factual claim, library version, API compatibility, or real-world data — run `/fact-check [claim]` as a sub-step before implementing. Paste the verified findings into AGENT_TASKS.md so all agents share the same ground truth.

## Context Update (MANDATORY — run after every use)

When all phases are complete, update all three context files:

1. Edit `.claude.md` — append to **Session Log**, update **Active Goals**, **Project Structure**, **Tech Stack**:
   - Session log format: `YYYY-MM-DD · /build-with-agent-team · [what was built] · [key decisions or files created]`
2. Sync to the other two files:

```bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
```

All three files must be identical after every run.
