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

## Step 3: Contract-First Agent Spawning

NEVER spawn all agents at once when dependencies exist.

Claude Code is running with `--teammate-mode tmux` — **every Agent tool call automatically
creates a new tmux split pane** with a full interactive sub-agent TUI. Do NOT use
`tmux split-window` or `claude -p` manually; those print mode processes exit immediately,
leaving blank panes.

### Spawn each agent using the Agent tool

Call the Agent tool for each sub-agent with this prompt structure:

```
AGENT ROLE: [role-name]

You are part of a Claude agent team. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. .claude.md (or .gemini.md / agents.md) — shared project context, tech stack, working rules, session history
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope.
The context files contain what you need.

CONTRACT TO EMIT: When done, write output to [file path] and end your response with:
CONTRACT READY: [role-name]
```

### Spawn order

1. Spawn the most upstream agent first (sequential — wait for its Agent call to return)
2. Spawn parallel agents together (multiple Agent tool calls in one response)
3. Only spawn downstream agents after upstream contracts are returned

### Fallback (in-process mode)

If `--teammate-mode` is `in-process`, Agent tool calls run inline in the same session.
The same Agent tool approach works — sub-agents run sequentially with output visible in
the main pane.

## Step 4: Monitor & Complete

- Each Agent tool call returns when the sub-agent finishes — look for `CONTRACT READY: [role]` in the return value
- Check AGENT_TASKS.md for overall phase status
- When all phases complete, update AGENT_TASKS.md with [✓] status

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
