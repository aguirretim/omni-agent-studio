# Build with Agent Team

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

```markdown
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
```

## Step 3: Contract-First Spawning with tmux Split Panes

NEVER spawn all agents at once when dependencies exist.

### Check for tmux and set up split panes

First, detect the environment:

```bash
# Are we inside a tmux session?
if [ -n "$TMUX" ]; then
  TMUX_AVAILABLE=true
else
  TMUX_AVAILABLE=false
fi
```

### Spawn each agent in its own tmux pane

Use this pattern for every agent you spawn (replace the role/prompt accordingly):

```bash
# Split pane and run the agent inside it
tmux split-window -h "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions -p 'AGENT ROLE: [role-name]

You are working as part of an agent team. Your ONLY responsibility is: [specific scope].

Read AGENT_TASKS.md first for the full task list and contract chain.

YOUR CONTRACT TO EMIT: When you finish [output artifact], write it to [file path] and print CONTRACT READY: [role-name] to stdout so the lead agent knows to proceed.

[Additional role-specific instructions here]'"
```

### Layout by team size

After spawning all agents, apply an even layout:

```bash
# 2 agents  → side by side
tmux select-layout even-horizontal

# 3–6 agents → tiled grid
tmux select-layout tiled

# Always return focus to the lead pane (pane 0)
tmux select-pane -t 0
```

### Spawn order (contract-first)

1. Spawn the **most upstream** agent first (e.g., database schema)
2. **Wait** for it to print `CONTRACT READY: [role]` before spawning dependents
3. Agents with no interdependencies can be spawned in parallel in separate panes

### Fallback (no tmux)

If `$TMUX` is empty (not in a tmux session), run agents sequentially using the
built-in Claude Code agent spawning — split panes won't appear but coordination still works.

## Step 4: Monitor & Complete

- Your lead pane (pane 0) stays active — watch other panes for CONTRACT READY signals
- Periodically check AGENT_TASKS.md for overall progress
- Unblock stuck agents by messaging them via their pane: `tmux send-keys -t [pane] "..." Enter`
- When all phases complete, summarize what was built
- Update AGENT_TASKS.md with final [✓] status
- Clean up: `tmux kill-pane` on finished agent panes

## Rules

- Each agent owns only their domain — no overlapping work
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete artifacts (files, code, schemas) — not summaries
- Default to production-quality code from the start
- When uncertain about scope, agents ask the lead agent (pane 0) before proceeding
