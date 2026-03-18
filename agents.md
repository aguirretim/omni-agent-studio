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
.gemini-task-output.md    — Artifact from Gemini-leads strategy runs (safe to delete between sessions)
.claude/settings.local.json — Claude Code permissions (Bash(*) wildcard, tool allow-lists)
.claude/commands/
  build-with-agent-team.md  — /build-with-agent-team skill
  build-hybrid-team.md      — /build-hybrid-team skill
  build-smart-delegate.md   — /build-smart-delegate skill
  fact-check.md             — /fact-check skill
  checkpoint.md             — /checkpoint skill

app/
  layout.tsx              — Root layout, delegates to AppShell (server component)
  page.tsx                — Home: workspace selector + welcome state / quick action cards
  globals.css             — Design tokens + base styles (do not change)
  context/page.tsx        — Shared Context editor (auto-save debounce, auto-template on first load)
  tools/page.tsx          — AI Tools launcher (4 ToolCard components)
  agents/page.tsx         — Agent Teams page (AgentTeams component only)
  sessions/page.tsx       — Git session manager (save/commit workspace state)
  api/
    analyze/route.ts      — Tech stack + folder structure detection
    agent-teams/route.ts  — Agent Teams: enable, install-skill (supports skillName: claude-only|hybrid|smart-delegate|fact-check|checkpoint), check-status, launch-terminal, WSL/tmux setup
    commit/route.ts       — Git add + commit for sessions page
    context/route.ts      — Read + sync shared context files
    fs/route.ts           — Directory browser for FolderBrowser modal
    ghost/route.ts        — UNUSED (GhostAgent UI removed; route still exists)
    terminal/route.ts     — Spawn interactive terminal windows for AI tools

components/
  AppShell.tsx            — Sidebar nav + header + WorkspaceProvider wrapper (client)
  WorkspaceProvider.tsx   — Global context: projectPath, recentPaths, syncStatus
  WorkspaceSelector.tsx   — Workspace path input + folder browser + recents dropdown
  StatusToast.tsx         — Animated status pill in header
  ToolCard.tsx            — Individual AI tool launch card (Claude, Gemini, OpenCode, Codex)
  GhostAgent.tsx          — UNUSED (removed from agents page; file still on disk)
  FolderBrowser.tsx       — Full-screen directory browser modal
  HowToUse.tsx            — How to use modal (accessible via ? in header)
  AgentTeams.tsx          — Agent Teams panel: Launch / Split-Pane Setup / How It Works tabs; 3 skill install buttons (claude-only, hybrid, smart-delegate)

scripts/
  setup.ts                — Pre-dev/build setup script (unchanged)

.claude/commands/
  build-with-agent-team.md  — /build skill: Claude-only agent team with Step 0 context load
  build-hybrid-team.md      — /build-hybrid skill: Claude leads + Gemini analysis + OpenCode/Codex generation
  build-smart-delegate.md   — /build-smart-delegate skill: probes all tools, auto-routes task to best strategy
  fact-check.md             — /fact-check skill: multi-model independent research + cross-verification + report saved to FACT_CHECK_[slug].md
  checkpoint.md             — /checkpoint skill: audits git changes, updates .claude.md session log + goals, syncs to .gemini.md and agents.md
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

## Self-Update Protocol (MANDATORY — no exceptions)
After completing ANY task — without being asked — edit this file before ending your response:
1. Mark the completed goal with [x]
2. Append one line to **Session Log**: `YYYY-MM-DD · [task completed] · [key decision or output]`
3. Add any new goals, blockers, or follow-ups to **Active Goals**
4. Update **Project Structure** if files were added, removed, or repurposed

This keeps every AI tool that opens this folder fully in sync with the current state of the work.
No reminder needed — this is automatic, like saving a file.

## Tool Auth State (current machine)
- **Gemini**: authenticated via Google OAuth — `~/.gemini/oauth_creds.json` present. No API key needed.
- **Codex**: authenticated — `~/.codex/auth.json` + `config.toml` (model: gpt-5.4). No API key needed.
- **OpenCode**: NOT configured — `~/.config/opencode/auth.json` is empty, no `config.toml`. Needs `OPENAI_API_KEY` or provider config.

## Active Goals
- [ ] Clean up — delete unused `components/GhostAgent.tsx` and `app/api/ghost/route.ts` (no UI calls them)
- [ ] Delete `.gemini-task-output.md` artifact (safe to remove between sessions; regenerated each run)
- [ ] Delete `out.txt` — raw terminal artifact from OpenCode probe (ANSI escape codes, not useful)
- [ ] Verify the app compiles and runs correctly after all session changes
- [ ] Consider adding a "Reset to template" option in the context editor for when users want a fresh start
- [ ] Commit all unstaged changes (6 modified files + 8 untracked files, including .claude.md, .gemini.md, agents.md, and all 5 skill files)

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
