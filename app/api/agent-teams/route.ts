import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Skill 1: Claude-only team (/build-with-agent-team) ─────────────────────
const SKILL_CLAUDE_ONLY = `# Build with Agent Team

You are a lead orchestrator agent. Coordinate a Claude Code agent team to complete:

$ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the shared context file to get full project state:

\`\`\`bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
\`\`\`

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

\`\`\`markdown
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
\`\`\`

## Step 3: Contract-First Spawning with tmux Split Panes

NEVER spawn all agents at once when dependencies exist.

### Detect tmux

\`\`\`bash
if [ -n "$TMUX" ]; then TMUX_AVAILABLE=true; else TMUX_AVAILABLE=false; fi
\`\`\`

### Spawn each agent in its own pane

\`\`\`bash
tmux split-window -h "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions -p 'AGENT ROLE: [role-name]

You are part of a Claude agent team. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. .claude.md (or .gemini.md / agents.md) — shared project context, tech stack, working rules, session history
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope. The context files contain what you need.

CONTRACT TO EMIT: When done, write output to [file path] and print CONTRACT READY: [role-name]'"
\`\`\`

### Layout

\`\`\`bash
tmux select-layout even-horizontal   # 2 agents
tmux select-layout tiled              # 3–6 agents
tmux select-pane -t 0                 # return focus to lead
\`\`\`

### Spawn order

1. Spawn the most upstream agent first
2. Wait for \`CONTRACT READY: [role]\` before spawning dependents
3. Agents with no interdependencies can run in parallel

### Fallback (no tmux)

Run agents sequentially using Claude Code's built-in agent spawning.

## Step 4: Monitor & Complete

- Watch panes for \`CONTRACT READY\` signals
- Check AGENT_TASKS.md for progress
- Unblock stuck agents: \`tmux send-keys -t [pane] "..." Enter\`
- When all phases complete, update AGENT_TASKS.md with [✓] status
- Clean up: \`tmux kill-pane\` on finished panes

## Rules

- Each agent owns only their domain — no overlapping work
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete file paths, not summaries
- Production-quality output from the start
- When uncertain, ask the lead (pane 0) before proceeding
- **Research gate**: If any step depends on a factual claim, library version, API compatibility, or real-world data — run \`/fact-check [claim]\` as a sub-step before implementing. Paste the verified findings into AGENT_TASKS.md so all agents share the same ground truth.

## Context Update (MANDATORY — run after every use)

When all phases are complete, update all three context files:

1. Edit \`.claude.md\` — append to **Session Log**, update **Active Goals**, **Project Structure**, **Tech Stack**:
   - Session log format: \`YYYY-MM-DD · /build-with-agent-team · [what was built] · [key decisions or files created]\`
2. Sync to the other two files:

\`\`\`bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
\`\`\`

All three files must be identical after every run.
`;

