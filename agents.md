# Shared AI Context

## What This Project Is
- **Name**: OmniAgent Studio
- **Domain**: Software
- **Goal**: A local Next.js dashboard that lets developers coordinate multiple AI coding tools (Claude Code, Gemini CLI, OpenCode, OpenAI Codex) from one interface using a shared context file.
- **Audience**: Developers who want to run multiple AI coding agents simultaneously without losing context between sessions or tools.
- **Constraints**: Windows-first (cmd.exe, WSL for tmux split-panes). No new dependencies — only what's already in package.json. All API routes in `app/api/` are frozen — do not modify them unless explicitly asked. Tailwind CSS v4 (no config file, `@import "tailwindcss"` only). Every page must be `'use client'`.

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS v4 + framer-motion (animations) + lucide-react (icons)
- **Database/ORM**: None
- **Package Manager**: npm

## Project Structure
```
.claude.md                — Shared AI context file (this file) — synced to .gemini.md + agents.md after every session
.gemini.md                — Gemini-flavored copy of .claude.md (identical content, kept in sync via cp)
agents.md                 — Generic agent copy of .claude.md (identical content, kept in sync via cp)
AGENT_TASKS.md            — Task tracker: records which tool handled each phase per /build-* run
.claude/settings.local.json — Claude Code permissions (dangerouslySkipPermissions: true + Bash(*) wildcard)
.claude/commands/
  build-with-agent-team.md  — /build-with-agent-team skill
  build-hybrid-team.md      — /build-hybrid-team skill
  build-smart-delegate.md   — /build-smart-delegate skill
  fact-check.md             — /fact-check skill
  checkpoint.md             — /checkpoint skill
  ralph.md                  — /ralph skill (autonomous loop: read prd.json → implement → commit → update → repeat)
  create-prd.md             — /create-prd skill (generate PRD + prd.json from task description)
  convert-prd.md            — /convert-prd skill (convert markdown PRD to prd.json)
  ux-heuristic-review.md    — /ux-heuristic-review skill (Nielsen 10 heuristics, 4-severity)
  wcag-audit.md             — /wcag-audit skill (WCAG 2.1 AA criterion-level)
  design-critique.md        — /design-critique skill (5-dimension: hierarchy/interaction/consistency/accessibility/brand)
  peer-review.md            — /peer-review skill (6-dimension editorial review)
  literature-review.md      — /literature-review skill (PRISMA-inspired, ≥10 sources)
  research-synthesis.md     — /research-synthesis skill (user-provided sources, consensus/contradiction analysis)

app/
  layout.tsx              — Root layout, delegates to AppShell
  page.tsx                — Home: workspace selector + welcome state / quick action cards
  globals.css             — Design tokens + base styles (do not change)
  context/page.tsx        — Shared Context editor (auto-save debounce, auto-template on first load)
  tools/page.tsx          — AI Tools launcher (4 ToolCard components)
  agents/page.tsx         — Agent Teams page (AgentTeams component only)
  sessions/page.tsx       — Git session manager (save/commit workspace state)
  ralph/page.tsx          — Ralph autonomous loop dashboard: Goals tab (Active Goals from shared context), Progress tab, How It Works
  api/
    usage/route.ts        — GET ?projectPath=: reads ~/.claude/projects/{hash}/*.jsonl, aggregates token+cost by session; returns todayCost, totalCost, sessions[]
    folder-dialog/route.ts — Spawns PowerShell FolderBrowserDialog; returns selected path (or null if cancelled)
    analyze/route.ts      — Tech stack + folder structure detection
    agent-teams/route.ts  — Agent Teams: enable, install-skill, check-status, launch-terminal, WSL/tmux setup; 19 skills registered
    commit/route.ts       — Git add + commit for sessions page
    context/route.ts      — Read + sync shared context files
    fs/route.ts           — Directory browser for FolderBrowser modal
    terminal/route.ts     — Spawn interactive terminal windows for AI tools
    ralph/route.ts        — Ralph file I/O: read-progress, parse-goals (reads Active Goals from shared context)

components/
  layout/
    AppShell.tsx          — Sidebar nav + header + WorkspaceProvider wrapper
    WorkspaceProvider.tsx — Global context: projectPath, recentPaths, syncStatus
    WorkspaceSelector.tsx — Workspace path input + native folder picker + recents dropdown (name+parent layout)
    FolderBrowser.tsx     — Full-screen directory browser modal
    HowToUse.tsx          — How to use modal (accessible via ? in header)
  ui/
    StatusToast.tsx       — Animated status pill in header
    ToolCard.tsx          — Individual AI tool launch card (Claude, Gemini, OpenCode, Codex)
  features/
    AgentTeams.tsx        — Agent Teams panel: Launch / Split-Pane Setup / How It Works / Preview tabs
    SplitPanePreview.tsx  — Animated 2x2 terminal mosaic (4 agent panes), used in Preview tab

reset.bat                 — One-click Claude Code reset: deletes %USERPROFILE%\.claude config, reinstalls CLI, guides re-login

scripts/
  setup.ts                — Pre-dev/build setup script (checks + installs AI CLIs on first boot)

public/                   — Static assets (favicon only; default scaffold SVGs removed)

Runtime artifacts (gitignored — generated per session, never committed):
  .omni-worktrees.md      — Written by agent-teams route when worktree mode active; lists agent→worktree assignments
  .worktrees/             — Git worktrees created per agent (shared .git DB, isolated working dirs)
  .agent-team-launch.ps1  — Written by agent-teams route for PowerShell-tier launch
  .agent-team-launch.sh   — Written by agent-teams route for tmux/WSL-tier launch
  AGENT_TASKS.md          — Written by /build-* skills, tracks per-session agent work
  .gemini-task-output.md  — Written by /build-smart-delegate when Gemini-leads strategy runs
  .gemini-analysis.md     — Written by /build-hybrid-team when Gemini does codebase analysis
  .factcheck-*.md         — Temp research files written by /fact-check (deleted after report)
  FACT_CHECK_*.md         — Final fact-check reports written by /fact-check
```

## Your Role
You are a world-class expert who adapts completely to the domain of this project.
- **Software**: Write production-grade code. No placeholders. Optimize for correctness and clarity.
- **Writing**: Produce sharp, direct prose that matches the defined audience and tone. No filler.
- **Research**: Synthesize accurately. Surface conflicting evidence. Cite sources.
- **Business / Strategy**: Think in tradeoffs, stakeholders, and measurable outcomes.
- **Any domain**: Skip preamble. Lead with the actual work, not a description of it.

## Epistemic Standards (always apply, every domain)
**Accuracy over speed.** If something cannot be verified, say "I don't know" or "I can't verify that." Never fabricate — not even plausible-sounding details.

**RAG-first.** Before any recommendation or time-sensitive claim: retrieve from authoritative, preferably primary sources and cite them. Prefer peer-reviewed research, official documentation, and well-established references over pattern-matching or heuristics. If retrieval isn't possible, say so explicitly and give the most conservative, least-speculative answer available.

**Flag uncertainty explicitly.** State confidence level or describe what's unknown. Separate facts from interpretations — label each clearly, never blend them.

**Structured reasoning.** For any non-trivial claim: show reasoning step by step, define key terms, surface assumptions, check edge cases. If sources disagree, present both sides with citations and explain what evidence would resolve the disagreement.

