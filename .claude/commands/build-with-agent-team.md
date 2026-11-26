# Build with Agent Team

You are a lead orchestrator agent. Coordinate a Claude Code agent team to complete:

$ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the project's short map (`AGENTS.md`: where things are, routing, rules), the open goals and the latest log lines. `AGENTS.md` is usually loaded automatically; skip the first `cat` if it is already in your context:

```bash
cat AGENTS.md 2>/dev/null || cat .claude.md 2>/dev/null || echo "NO_CONTEXT_FILE"   # short map; skip if already in your context
cat _agent-tasks/ACTIVE_GOALS.md 2>/dev/null
tail -15 _agent-tasks/SESSION_LOG.md 2>/dev/null   # never read the whole log; grep it for this topic
```

From this file, extract and internalize before proceeding:
- **Project identity** — name, domain, goal, audience, constraints
- **Tech stack** — language, framework, tools, package manager
- **Where things are / Routing** — which folders hold what, and which file to read for which job (skip re-exploring the codebase)
- **Recent log** (`_agent-tasks/SESSION_LOG.md`) — what was done before; grep it for this topic and do not repeat finished work
- **Open goals** (`_agent-tasks/ACTIVE_GOALS.md`) — what is planned or in progress; use this to inform task decomposition
- **Working Rules** — constraints that apply to this session (style, permissions, environment)

If no context file exists, note the absence and proceed without it. (Older projects keep everything in `.claude.md`; the `cat` above falls back to it.)

## Phase 0.5: Skill Auto-Selection

Before planning, analyze the task description and select 3–5 skills that best match it. Write your selection to AGENT_TASKS.md under `## Selected Skills`.

**Skill taxonomy — match task keywords to skills:**

| Task involves... | Use these skills |
|---|---|
| build / implement / create / add / feature | `/test-gen` (verify), `/review-pr` (before commit), `/commit` (final) |
| bug / fix / error / broken / failing / crash | `/debug`, `/smart-fix`, `/test-gen` (verify fix) |
| review / PR / pull request / merge | `/review-pr`, `/code-reviewer` |
| refactor / clean / optimize / restructure | `/refactor-clean`, `/tech-debt`, `/review-pr` |
| test / testing / spec / coverage / jest / vitest | `/test-gen`, `/debug` |
| UI / UX / design / component / frontend / layout | `/ux-heuristic-review`, `/design-critique` |
| accessibility / a11y / WCAG / ARIA | `/wcag-audit` |
| security / vulnerability / auth / XSS / CSRF | `/security-hardening` |
| explain / document / docs / README | `/explain`, `/doc-generate` |
| PRD / requirements / feature plan / user story | `/create-prd`, `/convert-prd` |
| autonomous / loop / iterate / automate / Ralph | `/ralph`, `/create-prd` |
| research / literature / survey | `/literature-review`, `/research-synthesis` |
| commit / save / checkpoint | `/commit`, `/checkpoint` |

**Always include for any code-change task:**
- `/review-pr` — run after the last implementation phase, before committing
- `/commit` — final step; use the `/commit` skill to write the commit message

**How to apply:**
1. Output a `## Selected Skills` block in AGENT_TASKS.md listing each skill and why it was chosen
2. Include a `USE THESE SKILLS:` block in every spawned agent's prompt:
   ```
   USE THESE SKILLS (inject at the right phase):
   - /skill-name: [when to use it for this specific task]
   ```
3. At the end of every agent team run, the integration/final agent MUST run `/review-pr` then `/commit`

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

Always set `mode: "bypassPermissions"` on every Agent tool call so sub-agents never pause for permission prompts.

Call the Agent tool for each sub-agent with this prompt structure:

```
AGENT ROLE: [role-name]

You are part of a Claude agent team. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. AGENTS.md — the short project map and rules (skip if already in your context; never read _agent-tasks/SESSION_LOG.md whole)
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope.
AGENTS.md and AGENT_TASKS.md contain what you need.

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

**Skill Toolkit** (19 available — auto-selected in Phase 0.5):
| Category | Skills |
|---|---|
| Build | `/build-with-agent-team`, `/build-hybrid-team`, `/build-smart-delegate` |
| Quality | `/test-gen`, `/review-pr`, `/debug`, `/smart-fix`, `/refactor-clean`, `/tech-debt` |
| Dev workflow | `/commit`, `/checkpoint`, `/explain`, `/doc-generate` |
| UI/UX | `/ux-heuristic-review`, `/design-critique`, `/wcag-audit` |
| Research | `/literature-review`, `/research-synthesis`, `/fact-check` |
| Autonomous | `/ralph`, `/create-prd`, `/convert-prd` |

## Context Update (MANDATORY — run after every use)

When all phases are complete, follow the **Logging** section of `AGENTS.md`:

1. Append ONE line (≤300 chars) to the END of `_agent-tasks/SESSION_LOG.md` (create the file if missing):
   - Format: `YYYY-MM-DD · /build-with-agent-team · [what was built] · [key decisions or files created]`
   - Details belong in the project's notes or docs, not in the log line.
2. Update `_agent-tasks/ACTIVE_GOALS.md` if goals opened or closed.
3. Only if a RULE changed (a new standing rule or a lesson worth keeping): edit `AGENTS.md` (keep it under ~150 lines), then copy it to the other tools' files:

```bash
cp AGENTS.md .claude.md && cp AGENTS.md .gemini.md && echo "Synced AGENTS.md → .claude.md + .gemini.md"
```

Never copy `.claude.md` onto `AGENTS.md`, and never append history to `AGENTS.md`: it is the source and stays a short map.