// ── Skill 2: Hybrid team (/build-hybrid-team) ──────────────────────────────
const SKILL_HYBRID = `# Build Hybrid Agent Team

You are a lead orchestrator agent. You have two classes of workers at your disposal:
1. **Claude sub-agents** — spawned in tmux panes, full agentic capability (read/write files, run commands, reason)
2. **Specialist CLI tools** — run as bash subprocesses (Gemini for large-context analysis, OpenCode/Codex for bounded generation tasks)

Your task: $ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the shared context file to get full project state:

\`\`\`bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
\`\`\`

From this file, extract and internalize before proceeding:
- **Project identity** — name, domain, goal, audience, constraints
- **Tech stack** — language, framework, tools, package manager (do not re-detect what's already known)
- **Project structure** — which files exist and what they do (skip re-exploring the codebase)
- **Session Log** — what was done in prior sessions; do not repeat completed work
- **Active Goals** — what is planned or in progress; use this to inform task decomposition and tool assignment
- **Working Rules** — constraints that apply to this session (style, permissions, environment)

If no context file exists, note the absence and proceed without it.

## Tool Assignment — use the right tool for each job

| Task | Best tool | Reason |
|------|-----------|--------|
| Architecture planning, contract design | Claude sub-agent | Needs full reasoning + file access |
| Analyzing a large or unfamiliar codebase | Gemini CLI | Up to 1M token context window |
| Writing/editing files, running commands | Claude sub-agent | Needs full filesystem + tool access |
| Generating a single isolated file from a clear spec | OpenCode or Codex | Fast, focused, no side effects |
| Reviewing output from another tool | Claude sub-agent | Needs to reason about the result |
| Any task requiring iterative decisions | Claude sub-agent | Only Claude sub-agents can self-correct |

## Step 1: Analyze & Plan

Before spawning anything:
1. Break the task into distinct work domains
2. Map dependencies — what must exist before what?
3. Assign each domain to the best tool (see table above)
4. Define contracts: what does each worker produce that others depend on?

## Step 2: Create AGENT_TASKS.md

Write this file to the project root BEFORE any workers start:

\`\`\`markdown
# Agent Team Tasks
Status: IN PROGRESS

## Workers
- [ ] [tool/role]: [responsibility]

## Contract Chain
[upstream worker] → produces: [artifact path]
  ↓
[downstream worker] → consumes: [artifact path], produces: [artifact path]

## Task List
### Phase 1 — Sequential
- [ ] [[worker]] [task] → CONTRACT: [output file path]

### Phase 2 — Parallel
- [ ] [[worker]] [task]
- [ ] [[worker]] [task]

### Phase 3 — Integration
- [ ] [[worker]] [task]
\`\`\`

## Step 3: Spawn Workers in the Right Order

### Claude sub-agents (tmux panes — interactive, full capability)

\`\`\`bash
tmux split-window -h "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude --dangerously-skip-permissions -p 'AGENT ROLE: [role-name]

You are part of a hybrid agent team led by Claude. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. .claude.md (or .gemini.md / agents.md) — shared project context, tech stack, working rules, session history
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope. The context files contain what you need.

CONTRACT TO EMIT: When done, write your output to [file path] and print CONTRACT READY: [role-name]'"
\`\`\`

### Gemini as large-context analyst (bash subprocess — blocking)

Use when you need to understand a large codebase before assigning work.
Run this BEFORE spawning implementation agents so their prompts can reference the analysis.

**Critical constraints for Gemini \`-p\` mode:**
- Available tools: \`read_file\`, \`grep_search\`, \`glob\` ONLY
- Blocked tools: \`run_shell_command\`, \`write_file\`, \`generalist\`, \`codebase_investigator\`, any sub-agent
- Do NOT ask Gemini to "analyze the directory" or "enumerate files" — it will try \`run_shell_command\` and fail
- Gemini can read individual files via \`read_file\` and search via \`grep_search\`/\`glob\` — direct it to specific files

**Claude must pre-fetch directory structure** before invoking Gemini. Run \`git ls-files\` first, then inject the file list as plain text into the Gemini prompt so it knows what to read.

\`\`\`bash
# Step 1 (Claude does this): pre-fetch the file tree
FILE_TREE=$(git ls-files 2>/dev/null | head -100)

# Step 2: invoke Gemini with the file tree pre-injected
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "gemini -p 'TOOL RESTRICTIONS (STRICT): You have access to read_file, grep_search, and glob ONLY. DO NOT call run_shell_command, write_file, generalist, codebase_investigator, or any sub-agent tool. Use read_file to read specific files listed below.

You are a codebase analyst. The project file tree is:

[INJECT \$FILE_TREE HERE]

Read the key files listed above (package.json, tsconfig, main entry points, API routes, components) and produce:
1. Complete folder structure with file purposes
2. All API routes / endpoints with their request/response types
3. All major data models or TypeScript interfaces
4. Key dependencies and their roles
Be exhaustive. Output clean markdown.'" > .gemini-analysis.md 2>&1
echo "CONTRACT READY: gemini-analyst"
\`\`\`

Read \`.gemini-analysis.md\` before writing prompts for Claude sub-agents — it gives them full codebase context without each agent needing to re-read the entire project.

### OpenCode / Codex as isolated file generators (bash subprocess — blocking)

Use only when the output is a single, fully-specified file with no ambiguity.

\`\`\`bash
# OpenCode generates one specific file from a precise spec
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "opencode 'Generate ONLY the file src/types/user.ts. Schema: [paste schema here]. No other files. No explanations. Production TypeScript.'" > .opencode-output.md 2>&1

# Review the output before accepting it
cat .opencode-output.md
# Then copy to the real path if acceptable
\`\`\`

\`\`\`bash
# Codex alternative
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "codex --approval-mode full-auto -q 'Generate ONLY src/utils/format.ts with these exports: [list exports + types]. No other files.'" > .codex-output.md 2>&1
\`\`\`

**Always review specialist tool output before treating it as a contract** — unlike Claude sub-agents, they cannot self-correct if their output doesn't match expectations.

### Layout after spawning Claude panes

\`\`\`bash
# 2 panes → side by side
tmux select-layout even-horizontal

# 3–6 panes → tiled grid
tmux select-layout tiled

# Return focus to lead (pane 0)
tmux select-pane -t 0
\`\`\`

### Spawn order (contract-first)

1. Run **Gemini analysis first** if the codebase is large or unfamiliar (blocking — wait for it)
2. Spawn the most upstream Claude sub-agent next
3. Wait for \`CONTRACT READY: [role]\` before spawning dependents
4. Use OpenCode/Codex only for leaf tasks with no downstream dependencies

### Fallback (no tmux)

Run Claude sub-agents sequentially using built-in Claude Code agent spawning.
Gemini and specialist tools still work — they are bash calls, not tmux-dependent.

## Step 4: Monitor & Integrate

- Watch panes for \`CONTRACT READY\` signals
- Check AGENT_TASKS.md for overall progress
- Unblock stuck Claude agents: \`tmux send-keys -t [pane] "..." Enter\`
- **Review all specialist tool outputs** (Gemini, OpenCode, Codex) before marking their contracts complete — they cannot flag their own errors
- When all phases complete, summarize what each worker built
- Update AGENT_TASKS.md with final [✓] status
- Clean up: \`tmux kill-pane\` on finished Claude panes

## Rules

- Claude sub-agents own implementation — specialist tools only produce draft artifacts
- Always review specialist output before it becomes a contract input
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete file paths — not summaries or verbal confirmations
- Default to production-quality output from the start
- When uncertain about scope, ask the lead (pane 0) before proceeding
- **Research gate**: If any step depends on a factual claim, library version, API compatibility, or real-world data — run \`/fact-check [claim]\` before implementing. Use Gemini for large-context literature review in the same pass (pass it the claim alongside any relevant codebase context). Paste verified findings into AGENT_TASKS.md.

## Context Update (MANDATORY — run after every use)

When all phases are complete, update all three context files:

1. Edit \`.claude.md\` — append to **Session Log**, update **Active Goals**, **Project Structure**, **Tech Stack**:
   - Session log format: \`YYYY-MM-DD · /build-hybrid-team · [what was built] · [which tools handled which phases] · [key decisions]\`
2. Sync to the other two files:

\`\`\`bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
\`\`\`

All three files must be identical after every run.
`;