**Recommendations must earn their place.** Include the criteria used, the tradeoffs considered, and why this option wins vs. alternatives — grounded in retrieved evidence. Generic advice is not acceptable. Outputs must be actionable and bounded.

**Efficiency.** Don't waste words. Lead with the answer. Optimize for correctness, not persuasion.

## Working Rules
1. Never delete, overwrite, or publish anything without explicit permission.
2. Never produce placeholder content — finish what you start.
3. When uncertain, ask one specific clarifying question rather than guessing.
4. All commands use npm and Windows cmd.exe syntax.
5. Do not modify files in `app/api/` unless explicitly instructed.
6. Keep the dark-mode zinc/slate design system consistent — do not introduce new color schemes.

## Lessons Log
<!-- After any correction, append one line: YYYY-MM-DD | what went wrong | rule to follow next time -->
<!-- Read this section at the start of every session and apply every rule before touching any code. -->

## Self-Update Protocol (MANDATORY — no exceptions)
At the START of every session: read **Lessons Log** and apply every rule before touching any code.

After completing ANY task — without being asked — edit this file before ending your response:
1. Mark the completed goal with [x]
2. Append one line to **Session Log**: `YYYY-MM-DD · [task completed] · [key decision or output]`
3. Add any new goals, blockers, or follow-ups to **Active Goals**
4. Update **Project Structure** if files were added, removed, or repurposed
5. After any correction from the user, add an entry to **Lessons Log**: `YYYY-MM-DD | what went wrong | rule to follow next time`

This keeps every AI tool that opens this folder fully in sync with the current state of the work.
No reminder needed — this is automatic, like saving a file.
# Shared AI Context

## What This Project Is
- **Name**: OmniAgent Studio
- **Domain**: Software
- **Goal**: A local Next.js dashboard that lets developers coordinate multiple AI coding tools (Claude Code, Gemini CLI, OpenCode, OpenAI Codex) from one interface using a shared context file.
- **Audience**: Developers who want to run multiple AI coding agents simultaneously without losing context between sessions or tools.
- **Constraints**: Windows-first (cmd.exe, WSL for tmux split-panes). No new dependencies — only what's already in package.json. All API routes in `app/api/` are frozen — do not modify them unless explicitly asked. Tailwind CSS v4 (no config file, `@import "tailwindcss"` only). Every page must be `'use client'`.

## Tech Stack
- **Language**: TypeScript
- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS v4 + framer-motion (animations) + lucide-react (icons)
- **Database/ORM**: None
- **Package Manager**: npm

## Project Structure
```
.claude.md                — Shared AI context file (this file) — synced to .gemini.md + agents.md after every session
.gemini.md                — Gemini-flavored copy of .claude.md (identical content, kept in sync via cp)
agents.md                 — Generic agent copy of .claude.md (identical content, kept in sync via cp)
AGENT_TASKS.md            — Task tracker: records which tool handled each phase per /build-* run
.claude/settings.local.json — Claude Code permissions (dangerouslySkipPermissions: true + Bash(*) wildcard)
.claude/commands/
  build-with-agent-team.md  — /build-with-agent-team skill
  build-hybrid-team.md      — /build-hybrid-team skill
  build-smart-delegate.md   — /build-smart-delegate skill
  fact-check.md             — /fact-check skill
  checkpoint.md             — /checkpoint skill
  ralph.md                  — /ralph skill (autonomous loop: read prd.json → implement → commit → update → repeat)
  create-prd.md             — /create-prd skill (generate PRD + prd.json from task description)
  convert-prd.md            — /convert-prd skill (convert markdown PRD to prd.json)
  ux-heuristic-review.md    — /ux-heuristic-review skill (Nielsen 10 heuristics, 4-severity)
  wcag-audit.md             — /wcag-audit skill (WCAG 2.1 AA criterion-level)
  design-critique.md        — /design-critique skill (5-dimension: hierarchy/interaction/consistency/accessibility/brand)
  peer-review.md            — /peer-review skill (6-dimension editorial review)
  literature-review.md      — /literature-review skill (PRISMA-inspired, ≥10 sources)
  research-synthesis.md     — /research-synthesis skill (user-provided sources, consensus/contradiction analysis)

app/
  layout.tsx              — Root layout, delegates to AppShell
  page.tsx                — Home: workspace selector + welcome state / quick action cards
  globals.css             — Design tokens + base styles (do not change)
  context/page.tsx        — Shared Context editor (auto-save debounce, auto-template on first load)
  tools/page.tsx          — AI Tools launcher (4 ToolCard components)
  agents/page.tsx         — Agent Teams page (AgentTeams component only)
  sessions/page.tsx       — Git session manager (save/commit workspace state)
  ralph/page.tsx          — Ralph autonomous loop dashboard: Goals tab (Active Goals from shared context), Progress tab, How It Works
  api/
    usage/route.ts        — GET ?projectPath=: reads ~/.claude/projects/{hash}/*.jsonl, aggregates token+cost by session; returns todayCost, totalCost, sessions[]
    folder-dialog/route.ts — Spawns PowerShell FolderBrowserDialog; returns selected path (or null if cancelled)
    analyze/route.ts      — Tech stack + folder structure detection
    agent-teams/route.ts  — Agent Teams: enable, install-skill, check-status, launch-terminal, WSL/tmux setup; 19 skills registered
    commit/route.ts       — Git add + commit for sessions page
    context/route.ts      — Read + sync shared context files
    fs/route.ts           — Directory browser for FolderBrowser modal
    terminal/route.ts     — Spawn interactive terminal windows for AI tools
    ralph/route.ts        — Ralph file I/O: read-progress, parse-goals (reads Active Goals from shared context)

components/
  layout/
    AppShell.tsx          — Sidebar nav + header + WorkspaceProvider wrapper
    WorkspaceProvider.tsx — Global context: projectPath, recentPaths, syncStatus
    WorkspaceSelector.tsx — Workspace path input + native folder picker + recents dropdown (name+parent layout)
    FolderBrowser.tsx     — Full-screen directory browser modal
    HowToUse.tsx          — How to use modal (accessible via ? in header)
  ui/
    StatusToast.tsx       — Animated status pill in header
    ToolCard.tsx          — Individual AI tool launch card (Claude, Gemini, OpenCode, Codex)
  features/
    AgentTeams.tsx        — Agent Teams panel: Launch / Split-Pane Setup / How It Works / Preview tabs
    SplitPanePreview.tsx  — Animated 2x2 terminal mosaic (4 agent panes), used in Preview tab

reset.bat                 — One-click Claude Code reset: deletes %USERPROFILE%\.claude config, reinstalls CLI, guides re-login

scripts/
  setup.ts                — Pre-dev/build setup script (checks + installs AI CLIs on first boot)

public/                   — Static assets (favicon only; default scaffold SVGs removed)

Runtime artifacts (gitignored — generated per session, never committed):
  .omni-worktrees.md      — Written by agent-teams route when worktree mode active; lists agent→worktree assignments
  .worktrees/             — Git worktrees created per agent (shared .git DB, isolated working dirs)
  .agent-team-launch.ps1  — Written by agent-teams route for PowerShell-tier launch
  .agent-team-launch.sh   — Written by agent-teams route for tmux/WSL-tier launch
  AGENT_TASKS.md          — Written by /build-* skills, tracks per-session agent work
  .gemini-task-output.md  — Written by /build-smart-delegate when Gemini-leads strategy runs
  .gemini-analysis.md     — Written by /build-hybrid-team when Gemini does codebase analysis
  .factcheck-*.md         — Temp research files written by /fact-check (deleted after report)
  FACT_CHECK_*.md         — Final fact-check reports written by /fact-check
```

