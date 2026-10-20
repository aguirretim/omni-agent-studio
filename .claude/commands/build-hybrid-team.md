# Build Hybrid Agent Team

You are a lead orchestrator agent. You have two classes of workers at your disposal:
1. **Claude sub-agents** — spawned in tmux panes, full agentic capability (read/write files, run commands, reason)
2. **Specialist CLI tools** — run as bash subprocesses (Gemini for large-context analysis, OpenCode/Codex for bounded generation tasks)

Your task: $ARGUMENTS

## Step 0: Load Context (always run first, before anything else)

Read the project's short map (`AGENTS.md`: where things are, routing, rules), the open goals and the latest log lines. `AGENTS.md` is usually loaded automatically; skip the first `cat` if it is already in your context:

```bash
cat AGENTS.md 2>/dev/null || cat .claude.md 2>/dev/null || echo "NO_CONTEXT_FILE"   # short map; skip if already in your context
cat _agent-tasks/ACTIVE_GOALS.md 2>/dev/null
tail -15 _agent-tasks/SESSION_LOG.md 2>/dev/null   # never read the whole log; grep it for this topic
```

From this file, extract and internalize before proceeding:
- **Project identity** — name, domain, goal, audience, constraints
- **Tech stack** — language, framework, tools, package manager (do not re-detect what's already known)
- **Where things are / Routing** — which folders hold what, and which file to read for which job (skip re-exploring the codebase)
- **Recent log** (`_agent-tasks/SESSION_LOG.md`) — what was done before; grep it for this topic and do not repeat finished work
- **Open goals** (`_agent-tasks/ACTIVE_GOALS.md`) — what is planned or in progress; use this to inform task decomposition and tool assignment
- **Working Rules** — constraints that apply to this session (style, permissions, environment)

If no context file exists, note the absence and proceed without it. (Older projects keep everything in `.claude.md`; the `cat` above falls back to it.)

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
1. AGENTS.md — the short project map and rules (skip if already in your context; never read _agent-tasks/SESSION_LOG.md whole)
2. AGENT_TASKS.md — full task list, contract chain, and your specific assignment

Do not explore the codebase beyond what is necessary for your assigned scope.
AGENTS.md and AGENT_TASKS.md contain what you need.

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

When all phases are complete, follow the **Logging** section of `AGENTS.md`:

1. Append ONE line (≤300 chars) to the END of `_agent-tasks/SESSION_LOG.md` (create the file if missing):
   - Format: `YYYY-MM-DD · /build-hybrid-team · [what was built] · [which tools handled which phases] · [key decisions]`
   - Details belong in the project's notes or docs, not in the log line.
2. Update `_agent-tasks/ACTIVE_GOALS.md` if goals opened or closed.
3. Only if a RULE changed (a new standing rule or a lesson worth keeping): edit `AGENTS.md` (keep it under ~150 lines), then copy it to the other tools' files:

```bash
cp AGENTS.md .claude.md && cp AGENTS.md .gemini.md && echo "Synced AGENTS.md → .claude.md + .gemini.md"
```

Never copy `.claude.md` onto `AGENTS.md`, and never append history to `AGENTS.md`: it is the source and stays a short map.