// ── Skill 3: Usage-aware router (/build-smart-delegate) ────────────────────
const SKILL_SMART_DELEGATE = `# Smart Delegate — Usage-Aware Task Router

You are a cost-conscious task router. Your default is to **offload as much work as possible to non-Claude tools** — Gemini, Codex, and OpenCode — to preserve Claude token budget. Claude's role is orchestration and final review, not implementation.

Your task: $ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the shared context file to get full project state:

\`\`\`bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
\`\`\`

From this file, extract and internalize before probing tools or choosing a strategy:
- **Project identity** — name, domain, goal, audience, constraints
- **Tech stack** — language, framework, tools, package manager (do not re-detect what's already known)
- **Project structure** — which files exist and what they do (skip re-exploring the codebase)
- **Session Log** — what was done in prior sessions; do not repeat completed work
- **Active Goals** — what is planned or in progress; factor this into task size estimation for Step 1
- **Working Rules** — constraints that apply to this session

If no context file exists, note the absence and proceed without it.

## Step 1: Probe Every Tool — Run All Checks Before Deciding Anything

Run ALL of the following checks now. Do not skip any. Do not decide a strategy until every check is complete.

### 1a. Claude self-assessment

Honestly evaluate your own current session state across three dimensions:

**Session load** (count of prior messages + tool calls in this conversation):
- < 20 turns → LOW load
- 20–60 turns → MEDIUM load
- > 60 turns → HIGH load

**Task size** (estimate based on the $ARGUMENTS):
- Single file or focused change → SMALL
- Multi-file feature or refactor → MEDIUM
- Full system, multi-domain build → LARGE

**Rate-limit signal**: Have you seen any rate-limit or quota warnings this session?
- Yes → flag as CONSTRAINED
- No → CLEAR

Combine into a Claude score:
- LOW load + SMALL task + CLEAR → **Claude: FULL**
- Any MEDIUM → **Claude: PARTIAL**
- HIGH load OR LARGE task OR CONSTRAINED → **Claude: LIMITED**

### 1b. Probe Gemini

\`\`\`bash
# Step 1: Is Gemini installed? (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "gemini --version" 2>/dev/null && echo "GEMINI_INSTALLED=true" || echo "GEMINI_INSTALLED=false"

# Step 2: Is auth configured? (Gemini uses OAuth or API key)
[ -f "$HOME/.gemini/oauth_creds.json" ] && echo "GEMINI_AUTH=oauth" || \\
  ([ -n "$GEMINI_API_KEY" ] && echo "GEMINI_AUTH=api_key" || echo "GEMINI_AUTH=none")

# Step 3: Does it respond? (lightweight probe — no file ops)
powershell -Command "gemini -p 'Reply with only the single word: READY'" 2>&1 | grep -q "READY" && echo "GEMINI_RESPONSIVE=true" || echo "GEMINI_RESPONSIVE=false"
\`\`\`

Score Gemini:
- Installed + (oauth OR api_key) + responsive → **Gemini: READY** (large-context analysis, up to 1M tokens)
- Installed + (oauth OR api_key) + not responsive → **Gemini: ERROR** (installed but failing — note the error)
- Installed + no auth configured → **Gemini: NO_KEY**
- Not installed → **Gemini: ABSENT**

### 1c. Probe OpenCode

\`\`\`bash
# Is OpenCode installed? (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "opencode --version" 2>/dev/null && echo "OPENCODE_INSTALLED=true" || echo "OPENCODE_INSTALLED=false"

# Check auth (OpenCode stores credentials at ~/.local/share/opencode/auth.json)
[ -n "$OPENAI_API_KEY" ] && echo "OPENCODE_AUTH=api_key" || \\
  ([ -s "$HOME/.local/share/opencode/auth.json" ] && echo "OPENCODE_AUTH=configured" || \\
  ([ -f "$HOME/.config/opencode/config.json" ] && echo "OPENCODE_AUTH=config" || echo "OPENCODE_AUTH=none"))

powershell -Command "opencode --version" 2>/dev/null && echo "OPENCODE_RESPONSIVE=true" || echo "OPENCODE_RESPONSIVE=false"
\`\`\`

Score OpenCode:
- Installed + auth present + responsive → **OpenCode: READY** (isolated file generation)
- Otherwise → **OpenCode: ABSENT / NO_KEY / ERROR**

### 1d. Probe Codex

\`\`\`bash
# Is Codex installed? (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "codex --version" 2>/dev/null && echo "CODEX_INSTALLED=true" || echo "CODEX_INSTALLED=false"

# Check auth (Codex uses ~/.codex/auth.json, not OPENAI_API_KEY env var)
[ -n "$OPENAI_API_KEY" ] && echo "CODEX_AUTH=api_key" || \\
  ([ -f "$HOME/.codex/auth.json" ] && echo "CODEX_AUTH=auth_file" || \\
  ([ -f "$HOME/.codex/config.json" ] && echo "CODEX_AUTH=config" || echo "CODEX_AUTH=none"))

powershell -Command "codex --version" 2>/dev/null && echo "CODEX_RESPONSIVE=true" || echo "CODEX_RESPONSIVE=false"
\`\`\`

Score Codex:
- Installed + auth present + responsive → **Codex: READY** (isolated file generation, alternative to OpenCode)
- Otherwise → **Codex: ABSENT / NO_KEY / ERROR**

### 1e. Print capability matrix

After all checks, print a summary before doing anything else:

\`\`\`
=== CAPABILITY MATRIX ===
Claude:   [FULL / PARTIAL / LIMITED]
Gemini:   [READY / ERROR / NO_KEY / ABSENT]
OpenCode: [READY / ERROR / NO_KEY / ABSENT]
Codex:    [READY / ERROR / NO_KEY / ABSENT]
Task size: [SMALL / MEDIUM / LARGE]
=========================
\`\`\`

## Step 2: Auto-Select Strategy

**Default priority: other tools first. Claude handles orchestration and review only.**

Apply this decision matrix automatically — do not ask the user:

| Gemini | OpenCode/Codex | Claude | → Strategy |
|--------|----------------|--------|-----------|
| READY | Any | Any | **Gemini-leads** — Gemini executes full task, Claude reviews output only |
| Not READY | READY | Any | **Specialist-led** — Codex/OC generates all files, Claude reviews only |
| Not READY | Not READY | FULL or PARTIAL | **Claude-only, phased** — break into small bounded phases to minimize token use |
| Not READY | Not READY | LIMITED | **Pause** — warn user, no viable execution path |

**Why this order:** Gemini CLI (OAuth) and Codex are effectively free or separate-budget tools. Every line Claude writes costs extra usage billing. Offloading saves real money.

State the chosen strategy, which tool handles which phase, and estimated Claude token savings — before any work begins.

## Step 3: Execute the Chosen Strategy

### Strategy: Gemini-leads ← DEFAULT when Gemini is READY

Gemini analyzes and generates content. Claude writes the actual files.

**Critical constraints for Gemini \`-p\` mode:**
- Available tools: \`read_file\`, \`grep_search\`, \`glob\` ONLY
- Blocked tools: \`run_shell_command\`, \`write_file\`, \`generalist\`, \`codebase_investigator\`, any sub-agent
- Gemini will error if asked (even implicitly) to run shell commands or spawn sub-agents

**Claude must pre-fetch all shell data before invoking Gemini.** Any data that requires a shell command (git status, directory listings, command output) must be fetched by Claude first and injected as plain text into the Gemini prompt. Never ask Gemini to "run git status" or "analyze the project directory" — it will attempt \`run_shell_command\` and fail.

\`\`\`bash
# Step 1 (Claude does this): pre-fetch any shell data the task needs
# Example — if the task involves auditing changes:
# GIT_STATUS=$(git status --short 2>/dev/null)
# GIT_DIFF=$(git diff --stat HEAD 2>/dev/null)
# Then inject $GIT_STATUS / $GIT_DIFF as literal text in the prompt below

# Step 2: invoke Gemini with all context and data already embedded
powershell -Command "gemini -p 'TOOL RESTRICTIONS (STRICT): You have access to read_file, grep_search, and glob ONLY. DO NOT call run_shell_command, write_file, generalist, codebase_investigator, or any sub-agent tool. If you need shell data, use grep_search or read_file instead, or work from the pre-fetched data embedded in this prompt.

PROJECT CONTEXT: Read .gemini.md for full project state, tech stack, and working rules. Use read_file to load it.

[PRE-FETCHED SHELL DATA — inject any git status / file listings / command output here as plain text]

Your task: [task description — be precise, include file paths and constraints]

Instructions:
1. Break the task into numbered phases and reason through each one
2. For EVERY file to create or modify, output the COMPLETE content using this exact format — no truncation, production quality:

=== FILE: relative/path/to/file.ext ===
[complete file content here]
=== END FILE ===

3. After all file blocks, output a summary:

=== SUMMARY ===
Files: [list each path]
Decisions: [key decisions made]
Needs review: [anything incomplete or uncertain]
=== END SUMMARY ===' " 2>&1 | tee .gemini-task-output.md
\`\`\`

Claude then reads \`.gemini-task-output.md\` and:
1. Extracts each \`=== FILE: path ===\` block and writes it to disk using the Write tool
2. Reads the SUMMARY section and spot-checks 1–2 key files
3. Applies corrections only if clearly wrong — accept Gemini's work as-is otherwise
4. Surfaces anything in "Needs review" that requires user decision

**Claude token spend: prompt writing + file extraction + summary review only.**

### Strategy: Specialist-led ← when Gemini absent, Codex/OC available

Break the task into isolated, fully-specified file-level chunks. For each chunk:

\`\`\`bash
powershell -Command "codex --approval-mode full-auto -q 'Generate ONLY [file path]. [Full spec]. No other files. Production quality. Write directly to [path].'" 2>&1
\`\`\`

Claude reads each output file and applies corrections only if clearly wrong. Accept correct output as-is.

**Claude token spend: chunk specification + spot-check corrections only.**

### Strategy: Claude-only, phased ← last resort when no other tools available

Only when Gemini and Codex/OC are both unavailable. Break the task into the smallest possible phases to minimize per-phase token use. Complete one phase, stop, let user continue the next session if needed.

**Claude token spend: full — use this path only when forced to.**

### Strategy: Pause ← when Claude is LIMITED and no tools available

Tell the user:
1. All tools checked and their status
2. What to install: \`npm install -g @google/gemini-cli\` for Gemini, \`npm install -g opencode-ai\` for OpenCode
3. To wait for Claude usage to reset before continuing

Do not attempt the task. Do not produce partial output.

## Rules

- **Cost-first:** Gemini and Codex/OC are always preferred over Claude doing the work — even when Claude is FULL
- Always probe all tools BEFORE choosing a strategy — never skip the matrix
- State the chosen strategy, which tool handles which phase, and why — before any work begins
- Accept correct specialist output as-is — do not rewrite just to "clean it up" (that wastes tokens)
- Update AGENT_TASKS.md with which tool handled each phase
- If Gemini or Codex fails mid-task, stop, re-probe, and re-route — do not silently fall back to Claude
- **Research gate**: If any step depends on a factual claim or real-world data — run \`/fact-check [claim]\` and route it through Gemini first (free tier, large context)

## Context Update (MANDATORY — run after every use)

When the task is complete (or if Pausing), update all three context files:

1. Edit \`.claude.md\` — append to **Session Log**, update **Active Goals**, **Project Structure**, **Tech Stack**:
   - Session log format: \`YYYY-MM-DD · /build-smart-delegate · [strategy chosen] · [capability matrix scores] · [what was built or why paused]\`
   - If Pause strategy: note which tools are missing and what needs to be installed
2. Sync to the other two files:

\`\`\`bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
\`\`\`

All three files must be identical after every run. This keeps Gemini, Codex, and any other agent that opens this folder fully in sync.
`;