## Your Role
You are a world-class expert who adapts completely to the domain of this project.
- **Software**: Write production-grade code. No placeholders. Optimize for correctness and clarity.
- **Writing**: Produce sharp, direct prose that matches the defined audience and tone. No filler.
- **Research**: Synthesize accurately. Surface conflicting evidence. Cite sources.
- **Business / Strategy**: Think in tradeoffs, stakeholders, and measurable outcomes.
- **Any domain**: Skip preamble. Lead with the actual work, not a description of it.

## Epistemic Standards (always apply, every domain)
**Accuracy over speed.** If something cannot be verified, say "I don't know" or "I can't verify that." Never fabricate — not even plausible-sounding details.

**RAG-first.** Before any recommendation or time-sensitive claim: retrieve from authoritative, preferably primary sources and cite them. Prefer peer-reviewed research, official documentation, and well-established references over pattern-matching or heuristics. If retrieval isn't possible, say so explicitly and give the most conservative, least-speculative answer available.

**Flag uncertainty explicitly.** State confidence level or describe what's unknown. Separate facts from interpretations — label each clearly, never blend them.

**Structured reasoning.** For any non-trivial claim: show reasoning step by step, define key terms, surface assumptions, check edge cases. If sources disagree, present both sides with citations and explain what evidence would resolve the disagreement.

**Recommendations must earn their place.** Include the criteria used, the tradeoffs considered, and why this option wins vs. alternatives — grounded in retrieved evidence. Generic advice is not acceptable. Outputs must be actionable and bounded.

**Efficiency.** Don't waste words. Lead with the answer. Optimize for correctness, not persuasion.

## Working Rules
1. Never delete, overwrite, or publish anything without explicit permission.
2. Never produce placeholder content — finish what you start.
3. When uncertain, ask one specific clarifying question rather than guessing.
4. All commands use npm and Windows cmd.exe syntax.
5. Do not modify files in `app/api/` unless explicitly instructed.
6. Keep the dark-mode zinc/slate design system consistent — do not introduce new color schemes.

## Lessons Log
<!-- After any correction, append one line: YYYY-MM-DD | what went wrong | rule to follow next time -->
<!-- Read this section at the start of every session and apply every rule before touching any code. -->

## Self-Update Protocol (MANDATORY — no exceptions)
At the START of every session: read **Lessons Log** and apply every rule before touching any code.

After completing ANY task — without being asked — edit this file before ending your response:
1. Mark the completed goal with [x]
2. Append one line to **Session Log**: `YYYY-MM-DD · [task completed] · [key decision or output]`
3. Add any new goals, blockers, or follow-ups to **Active Goals**
4. Update **Project Structure** if files were added, removed, or repurposed
5. After any correction from the user, add an entry to **Lessons Log**: `YYYY-MM-DD | what went wrong | rule to follow next time`

This keeps every AI tool that opens this folder fully in sync with the current state of the work.
No reminder needed — this is automatic, like saving a file.

## Tool Auth State (current machine)
- **Gemini**: authenticated via Google OAuth — `~/.gemini/oauth_creds.json` present. No API key needed.
- **Codex**: authenticated — `~/.codex/auth.json` + `config.toml` (model: gpt-5.4). No API key needed.
- **OpenCode**: NOT configured — `~/.config/opencode/auth.json` is empty, no `config.toml`. Needs `OPENAI_API_KEY` or provider config.

## Active Goals
- [x] Fix terminal and agent teams launch failing because explorer.exe opens .bat files in text editors
- [x] Light mode polish: FolderBrowser.tsx macOS chrome is still dark — add a light-mode override for its toolbar/header (keep file rows dark is fine as a terminal feel)
- [x] Light mode polish: add `color-scheme: dark` to SplitPanePreview wrapper so browser renders scrollbars correctly for its dark terminal look even in light mode
- [x] Light mode polish: WorkspaceSelector recents dropdown needs light bg override (currently uses zinc-800 bg-zinc-800/90 backdrop which looks odd in light)
- [x] Verify run.ps1 beginner flow works: .first-run-done logic, Claude Code install step, "SETUP COMPLETE" banner
- [x] Add keyboard shortcut hints to AgentTeams Launch tab (e.g., Ctrl+Enter to submit plan)
- [x] Consider adding a "Beginner Mode" toggle that shows extra help text throughout the app — dismissed: dismissible banners + nav descriptions already serve this purpose; a separate toggle adds complexity without value
- [x] Add a "What's next?" prompt on the Ralph page when no goals are set yet
- [x] Add aria-describedby to all dismissible info banners (context page + tools page) linking to their text
- [x] Clean up — delete unused `components/GhostAgent.tsx` and `app/api/ghost/route.ts` (no UI calls them)
- [x] Delete `.gemini-task-output.md` artifact (safe to remove between sessions; regenerated each run)
- [x] Delete `out.txt` — raw terminal artifact from OpenCode probe (ANSI escape codes, not useful)
- [x] Verify the app compiles and runs correctly after all session changes
- [x] Consider adding a "Reset to template" option in the context editor for when users want a fresh start
- [x] Commit all unstaged changes (6 modified files + 8 untracked files, including .claude.md, .gemini.md, agents.md, and all 5 skill files)
- [x] Fix shell injection class — replace exec(string) with spawn(cmd, args[], {shell:false}) in commit, terminal, agent-teams routes (C1–C4)
- [x] Validate projectPath against os.homedir() boundary in all API routes (S-H2, S-H4)
- [x] Enable strict: true in tsconfig.json (Q-H1) — 0 TypeScript errors
- [x] Fix sessions/page.tsx error icon — failed commit now shows XCircle (H12)
- [x] Fix AnimatePresence exit pattern in FolderBrowser + HowToUse (C6, C-NEW2)
- [x] Add ARIA dialog semantics to FolderBrowser + HowToUse modals (C5, C-NEW1)
- [x] Add focus trap + backdrop click-to-close to both modals (H7/H8, H-NEW3/H-NEW4)
- [x] Add role="status"/aria-live to StatusToast (H11) and ARIA to AgentTeams tab widget (H10)
- [x] Fix blank tmux split panes preview — loop no longer resets to blank frame
- [x] Add CSRF Origin check on all mutating API routes (S-H3)
- [x] Validate agentCount as positive integer 1-10 (S-H1)
- [x] wslProject single-quote escaping in bash heredoc (S-M3)
- [x] 1MB content size limit in context/route.ts sync action (S-M4)
- [x] WorkspaceSelector key prop fix + aria-labels for icon-only buttons (Q-L3, L-NEW7)
- [x] AgentTeams collapse button aria-expanded + aria-controls (H9)
- [x] Remove stale Headless mode docs from HowToUse (H13) — confirmed removed
- [x] Add 5 new skills (commit, review-pr, debug, test-gen, explain) + install-all action + merge install buttons into one
- [x] Fix remaining medium/low items from Round 3 REVIEW_REPORT.md (Q-M2/M3, Q-L1/L2, etc.)
- [x] Implement Ralph autonomous loop: /ralph, /create-prd, /convert-prd skills + Ralph page + app/api/ralph/route.ts
- [x] Simplify Ralph to use shared context Active Goals — no prd.json, no PRD workflow required
- [x] Auto-select best skills in /build-with-agent-team: Phase 0.5 taxonomy, plan textarea in Launch tab, live suggested-skills panel

