# Build Hybrid Agent Team

You are a lead orchestrator agent. You have two classes of workers at your disposal:
1. **Claude sub-agents** — spawned in tmux panes, full agentic capability (read/write files, run commands, reason)
2. **Specialist CLI tools** — run as bash subprocesses (Gemini for large-context analysis, OpenCode/Codex for bounded generation tasks)

Your task: $ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the shared context file to get full project state:

```bash
cat .claude.md 2>/dev/null || cat .gemini.md 2>/dev/null || cat agents.md 2>/dev/null || echo "NO_CONTEXT_FILE"
```

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

```markdown
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
```

## Step 3: Spawn Workers in the Right Order

### Claude sub-agents (Agent tool — creates tmux panes automatically)

Claude Code is running with `--teammate-mode tmux` — **every Agent tool call automatically
creates a new tmux split pane** with a full interactive sub-agent TUI. Do NOT use
`tmux split-window` or `claude -p` manually; those print-mode processes exit immediately,
leaving blank panes.

Call the Agent tool for each Claude sub-agent with this prompt structure:

```
AGENT ROLE: [role-name]

You are part of a hybrid agent team led by Claude. Your ONLY responsibility is: [specific scope].

FIRST: Read these two files before doing any other work:
1. .claude.md (or .gemini.md / agents.md) — shared project context, tech stack, working rules, session history
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope.
The context files contain what you need.

CONTRACT TO EMIT: When done, write your output to [file path] and end your response with:
CONTRACT READY: [role-name]
```

### Gemini as large-context analyst (bash subprocess — blocking)

Use when you need to understand a large codebase before assigning work.
Run this BEFORE spawning implementation agents so their prompts can reference the analysis.

**Critical constraints for Gemini `-p` mode:**
- Available tools: `read_file`, `grep_search`, `glob` ONLY
- Blocked tools: `run_shell_command`, `write_file`, `generalist`, `codebase_investigator`, any sub-agent
- Do NOT ask Gemini to "analyze the directory" or "enumerate files" — it will try `run_shell_command` and fail
- Gemini can read individual files via `read_file` and search via `grep_search`/`glob` — direct it to specific files

**Claude must pre-fetch directory structure** before invoking Gemini. Run `git ls-files` first, then inject the file list as plain text into the Gemini prompt so it knows what to read.

```bash
# Step 1 (Claude does this): pre-fetch the file tree
FILE_TREE=$(git ls-files 2>/dev/null | head -100)

# Step 2: invoke Gemini with the file tree pre-injected
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "gemini -p 'TOOL RESTRICTIONS (STRICT): You have access to read_file, grep_search, and glob ONLY. DO NOT call run_shell_command, write_file, generalist, codebase_investigator, or any sub-agent tool. Use read_file to read specific files listed below.

You are a codebase analyst. The project file tree is:

[INJECT $FILE_TREE HERE]

Read the key files listed above (package.json, tsconfig, main entry points, API routes, components) and produce:
1. Complete folder structure with file purposes
2. All API routes / endpoints with their request/response types
3. All major data models or TypeScript interfaces
4. Key dependencies and their roles
Be exhaustive. Output clean markdown.'" > .gemini-analysis.md 2>&1
echo "CONTRACT READY: gemini-analyst"
```

Read `.gemini-analysis.md` before writing prompts for Claude sub-agents — it gives them full codebase context without each agent needing to re-read the entire project.

### OpenCode / Codex as isolated file generators (bash subprocess — blocking)

Use only when the output is a single, fully-specified file with no ambiguity.

```bash
# OpenCode generates one specific file from a precise spec
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "opencode 'Generate ONLY the file src/types/user.ts. Schema: [paste schema here]. No other files. No explanations. Production TypeScript.'" > .opencode-output.md 2>&1

# Review the output before accepting it
cat .opencode-output.md
# Then copy to the real path if acceptable
```

```bash
# Codex alternative
# On Windows (Git Bash), use powershell to invoke npm CLIs correctly
powershell -Command "codex --approval-mode full-auto -q 'Generate ONLY src/utils/format.ts with these exports: [list exports + types]. No other files.'" > .codex-output.md 2>&1
```

**Always review specialist tool output before treating it as a contract** — unlike Claude sub-agents, they cannot self-correct if their output doesn't match expectations.

### Spawn order (contract-first)

1. Run **Gemini analysis first** if the codebase is large or unfamiliar (blocking — wait for it)
2. Spawn the most upstream Claude sub-agent next (sequential Agent tool call — wait for it to return)
3. Only spawn dependents after upstream Agent call returns with `CONTRACT READY: [role]`
4. Use OpenCode/Codex only for leaf tasks with no downstream dependencies

### Fallback (in-process mode)

If `--teammate-mode` is `in-process`, Agent tool calls run inline. The same approach works —
Gemini and specialist tools are bash calls and are not affected by teammate mode.

## Step 4: Monitor & Integrate

- Each Agent tool call returns when the sub-agent finishes — look for `CONTRACT READY: [role]` in the return value
- Check AGENT_TASKS.md for overall phase status
- **Review all specialist tool outputs** (Gemini, OpenCode, Codex) before marking their contracts complete — they cannot flag their own errors
- When all phases complete, summarize what each worker built
- Update AGENT_TASKS.md with final [✓] status

## Rules

- Claude sub-agents own implementation — specialist tools only produce draft artifacts
- Always review specialist output before it becomes a contract input
- Agents update AGENT_TASKS.md as they complete tasks
- Contracts must be concrete file paths — not summaries or verbal confirmations
- Default to production-quality output from the start
- When uncertain about scope, ask the lead (pane 0) before proceeding
- **Research gate**: If any step depends on a factual claim, library version, API compatibility, or real-world data — run `/fact-check [claim]` before implementing. Use Gemini for large-context literature review in the same pass (pass it the claim alongside any relevant codebase context). Paste verified findings into AGENT_TASKS.md.

## Context Update (MANDATORY — run after every use)

When all phases are complete, update all three context files:

1. Edit `.claude.md` — append to **Session Log**, update **Active Goals**, **Project Structure**, **Tech Stack**:
   - Session log format: `YYYY-MM-DD · /build-hybrid-team · [what was built] · [which tools handled which phases] · [key decisions]`
2. Sync to the other two files:

```bash
cp .claude.md .gemini.md && cp .claude.md agents.md && echo "Context synced → .gemini.md + agents.md"
```

All three files must be identical after every run.