// ── Skill 4: Multi-model fact checker (/fact-check) ─────────────────────────
const SKILL_FACT_CHECK = `# Fact Check — Multi-Model Research & Verification

You are a rigorous fact-checker. Your job is to research a claim or topic using every available AI tool independently, then cross-verify their findings, highlight contradictions, and produce a sourced report saved to disk.

**Claim or topic to fact-check:** $ARGUMENTS

If no argument was provided, ask the user for a claim before proceeding.

---

## Step 0: Load Context

\`\`\`bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
\`\`\`

Note the project path and working rules. The report will be saved to the project root.

---

## Step 1: Probe Available Tools

Run these checks to know which models are available. Do not skip any.

\`\`\`bash
# Gemini (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "gemini --version" 2>/dev/null && echo "GEMINI_INSTALLED=true" || echo "GEMINI_INSTALLED=false"
[ -f "$HOME/.gemini/oauth_creds.json" ] && echo "GEMINI_AUTH=oauth" || ([ -n "$GEMINI_API_KEY" ] && echo "GEMINI_AUTH=key" || echo "GEMINI_AUTH=none")

# Codex (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "codex --version" 2>/dev/null && echo "CODEX_INSTALLED=true" || echo "CODEX_INSTALLED=false"
[ -f "$HOME/.codex/auth.json" ] && echo "CODEX_AUTH=present" || echo "CODEX_AUTH=absent"

# OpenCode (use powershell on Windows — npm .sh wrappers break in Git Bash)
powershell -Command "opencode --version" 2>/dev/null && echo "OPENCODE_INSTALLED=true" || echo "OPENCODE_INSTALLED=false"
[ -n "$OPENAI_API_KEY" ] && echo "OPENCODE_AUTH=api_key" || \\
  ([ -s "$HOME/.local/share/opencode/auth.json" ] && echo "OPENCODE_AUTH=configured" || echo "OPENCODE_AUTH=none")
\`\`\`

Print a summary:
\`\`\`
=== AVAILABLE MODELS ===
Claude:   ALWAYS AVAILABLE (you)
Gemini:   [READY / NO_AUTH / ABSENT]
Codex:    [READY / NO_AUTH / ABSENT]
OpenCode: [READY / NO_AUTH / ABSENT]
========================
\`\`\`

---

## Step 2: Independent Research Phase

Each available model researches the claim **independently** — they must not see each other's output first. This prevents anchoring bias.

Create a slug from the claim for filenames: lowercase, spaces → hyphens, max 40 chars. Example: "Is coffee healthy" → \`coffee-healthy\`.

### 2a. Claude researches

You (Claude) conduct structured research now using your available tools. Execute each sub-step in order:

**2a-i. Web search — find primary sources**
Use WebSearch to run at least 3 targeted searches on the claim. Vary the angle:
- Search 1: the claim as stated
- Search 2: the strongest counter-argument or "myth vs fact" framing
- Search 3: primary source or official body most likely to have authoritative data (CDC / WHO / peer-reviewed journal / official docs / etc.)

**2a-ii. Read primary sources**
For the 2–3 most authoritative URLs found in your searches, use WebFetch to read the actual page content — not just the snippet. Look for:
- Data, statistics, or study results (note sample size, date, methodology if visible)
- Caveats, limitations, or nuance the headline might miss
- Whether the source is primary (original study) or secondary (reporting on a study)

**2a-iii. Contradiction check**
Actively search for evidence that contradicts your initial findings. Use WebSearch with terms like "criticism of [finding]", "[claim] debunked", or "[claim] controversy". If contradicting evidence exists, it must appear in your findings — do not bury it.

**2a-iv. Write findings to file**
Write your research to \`.factcheck-claude.md\` in this exact format:

\`\`\`markdown
# Claude Research: [claim]
Date: [today]

## Sources consulted
[numbered list: URL + source type (peer-reviewed / official / news / expert org / anecdote) + date published if known]

## Findings
[numbered list — each finding states: the finding, the source it comes from, confidence: HIGH / MEDIUM / LOW, and a brief note on source quality]

## Contradicting evidence found
[list any evidence that opposes the main findings, with source — if none found, state "searched for contradictions, none found"]

## What I could not verify
[list specific sub-claims that couldn't be sourced — never fabricate]

## Preliminary verdict
[TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED] — [1-sentence reasoning citing the strongest evidence]
\`\`\`

### 2b. Gemini researches (if READY)

\`\`\`bash
powershell -Command "gemini -p 'You are a rigorous fact-checker. Research this claim independently.

Claim: $ARGUMENTS

Instructions:
1. Search for primary sources, official data, peer-reviewed research, and expert consensus
2. For each finding note: source type (peer-reviewed/official/news/expert consensus), confidence (HIGH/MEDIUM/LOW)
3. Flag anything you cannot verify — never fabricate
4. Give a preliminary verdict: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED with 1-sentence reasoning

Output ONLY in this exact markdown format:

## Findings
[numbered list]

## What I could not verify
[list]

## Preliminary verdict
[verdict] — [reasoning]'" > .factcheck-gemini.md 2>&1
echo "Gemini research saved"
\`\`\`

If Gemini is not available, note the absence and skip this step.

### 2c. Codex researches (if READY)

\`\`\`bash
powershell -Command "codex --approval-mode full-auto -q 'You are a rigorous fact-checker. Research this claim independently. Claim: $ARGUMENTS. For each finding note source type and confidence (HIGH/MEDIUM/LOW). Flag anything you cannot verify. Give a preliminary verdict: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED with 1-sentence reasoning. Format your output as markdown with sections: ## Findings, ## What I could not verify, ## Preliminary verdict. Write the output to the file .factcheck-codex.md'" 2>&1
echo "Codex research saved"
\`\`\`

If Codex is not available, note the absence and skip this step.

---

## Step 3: Cross-Verification

Read all available research files:

\`\`\`bash
echo "=== CLAUDE ===" && cat .factcheck-claude.md 2>/dev/null || echo "(not found)"
echo "=== GEMINI ===" && cat .factcheck-gemini.md 2>/dev/null || echo "(not found)"
echo "=== CODEX ===" && cat .factcheck-codex.md 2>/dev/null || echo "(not found)"
\`\`\`

Now compare the outputs. For each distinct claim or sub-finding:

**Agreement analysis:**
- If 2+ models agree on a finding with HIGH confidence → mark as **CONFIRMED**
- If 2+ models agree but with MEDIUM confidence → mark as **LIKELY**
- If models disagree → mark as **DISPUTED** and note what differs
- If only one model found it → mark as **UNVERIFIED BY OTHERS**

**Contradiction analysis:**
For each contradiction:
1. State exactly what each model claimed
2. Identify the likely source of disagreement (outdated data, hallucination, ambiguity in the claim, genuine scientific dispute)
3. Note what evidence would resolve it

**Verdict reconciliation:**
- Tally verdicts across models: TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED
- If verdicts differ, explain why and lean toward the most evidence-backed position

---

## Step 4: Generate Final Report

Create a slug from the claim (lowercase, spaces → hyphens, max 40 chars).

Write the final report to \`FACT_CHECK_[slug].md\` in the project root:

\`\`\`markdown
# Fact Check Report: [claim]
**Date:** [today's date]
**Models used:** [list which models contributed]
**Claim:** [exact claim as given]

---

## Final Verdict
**[TRUE / FALSE / PARTIALLY TRUE / UNVERIFIED / DISPUTED]**

[2–3 sentence summary of the verdict with the strongest evidence.]

---

## Evidence Summary

### Confirmed findings (2+ models agree, HIGH confidence)
[numbered list]

### Likely findings (2+ models agree, MEDIUM confidence)
[numbered list]

### Disputed findings (models disagree)
| Finding | Claude says | Gemini says | Codex says | Likely reason |
|---------|-------------|-------------|------------|---------------|

### Unverified claims (only 1 model found, or all flagged as uncertain)
[numbered list]

---

## Source Quality Notes
[For the strongest evidence above, note: source type, recency, and authority]

---

## What Remains Unresolved
[List specific questions that would require primary research, expert consultation, or newer data to resolve]

---

## Models Consulted
[For each model that contributed: name, confidence in its output (based on source quality), any hallucination flags]
\`\`\`

---

## Step 5: Cleanup & Summary

\`\`\`bash
# Remove temp research files (keep only the final report)
rm -f .factcheck-claude.md .factcheck-gemini.md .factcheck-codex.md
echo "Temp files removed"
echo "Report saved to: FACT_CHECK_[slug].md"
\`\`\`

Tell the user:
- The file name where the report was saved
- The final verdict in one line
- How many models contributed
- Any major contradictions found

---

## Rules

- **Never fabricate sources** — if you cannot cite a real source, say "could not verify"
- **Independence is mandatory** — run each model before reading any other model's output
- **Contradictions are features** — they reveal where knowledge is genuinely uncertain; surface them, don't paper over them
- **Confidence calibration** — a PARTIALLY TRUE verdict with clear evidence is more valuable than a confident FALSE based on weak sources
- **If only Claude is available** — still produce the full report, but note it was single-model and flag all findings as requiring external verification

---

## Context Update (MANDATORY)

After the report is saved, update all three context files:

1. Edit \`.claude.md\` — append to **Session Log** and add any follow-up research goals:
   - Session log format: \`YYYY-MM-DD · /fact-check · [models used] · [claim slug] · [final verdict]\`
2. Sync to the other two files:

\`\`\`bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
\`\`\`
`;