## Session Log
- 2026-03-18 · Initial redesign — decomposed 617-line page.tsx into routed pages + components per DESIGN_SPEC.md
- 2026-03-18 · Removed GhostAgent / Quick Task (Headless) from Agents page · Feature not viable on Windows; CLI tools don't support headless piped output reliably
- 2026-03-18 · Renamed "Agents" → "Agent Teams" across sidebar, page heading, home quick actions, HowToUse modal
- 2026-03-18 · Fixed AgentTeams pro tip — removed stale "Ghost Agents" reference
- 2026-03-18 · Added debounced auto-save (2s) to context editor with save state indicator
- 2026-03-18 · Rewrote context template — universal (works for any domain), added Epistemic Standards section, Session Log with date format
- 2026-03-18 · Template now auto-generates on first workspace load; removed Template button from toolbar
- 2026-03-18 · Upgraded /build-with-agent-team skill to hybrid model — Claude leads, Gemini handles large-context analysis, OpenCode/Codex handle isolated file generation · Updated AgentTeams UI mode hints and How It Works step 5
- 2026-03-18 · Added 3-skill system: /build (claude-only), /build-hybrid, /smart-delegate · agent-teams route now writes the correct skill file based on skillName param
- 2026-03-18 · AgentTeams.tsx: replaced single install button with 3 per-skill buttons; state tracking changed to Record<string,boolean>; mode hints updated for hybrid capabilities
- 2026-03-18 · context/page.tsx fully rewritten: debounced auto-save (2s), SaveState indicator, Template button removed (auto-generates on first workspace load via buildTemplate())
- 2026-03-18 · /smart-delegate skill created — probes Claude/Gemini/OpenCode/Codex capacity, builds capability matrix, auto-selects strategy (Claude-only / Hybrid / Gemini-leads / Specialist-led / Pause)
- 2026-03-18 · /build-smart-delegate — renamed from smart-delegate.md to build-smart-delegate.md so all 3 skills share the /build-* prefix · Updated route.ts, AgentTeams.tsx label, and skill file internals
- 2026-03-18 · /build-smart-delegate probe fixes — corrected auth detection for all tools (OAuth files vs API key env vars), added Windows platform detection to skip broken Git Bash responsive test, added Troubleshooting section and per-tool auth setup docs
- 2026-03-18 · Confirmed tool auth state: Gemini=oauth (google_accounts.json+oauth_creds.json), Codex=auth_file (auth.json+config.toml gpt-5.4), OpenCode=NO_AUTH (auth.json empty, no config.toml)
- 2026-03-18 · settings.local.json: replaced 30+ specific Bash rules with Bash(*) wildcard — no more per-command permission prompts
- 2026-03-18 · OpenCode: confirmed native binary works at node_modules/opencode-windows-x64/bin/opencode.exe; credentials stored at ~/.local/share/opencode/auth.json (not ~/.config/); setup requires PowerShell: opencode providers login
- 2026-03-18 · /build-smart-delegate · Claude-only phased (LIMITED/Gemini-shell-error/NO_KEY/READY) · Inverted routing matrix in SKILL_SMART_DELEGATE: Gemini-leads is now DEFAULT when READY, Specialist-led second, Claude-only last resort; added cost-first mandate to rules and description
- 2026-03-18 · /build-smart-delegate · Claude-only (FULL/Gemini-ERROR/NO_KEY/Codex-ERROR, SMALL) · Context audit: all sections verified current; 5 modified + 7 untracked files still uncommitted; GhostAgent cleanup pending; tool auth unchanged
- 2026-03-18 · /build-with-agent-team · Claude-only (FULL/Gemini-ERROR/NO_KEY/Codex-ERROR, MEDIUM) · Fixed Windows Git Bash npm wrapper issue in all 4 skills: replaced bare gemini/codex/opencode calls with `powershell -Command "..."` · Fixed auth detection: Gemini now checks oauth_creds.json (not config.json), Codex checks auth.json (not OPENAI_API_KEY), OpenCode checks ~/.local/share/opencode/auth.json · Probes now return GEMINI=READY, CODEX=READY, OPENCODE=NO_KEY (correct) · Files: route.ts + build-smart-delegate.md + build-hybrid-team.md + fact-check.md
- 2026-03-18 · /build-smart-delegate · Gemini-leads (FULL/READY/NO_KEY/READY, SMALL) · Synced .gemini.md + agents.md with .claude.md — both were 18 session log entries behind; Tool Auth State section added to both
- 2026-03-18 · Fixed Gemini-leads strategy in all 4 skills + route.ts: Gemini -p mode is read-only; changed from "write files directly" to structured =FILE= output blocks that Claude extracts and writes · Fixed context sync: all 4 skill Context Update sections now run `cp .claude.md .gemini.md && cp .claude.md agents.md` to keep all three flavors identical
- 2026-03-18 · /build-smart-delegate · Gemini-leads (FULL/READY/NO_KEY/READY, SMALL) · Context audit via Gemini: Project Structure updated to include .claude.md, .gemini.md, agents.md, AGENT_TASKS.md, .gemini-task-output.md, .claude/settings.local.json, and all 5 skill files; active goal added to delete .gemini-task-output.md artifact; commit count updated to 6 modified + 8 untracked
- 2026-03-18 · /build-with-agent-team · Claude-only (FULL/READY/NO_KEY/READY, SMALL) · Fixed Gemini [LocalAgentExecutor] errors in build-smart-delegate.md, build-hybrid-team.md, and route.ts SKILL_HYBRID + SKILL_SMART_DELEGATE constants: added TOOL RESTRICTIONS header to all Gemini -p prompts blocking run_shell_command/generalist/codebase_investigator; added pre-fetch pattern for shell data injection; removed "Read .gemini.md first" / "Analyze the project at the current directory" implicit shell triggers
- 2026-03-18 · /checkpoint · Session close · 6 modified + 8 untracked files uncommitted; Gemini tool-restriction fix complete; out.txt artifact discovered; all skills functional; context synced
- 2026-03-18 · All goals completed · Deleted GhostAgent/ghost route; added Reset to Template button (context/page.tsx); build verified clean; committed 16 files (11cb1e8)
- 2026-03-18 · /build-with-agent-team · Claude-only (FULL, SMALL) · Added run.bat (double-click launcher: checks Node.js, installs deps, starts app, opens browser) and README.txt (plain-English setup guide covering Node.js, AI tool installs, troubleshooting)
- 2026-03-18 · /build-with-agent-team · Claude-only (FULL, SMALL) · Rewrote launcher: run.bat now calls run.ps1 which auto-installs Node.js (winget first, MSI fallback), refreshes PATH in-session, opens browser after delay; README.txt updated to remove "install Node first" requirement
- 2026-03-21 · /build-with-agent-team · Folder structure cleanup + permissions config · Reorganized components/ into layout/, ui/, features/ subdirs; moved DESIGN_SPEC.md → docs/; deleted test scripts, unused public SVGs, run-omniagent.bat; consolidated README.txt into README.md; set dangerouslySkipPermissions: true in settings.local.json; build verified clean
- 2026-03-21 · Fix: WSL no-distro state · Added install-distro action to agent-teams route (wsl --install -d Ubuntu via elevated UAC); replaced static Store message in AgentTeams.tsx with an "Install Ubuntu" button
- 2026-03-21 · Final cleanup · Deleted jsconfig.json (redundant with tsconfig.json @/* alias); deleted tsconfig.tsbuildinfo (generated cache); added *.zip to .gitignore · Build verified clean · Project structure fully optimized
- 2026-03-21 · WSL distro auto-detection · After "Install Ubuntu" click: polls check-wsl every 8s (up to 30 attempts); shows spinner instead of button while polling; stops when distroInstalled=true; setup tab now re-checks on every open; step 2 shows first-launch hint for Ubuntu account setup
- 2026-03-21 · Fix launch-terminal window not opening · Root cause: nested double-quotes in cmd.exe /K arg broke shell parsing · Fix: Tier 3 (no tmux) now writes .agent-team-launch.bat and launches that instead of inline commands; added exec error callbacks for server-side logging
- 2026-03-21 · Fix window opens then closes · Root cause: cmd.exe can't run claude (npm .ps1/.cmd) due to PATH inheritance gap from Node.js spawn · Fix: Tier 3 now writes .agent-team-launch.ps1 and launches via PowerShell -NoExit -ExecutionPolicy Bypass; PATH rebuilt from User+Machine env vars at session start; wt.exe uses -- separator for modern Windows Terminal · Also: check-wsl now detects needsRestart (WSL_OPTIONAL_COMPONENT_REQUIRED error); UI shows restart banner when reboot needed
- 2026-03-21 · Fix launch-terminal not opening Claude CLI · Root cause: tmux path (Tier 1/2) ran `claude` inside WSL but the npm shim needs `node` which isn't installed in WSL; detection check used `&&` which cmd.exe split before bash saw it · Fix: added `wsl -e node --version` gate (hasClaudeInWsl); when false, falls to Tier 3 (PowerShell); also changed tmux script to use `claude.exe`, replaced em dashes with ASCII hyphens in exec/start commands · Also fixed run.ps1 em dash corruption (same encoding issue)
- 2026-03-21 · /build-with-agent-team · All skills run dangerously · build-with-agent-team.md + build-hybrid-team.md fallback sections updated to specify mode: "bypassPermissions" for Agent tool spawning; tmux paths already had --dangerously-skip-permissions; settings.local.json already had dangerouslySkipPermissions: true globally
- 2026-03-21 · /build-with-agent-team · Folder cleanup pass 3 · Deleted docs/ (stale DESIGN_SPEC.md); added 9 runtime artifact patterns to .gitignore (.agent-team-launch.ps1/sh, AGENT_TASKS.md, .gemini-task-output.md, .gemini-analysis.md, .factcheck-*.md, FACT_CHECK_*.md); updated Project Structure in .claude.md with Runtime artifacts section
- 2026-03-21 · Launch tab dep check · check-wsl now returns claudeInWsl field (node inside WSL gate, mirrors launch-terminal logic); AgentTeams.tsx runs checkWsl on mount; Launch tab shows live mode badge: "Split-pane (tmux)" or "Single-window (PowerShell)" with link to Setup tab
- 2026-03-21 · Split-pane view test · Bug fix: allReady badge now also requires claudeInWsl (was showing "SPLIT-PANE READY" header while launch tab showed single-window mode); added Setup Step 3 with node-in-WSL install command (curl nodesource) · Machine state: wsl+distro+tmux installed, claudeInWsl=false
- 2026-03-21 · Fix launch-terminal tmux path · Root cause: tmux script called `claude.exe` but npm global is `claude` (shell shim, no .exe); also cmd.exe inline quoting broke on OneDrive paths with spaces · Fix: changed tmux script to `claude`, added .bat wrapper for reliable path handling, added error callbacks to all exec calls · Machine state: wsl+distro+tmux+node all installed, claudeInWsl=true, tmux path now active and verified working
- 2026-03-21 · Split-pane always + right-click fix · Per official docs: added `teammateMode: "tmux"` to settings.json (Enable action) + `--teammate-mode tmux` CLI flag in tmux launch script; added `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to settings.json (docs-recommended approach); Tier 3 (PS) now passes `--teammate-mode in-process` · Right-click fix: conhost path now explicitly sets `tmux set-option -g mouse off` so right-click paste/context menu works; QuickEdit registry key already set in .bat wrapper
- 2026-03-21 · /build-with-agent-team · Split-pane test · All checks passed: wslAvailable=true, distroInstalled=true, tmuxInstalled=true, claudeInWsl=true; tmux session creation + split-window + layout all verified working
- 2026-03-21 · Fix tmux mouse scroll · Added `tmux set-option -g mouse on` to .agent-team-launch.sh script in route.ts — tmux terminal was not scrollable without it
- 2026-03-21 · /build-with-agent-team · Split-pane preview · Added Preview tab to AgentTeams with SplitPanePreview component — 2x2 animated terminal mosaic, 4 agents (frontend/backend/testing/context), lines scroll in at 800ms, blinking cursor, staggered framer-motion entrance, "Launch Agent Team" button wired to real launch · Built by real tmux-spawned agent team (ui-builder + integrator panes)
- 2026-03-21 · Fix right-click in bat launch window · Root cause: tmux mouse on intercepted right-click in legacy conhost.exe; fix: made mouse on conditional on hasWindowsTerminal; added reg QuickEdit=1 to .bat for legacy console path
- 2026-03-21 · /build-hybrid-team · Full codebase code review · Gemini: architecture + security surface analysis; 3 Claude sub-agents (security, code-quality, ux) ran in parallel tmux panes · 7 Critical, 13 High, 15 Medium, 17 Low findings across security/quality/UX · Output: REVIEW_REPORT.md (prioritized fix roadmap in 4 tiers)
- 2026-03-21 · /build-with-agent-team · Round 2 codebase review · 3 parallel tmux agents (security, quality, ux); 0 Round 1 findings resolved; 2 new High findings (UAC CSRF H3; focus trap/backdrop H7/H8); 3 Critical reclassified from UX (dialog ARIA C5, exit animation C6, mobile sidebar C7) · REVIEW_REPORT.md updated: 7C 11H 15M 17L
- 2026-03-21 · Fix blank tmux panes + conhost rendering · Root cause: conhost.exe default codepage (437) can't render Claude's Unicode TUI; also missing UTF-8 locale in WSL bash · Fix: .bat now sets `chcp 65001`, `mode con cols=200 lines=50`, Consolas font via registry; .sh sets `LANG=C.UTF-8`; added stale session cleanup; per docs: `--teammate-mode tmux` flag + `teammateMode: "tmux"` in settings.json + `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json
- 2026-03-21 · Switch default launch to PowerShell (in-process mode) · Conhost+tmux is fundamentally broken on Windows (blank panes, no right-click, no scroll); tmux path now ONLY used when Windows Terminal is installed (proper Unicode + mouse); default Tier 2 launches PowerShell with `claude --teammate-mode in-process` (teammates inline, Shift+Down to cycle); updated UI: mode badge, setup tab text, flash messages; settings.json `teammateMode` set to `auto`
- 2026-03-21 · Installed Windows Terminal via winget · `wt.exe` now detected; launch hits Tier 1 (wt-tmux); Claude opens in Windows Terminal with tmux split panes, mouse on, full Unicode rendering; right-click + scroll work natively; UI mode badge now dynamic (detects WT+tmux vs PS fallback)
- 2026-03-21 · /build-with-agent-team · Round 3 code review · 3 parallel tmux agents; 0 Round 2 findings resolved; +1C (FolderBrowser ARIA), +4H (FolderBrowser focus/backdrop, strict:false, agentCount injection), +2M (agent count ARIA, skill color-only), +2L (icon aria-labels) · REVIEW_REPORT.md updated: 8C 15H 17M 19L
- 2026-03-21 · Fix blank split pane preview · Root cause: cycling loop reset visibleLines to [] for 800ms each cycle; fix: loop starts at index 1, never resets to blank — instant first-line show after delay
- 2026-03-21 · /build-with-agent-team · Fix critical review findings · 3 parallel agents (api-security, modal-correctness, component-quality) · Security: C1-C4 shell injection → spawn(args[],{shell:false}); S-H1 agentCount int validation; S-H2/H4 path boundary os.homedir(); S-H3 CSRF Origin header; S-M3 wslProject quote-escape; S-M4 1MB content limit · Correctness: C6/C-NEW2 AnimatePresence exit; H12 wrong icon; H13 stale docs · ARIA: C5/C-NEW1 dialog semantics; H7/H8/H-NEW3/H-NEW4 focus trap+backdrop; H9 aria-expanded; H10 tab widget+arrow keys; H11 aria-live; Q-L3 key prop; L-NEW7 aria-labels · tsconfig strict:true — 0 TS errors
- 2026-03-21 · Fix blank split panes (real agents) · Root cause: skill files used `tmux split-window "claude -p '...'"` — print mode exits immediately, pane closes/stays blank · Fix: replaced manual tmux split-window with Agent tool in both skill files + SKILL_* constants in route.ts; `--teammate-mode tmux` intercepts Agent calls and creates persistent interactive TUI panes automatically
- 2026-03-22 · /build-with-agent-team · Skills research + UI merge · Added 5 new curated skills (commit, review-pr, debug, test-gen, explain) to route.ts; added install-all-skills API action; merged 5 separate install buttons into one "Install All Skills" button showing N/10 progress; 0 TS errors
- 2026-03-22 · /build-with-agent-team · GitHub skill packs · Fetched real skill content from wshobson/commands (14 skills), iannuttall/claude-sessions (5 skills), alirezarezvani/claude-skills (4 skills); added SKILL_PACKS registry + list-packs + install-pack API actions; added Skill Library tab to AgentTeams with pack cards (name, stars, repo link, skill chips, Install Pack button); 0 TS errors
- 2026-03-22 · /build-with-agent-team · Tier 4 polish + medium/low review fixes · Q-M2: handleLoadContext→useCallback, useEffect now tracks projectPath changes; Q-M3: removed duplicate setTimeout in flash(); M9: aria-label on context textarea; M10: aria-label+(opens in new tab) on ToolCard links; M11: aria-hidden on SplitPanePreview mosaic; M12: removed duplicate sentence in sessions/page; M14/Q-L8: 70vh inline style→Tailwind h-[70dvh] min-h-[300px]; M15: hardcoded heights→Tailwind in SplitPanePreview; M-NEW5: role=group+aria-labelledby on agent count selector; Q-L2: removed unused id/bgColor from ToolCard; Q-L4: catch(err)→catch in FolderBrowser; Q-L5: IIFE→InstallSkillsButton fn; Q-L6: fetchDirectory→useCallback+listed in deps; Q-L7: moduleResolution node→bundler; Q-L9: composite key in SplitPanePreview; L16: h-[80vh]→max-h-[80dvh] in HowToUse · 0 TS errors
- 2026-03-22 · /build-with-agent-team · Skill integration into build skills · Updated build-with-agent-team.md, build-hybrid-team.md, build-smart-delegate.md with full Skill Toolkit tables (core 5 curated + 14 community pack skills); added /explain pre-read gate, /debug error gate, mandatory Phase 4 quality gate (/test-gen + /review-pr), Phase 5 /commit; agent prompt template now includes ERROR HANDLING block; note: route.ts SKILL_* constants not updated (api/ frozen) — re-installing skills via UI would overwrite with old versions
- 2026-03-22 · /build-with-agent-team · Added 6 skills to website install · Registered SKILL_UX_HEURISTIC, SKILL_WCAG_AUDIT, SKILL_DESIGN_CRITIQUE, SKILL_PEER_REVIEW, SKILL_LITERATURE_REVIEW, SKILL_RESEARCH_SYNTHESIS in route.ts; updated all 3 skill maps (check-status, install-skill, install-all-skills); TOTAL_SKILLS 10→16 in AgentTeams.tsx; 0 TS errors
- 2026-03-22 · /build-with-agent-team · UI/UX + research skills · Created 6 new skills: /ux-heuristic-review (Nielsen 10 heuristics, 4-severity), /wcag-audit (WCAG 2.1 AA criterion-level), /design-critique (5-dimension: hierarchy/interaction/consistency/accessibility/brand), /peer-review (6-dimension editorial review, major/minor findings), /literature-review (PRISMA-inspired, ≥10 sources, 3 database minimum), /research-synthesis (user-provided sources, consensus/contradiction/gap analysis) · Added UI/UX + research tables to all 3 build skill toolkit sections
- 2026-03-24 · /build-with-agent-team · Added Lessons Log section to template context + app context · Lessons Log: correction log with date|what went wrong|rule format; Self-Update Protocol updated to mandate reading Lessons Log at session start and writing to it after corrections; synced to .gemini.md + agents.md
- 2026-03-25 · /build-with-agent-team · Native folder picker + richer recents · New app/api/folder-dialog/route.ts spawns PowerShell FolderBrowserDialog (fallback to FolderBrowser if PS unavailable); WorkspaceSelector folder icon now calls native OS dialog; recents dropdown shows folder name prominently + parent path below it in monospace zinc-500; dropdown widened to w-80; 0 TS errors
- 2026-03-31 · Tmux file reference F5 keybinding · --dangerously-skip-permissions restored to tmux command (settings.local.json approach was broken); F5 keybinding added to tmux session: opens Windows OpenFileDialog, converts path to WSL format via wslpath, pastes @"wsl/path" into Claude input; F5 hint shown in Launch tab when split-pane mode active · 0 TS errors
- 2026-03-31 · --dangerously-skip-permissions added to all Claude launches · terminal/route.ts bat file, agent-teams Tier 1 tmux, Tier 2 PS1 all updated; launch-headless already had it · 0 TS errors
- 2026-03-31 · /build-with-agent-team · Ralph simplified to use shared context · /ralph skill rewritten: reads Active Goals from .claude.md, marks [x] on completion, syncs .gemini.md+agents.md, no prd.json needed · parse-goals action added to ralph/route.ts · Ralph page rewritten: Goals tab (live Active Goals list, progress bar, "Up next" highlight), Progress tab, How It Works; PRD/Archive tabs removed · 0 TS errors
- 2026-03-31 · /build-with-agent-team · Skill auto-selection · Added Phase 0.5 taxonomy section to build-with-agent-team.md + SKILL_CLAUDE_ONLY; 13-category keyword→skill map; quality gates (/review-pr + /commit) always included for code tasks; Launch tab gains plan textarea + live orange skill chips that update as user types · 0 TS errors
- 2026-03-31 · /build-with-agent-team · Ralph autonomous loop integration · Source: https://github.com/snarktank/ralph (14.1k stars) · Added /ralph skill (one-story-per-iteration loop with <promise>COMPLETE</promise> signal), /create-prd (PRD generator), /convert-prd (markdown→prd.json) · New app/ralph/page.tsx: PRD editor/table, progress viewer, archive browser, How It Works tab · New app/api/ralph/route.ts: read-prd, write-prd, read-progress, read-archive actions with CSRF+path-boundary security · AppShell nav: added "Ralph" between Agent Teams and Sessions · Skills registered in agent-teams/route.ts; TOTAL_SKILLS 16→19 in AgentTeams.tsx · 0 TS errors
- 2026-04-01 · /build-with-agent-team · Terminal type selector · Added terminal picker to Launch tab (Auto / Split-pane tmux / Windows Terminal / PowerShell); AgentTeams.tsx sends terminalType in launch request; route.ts validates + applies override to skip capability detection and force the chosen tier · 0 TS errors
- 2026-04-02 · /build-with-agent-team · Audio notifications · Added Stop hook to .claude/settings.local.json (PowerShell two-tone beep when Claude finishes); created components/ui/useAudioNotification.ts (Web Audio API synthesized chime, no deps); wired into AgentTeams.tsx (launch success) + context/page.tsx (manual save) · 0 TS errors
- 2026-04-03 · /ralph · Light mode polish complete · FolderBrowser: scoped CSS classes (folder-browser-dialog/titlebar/toolbar/breadcrumb/sidebar/footer) + [data-theme="light"] overrides in globals.css (file list stays dark); SplitPanePreview: colorScheme: dark style prop on terminal mosaic; WorkspaceSelector recents: already used CSS vars (goal pre-resolved) · 0 TS errors
- 2026-04-03 · /build-with-agent-team · OS-style folder picker · FolderBrowser: single-click highlights + selects folder (blue tint, border-l indicator), double-click navigates in, footer + Select button use selectedPath; navigating resets selection · 0 TS errors
- 2026-04-03 · /build-with-agent-team · Home page beginner UX · No-workspace: welcome hero card + 3-step cards with icon badges + accordion FAQ (3 Qs); Workspace connected: green connected banner with folder name, "Suggested next step" primary CTA → AI Instructions, plain-English action card descriptions with sublabel badges · 0 TS errors
- 2026-04-03 · Fix audio notifications (both systems silent) · Stop hook: replaced SystemSounds::Beep.Play() with [console]::Beep(880,200)+[console]::Beep(1320,280) — drives hardware directly, no sound scheme needed · Web Audio API: chime() made async, added ctx.resume() guard before playTone calls — browser suspends AudioContext after await fetch gaps
- 2026-04-03 · Improve workspace breadcrumb clarity · AppShell.tsx header now shows folder name prominently (font-semibold zinc-200) + parent path in dim monospace beside it + FolderOpen icon; full path shown as title tooltip; 'No workspace connected' italic when empty
- 2026-04-03 · Audio toggle + quality fix · useAudioNotification.ts: exported isAudioEnabled()/setAudioEnabled() helpers (localStorage key omni-audio-enabled); chime() checks preference before playing; switched wave to triangle, all-exponential envelope (no linearRamp click), shorter notes (0.10s/0.14s vs 0.18s/0.28s), tighter gap (0.07s vs 0.12s), lower gain (0.14/0.11) · AppShell.tsx: Volume2/VolumeX toggle button in header, aria-pressed, persists preference
- 2026-04-03 · Fix Stop hook audio quality · Root cause: [console]::Beep() generates a square wave through the audio driver (harsh/buzzy) · Fix: wrote .claude/chime.ps1 — generates sine wave PCM in memory via MemoryStream+BinaryWriter, plays via SoundPlayer.PlaySync(); hook now calls -File .claude\chime.ps1
- 2026-04-03 · Fix chime.ps1 distorted audio (round 1) · Root cause: BinaryWriter.Write([int16]) resolves to Write(Int32) in PowerShell (4 bytes not 2), corrupting WAV fmt chunk offsets → wrong sample rate interpreted → distortion · Fix: replaced BinaryWriter with explicit Write-LE16/Write-LE32 helpers using bitwise ops on a raw byte array; WAV assembled via CopyTo into pre-allocated byte[44+dataLen]
- 2026-04-03 · Fix chime.ps1 distorted audio (round 2, definitive) · Root cause: gap = SR×2×50/1000 = 2205 bytes (ODD) → tone2 starts at odd byte offset → every tone2 sample is byte-swapped (LSB/MSB reversed) → severe distortion; "beep" = tone1 fine, "distortion" = tone2 scrambled · Fix: gap = [int](SR×50/1000)×2 = 1102×2 = 2204 bytes (even); added assertion guard that throws if any segment is odd-byte
- 2026-04-03 · chime.ps1 encoding fix · Non-ASCII chars (em dash, multiplication signs, arrows) in comments caused PowerShell parser error; rewrote entire file as pure ASCII
- 2026-04-03 · Volume control · chime.ps1 amplitude 10000→2000 (~6% of max, -24dB); useAudioNotification.ts: added getAudioVolume/setAudioVolume (localStorage omni-audio-volume, default 40%); chime() scales peak gain by volume pref; AppShell.tsx: volume slider (w-16 range input) appears beside speaker icon when unmuted, title shows current %; preference persists across sessions
- 2026-04-03 · Fix volume slider not affecting Stop hook · Root cause: localStorage is browser-only, chime.ps1 is a separate PowerShell process with no access to it · Fix: new app/api/audio/route.ts writes volume (0-100) to .claude/audio-volume.txt on slider change; chime.ps1 reads the file at runtime and scales amplitude (max 5000, default 40% = 2000); AppShell handleVolumeChange fires fetch to /api/audio (fire-and-forget)
- 2026-04-03 · /build-with-agent-team · OpenClaude integration · Added OpenClaude (@gitlawb/openclaude) as 5th tool card (purple, 'OC' icon) in app/tools/page.tsx; added 'openclaude' to terminal/route.ts whitelist + install map; added launch-openclaude action to agent-teams/route.ts (provider selection: openai/gemini/deepseek/ollama/github, sets env vars, writes .omni-openclaude-launch.ps1); added Multi-LLM section to AgentTeams.tsx Launch tab with provider picker + launch button · 0 TS errors
- 2026-04-03 · /ralph · Ctrl+Enter shortcut on AgentTeams plan textarea; Ralph empty-state 3-step guide; aria-describedby on context + tools banners · AgentTeams.tsx, ralph/page.tsx, context/page.tsx, tools/page.tsx
- 2026-04-03 · /build-with-agent-team · Install All Packs button in Skill Library tab · AgentTeams.tsx: added isInstallingAllPacks + installAllPacksProgress state, handleInstallAllPacks fn (loops pending packs sequentially via install-pack API), Install All Packs button with progress counter X/Y and All Installed checkmark state · 0 TS errors
- 2026-04-03 · /build-with-agent-team · Light mode · 3-agent team (foundation, pages, components) · globals.css: CSS variables --c-bg/surface/inset/border/deep/stripe/hover + [data-theme="light"] block + zinc utility overrides · AppShell: Sun/Moon toggle, localStorage persistence, data-theme on <html> · 17 hex bg replacements across pages, 30+ across components · SplitPanePreview stays dark (terminal simulator) · FolderBrowser macOS chrome stays authentic · 0 TS errors
- 2026-04-03 · /build-with-agent-team · Beginner friendliness overhaul · 3-agent team (launcher, ui, docs) · run.ps1: Claude Code auto-install [3/5], first-run-done tracking, SETUP COMPLETE banner, friendly error messages with URLs, step counters [1/5]-[5/5] · AppShell: nav items get descriptions ("Start here", "Tell AI about your project", etc.) · Home page: "Let's get you set up" headline, concrete step descriptions, workspace helper text · Context page: dismissible info banner explaining what AI Instructions are · Tools page: dismissible beginner tip for first-time users · README.md: complete plain-English rewrite with FAQ · HowToUse modal: removed all jargon, "Got it let's go!" close button · 0 TS errors
- 2026-04-03 · Fix file drag-drop in all terminal windows · Root cause: spawning any terminal (CMD, WT, mintty) directly from Node.js/WSL gives it wrong process lineage — Windows blocks drag-drop unless process chain goes through Explorer · Fix pattern: write a .bat launcher, open via explorer.exe so spawned window inherits Explorer lineage · terminal/route.ts: CMD+PS modes fixed · agent-teams/route.ts: Tier 2 no-WT fixed; Tier 1+2 WT fixed by launching via UWP App ID (shell:AppsFolder\Microsoft.WindowsTerminal_8wekyb3d8bbwe!App) in a bat opened via explorer.exe; OpenClaude WT+fallback fixed same way · Added .omni-wt-launch.bat/.omni-openclaude-launch.bat to .gitignore
- 2026-04-03 · /build-with-agent-team · Reset script + troubleshooting · Root cause: user ran CMD syntax (rmdir /s /q) in PowerShell to delete %USERPROFILE%\.claude — PowerShell aliases rmdir to Remove-Item so /q is rejected · Fix: created reset.bat (one-click cleanup: deletes .claude config, reinstalls Claude Code, guides re-login); added Troubleshooting section to HowToUse.tsx (3 cards: reset instructions, missing tool, app won't start) with warning against manual rmdir in PowerShell · 0 TS errors
- 2026-04-03 · /build-with-agent-team · Skill documentation overhaul · Rewrote AgentTeams.tsx "How It Works" tab: 4 sections (Getting Started, The 3 Build Skills, Other Useful Skills, How Agents Stay in Sync); each /build skill gets its own card with color-coded border, "Best for" / "How it works" / "Requires" / "Example" fields; 7 other skills documented in 2-col grid; pro tip recommends /build-with-agent-team as default · 0 TS errors
- 2026-04-03 · /build-with-agent-team · Rate-limit resilience + session cost tracking · Added to all 4 skill files (build-with-agent-team, build-hybrid-team, build-smart-delegate, ralph): "Rate-Limit Resilience" section (auto-retry 3x with 30s wait, resume from AGENT_TASKS.md checkpoint, stagger spawning, context budget check, adaptive routing for smart-delegate); "Session Cost Report" section (mandatory end-of-session cost estimate using API pricing, written to AGENT_TASKS.md + appended to session log); session log format updated to include `cost ~$X.XX`; smart-delegate also shows savings vs Claude-only
- 2026-04-05 · /build-with-agent-team · git pull · Pulled 3 commits from origin/master (fast-forward): b6bbb47 fix(audio) track chime hook in repo; b01970a feat add reset script + troubleshooting guide + skill docs; 87b75cb docs session log update · Local changes stashed + restored cleanly
- 2026-04-05 · fix: Windows Terminal no longer opening in Auto mode · Root cause 1: Node.js server process doesn't have %LOCALAPPDATA%\Microsoft\WindowsApps in PATH, so `where wt` fails → hasWindowsTerminal stays false → falls through to cmd fallback · Root cause 2: `start "" "shell:AppsFolder\..."` doesn't pass CLI arguments to Windows Terminal (shell: URIs drop args) · Fix: added LOCALAPPDATA path fallback check in both launch-terminal and launch-openclaude actions; replaced shell:AppsFolder bat command with `start "" "%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe" ...` across all 3 WT launch sites in agent-teams/route.ts · 0 TS errors
- 2026-04-06 · feat: git worktree auto-isolation + session cost panel · Worktrees: when agentCount > 1, agent-teams/route.ts pre-creates N git branches (.worktrees/agent-N, branch omni/session/ts-N) before Claude starts, writes .omni-worktrees.md with assignments, injects "Worktrees active — see .omni-worktrees.md" prefix into build command; works in both WSL-tmux and PS1 paths; AgentTeams.tsx shows worktree mode hint in launch tab · Cost panel: new app/api/usage/route.ts reads ~/.claude/projects/{hash}/*.jsonl, aggregates token counts by sessionId+model, calculates cost using 2026 Claude pricing (sonnet-4-6: $3/$15 input/output MTok); sessions/page.tsx extended with Usage card showing today's cost, all-time total, token breakdown, per-session table · 0 TS errors
- 2026-04-06 · /build-with-agent-team · Ollama tool card + auto model pull · Added Ollama (teal) as 6th tool card in app/tools/page.tsx; whitelisted in terminal/route.ts with winget install fallback; launch script (bat + ps1) checks `ollama list` and auto-pulls qwen2.5-coder:7b if no models installed, then starts `ollama serve`; batScriptOverride/psScriptOverride maps enable per-tool custom launch sequences without touching shared template · 0 TS errors
- 2026-04-06 · fix: OpenClaude /provider TUI broken on Windows · Root cause: /provider TUI doesn't accept Enter key in Windows terminals; OPENAI_MODEL was hardcoded to 'llama3' (wrong model) · Fix: agent-teams/route.ts ollama provider now runs `ollama list` at launch time to detect first installed model (falls back to qwen2.5-coder:7b); launch message updated to show detected model+URL and tell user /provider is not needed (env vars already configure the provider)
- 2026-04-06 · fix: openclaude Gemini auth (1 patch to @gitlawb/openclaude/dist/cli.mjs) · createAPIClient: Gemini was not included in the OpenAI shim condition, falling through to Anthropic SDK → added `|| isEnvTruthy(process.env.CLAUDE_CODE_USE_GEMINI)` to the shim check · Root cause of remaining 401: Gemini OpenAI-compat endpoint only accepts API keys (AIzaSy...), not OAuth tokens (ya29...) — they are different auth paths · .openclaude-profile.json: restored GEMINI_API_KEY; OAuth approach reverted (incompatible with OpenAI-compat endpoint)
- 2026-04-06 · fix: Ollama terminal closes after half a second · Root cause: ollama serve exits immediately when port 11434 is already bound (Ollama runs as a Windows background service after install) · Fix: bat+ps1 now check curl http://localhost:11434 before calling ollama serve; if already running, show message + pause; add pause after exit so terminal never silently closes
- 2026-04-28 · /fix · Fix terminal and agent teams launch failing because explorer.exe opens .bat files in text editors instead of executing them · Replaced all explorer.exe spawn calls in terminal/route.ts and agent-teams/route.ts with PowerShell Start-Process calls to bypass .bat associations while preserving Explorer process lineage · cost ~$0.00