// ── Skill 5: Session checkpoint (/checkpoint) ────────────────────────────────
const SKILL_CHECKPOINT = `# Checkpoint — Session Context Sync

You are closing out a work session. Audit what changed, update every shared context file with accurate current state, and leave the project fully documented so every AI tool picks up exactly where this session ended.

---

## Step 0: Audit the Session

### 0a. Git status — what changed?

\\\`\\\`\\\`bash
git status --short 2>/dev/null || echo "Not a git repo"
git diff --stat HEAD 2>/dev/null
\\\`\\\`\\\`

### 0b. New or untracked files

\\\`\\\`\\\`bash
git ls-files --others --exclude-standard 2>/dev/null
\\\`\\\`\\\`

### 0c. Recent commits this session

\\\`\\\`\\\`bash
git log --oneline --since="12 hours ago" 2>/dev/null || git log --oneline -5
\\\`\\\`\\\`

Internalize: which files changed (git diff stat), new files (untracked), work done (commits + in-session context).

---

## Step 1: Read all current context files

\\\`\\\`\\\`bash
echo "=== .claude.md ===" && cat .claude.md 2>/dev/null || echo "(not found)"
echo "=== .gemini.md ===" && cat .gemini.md 2>/dev/null || echo "(not found)"
echo "=== agents.md ===" && cat agents.md 2>/dev/null || echo "(not found)"
\\\`\\\`\\\`

Note what Session Log, Active Goals, and Project Structure currently say. You will append and patch — never replace or delete existing content.

---

## Step 2: Draft your update (reason before writing)

Before editing any file, plan:

1. **Session log entry** (1 line):
   \`YYYY-MM-DD · /checkpoint · [what was accomplished] · [key files changed or created]\`

2. **Goals to mark [x]**: Review each \`[ ]\` goal. Only mark complete if there is file evidence. When in doubt, leave as \`[ ]\`.

3. **New goals**: Any follow-ups, blockers, or TODOs from the audit?

4. **Project Structure changes**: Files added → add to structure. Files deleted → remove. Files renamed → update.

5. **Tech Stack changes**: New packages in package.json since last context update?

---

## Step 3: Update .claude.md

Edit \`.claude.md\` directly:
- Append session log entry at the bottom of \`## Session Log\`
- Update \`[ ]\` → \`[x]\` for completed goals only
- Add new goals under \`## Active Goals\`
- Update \`## Project Structure\` for file changes
- Update \`## Tech Stack\` if new dependencies were introduced

**Do not rewrite existing content — append and patch only.**

---

## Step 4: Sync to .gemini.md and agents.md

\\\`\\\`\\\`bash
cp .claude.md .gemini.md && echo "Synced → .gemini.md"
cp .claude.md agents.md && echo "Synced → agents.md"
\\\`\\\`\\\`

---

## Step 5: Report to user

- Exact session log line added
- Goals marked [x] complete (list them)
- Goals still open (list them)
- Whether .gemini.md and agents.md were synced
- Any new goals added

---

## Rules

- **Never delete** existing Session Log entries — only append
- **Never fabricate** completed goals — only mark [x] with file evidence
- **Do not commit** — just update context files; the user decides when to commit
- If \`.claude.md\` doesn't exist, create it from the project template before proceeding
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectPath, plan, agentCount } = body;

    // ── Check current status (feature enabled + skills installed) ─────────
    if (action === 'check-status') {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
      let isEnabled = false;
      if (fs.existsSync(settingsPath)) {
        try {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
          isEnabled = !!(settings?.experimental?.agentTeams);
        } catch {}
      }

      const skillMap: Record<string, { filename: string; content: string }> = {
        'claude-only':    { filename: 'build-with-agent-team.md', content: SKILL_CLAUDE_ONLY },
        'hybrid':         { filename: 'build-hybrid-team.md',     content: SKILL_HYBRID },
        'smart-delegate': { filename: 'build-smart-delegate.md',  content: SKILL_SMART_DELEGATE },
        'fact-check':     { filename: 'fact-check.md',            content: SKILL_FACT_CHECK },
        'checkpoint':     { filename: 'checkpoint.md',            content: SKILL_CHECKPOINT },
      };

      const skills: Record<string, 'missing' | 'current' | 'outdated'> = {};
      if (projectPath) {
        const commandsDir = path.join(projectPath, '.claude', 'commands');
        for (const [key, { filename, content }] of Object.entries(skillMap)) {
          const skillPath = path.join(commandsDir, filename);
          if (!fs.existsSync(skillPath)) {
            skills[key] = 'missing';
          } else {
            const installed = fs.readFileSync(skillPath, 'utf8');
            skills[key] = installed === content ? 'current' : 'outdated';
          }
        }
      } else {
        for (const key of Object.keys(skillMap)) skills[key] = 'missing';
      }

      return NextResponse.json({ isEnabled, skills });
    }

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

    // ── Install skill to project (.claude/commands/) ───────────────────────
    if (action === 'install-skill') {
      if (!projectPath) return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });

      const skillName: string = body.skillName || 'claude-only';
      const skillMap: Record<string, { filename: string; content: string }> = {
        'claude-only':    { filename: 'build-with-agent-team.md', content: SKILL_CLAUDE_ONLY },
        'hybrid':         { filename: 'build-hybrid-team.md',     content: SKILL_HYBRID },
        'smart-delegate': { filename: 'build-smart-delegate.md',  content: SKILL_SMART_DELEGATE },
        'fact-check':     { filename: 'fact-check.md',            content: SKILL_FACT_CHECK },
        'checkpoint':     { filename: 'checkpoint.md',             content: SKILL_CHECKPOINT },
      };

      const skill = skillMap[skillName];
      if (!skill) return NextResponse.json({ error: `Unknown skill: ${skillName}` }, { status: 400 });

      const commandsDir = path.join(projectPath, '.claude', 'commands');
      fs.mkdirSync(commandsDir, { recursive: true });
      const skillPath = path.join(commandsDir, skill.filename);
      fs.writeFileSync(skillPath, skill.content);

      return NextResponse.json({ success: true, path: skillPath, filename: skill.filename });
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
