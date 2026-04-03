# Agent Team Tasks
Status: IN PROGRESS
Date: 2026-04-03
Task: Max out beginner friendliness — UI/UX, docs, run file, onboarding

## Selected Skills
- `/ux-heuristic-review` — Verify UI improvements pass Nielsen heuristics after implementation
- `/doc-generate` — Ensure documentation is complete and beginner-friendly
- `/ralph` — Autonomous goal iteration for any remaining improvements after initial pass
- `/review-pr` — Final quality gate before commit
- `/commit` — Smart commit message after all phases complete

## Agents
- [ ] launcher-agent: Make run.bat + run.ps1 fully self-contained; auto-install Claude Code CLI; friendly progress display; clear error messages
- [ ] ui-agent: Improve all UI components for maximum beginner friendliness (tooltips, help text, onboarding, simpler language)
- [ ] docs-agent: Rewrite README.md as a complete beginner guide; improve HowToUse modal content
- [ ] ralph-agent: Set up Ralph autonomous loop with goals for remaining polish work

## Contract Chain
launcher-agent → produces: run.ps1 (updated, self-contained with Claude Code install)
  (parallel with ui-agent + docs-agent)
ui-agent → produces: multiple UI component files with beginner improvements
docs-agent → produces: README.md (beginner rewrite) + HowToUse.tsx (simplified content)
  ↓
ralph-agent → consumes: all above, produces: .claude.md with new Active Goals for Ralph loop

## Task List

### Phase 1 — Sequential (launcher must finish first as foundation)
- [ ] [launcher-agent] Improve run.bat + run.ps1 with Claude Code auto-install → CONTRACT: run.ps1

### Phase 2 — Parallel (after Phase 1)
- [ ] [ui-agent] Improve all UI for beginner friendliness → CONTRACT: app/page.tsx, components/layout/AppShell.tsx, app/context/page.tsx, app/tools/page.tsx
- [ ] [docs-agent] Rewrite README.md + simplify HowToUse modal → CONTRACT: README.md, components/layout/HowToUse.tsx

### Phase 3 — Integration
- [ ] [ralph-agent] Run Ralph autonomous loop + final review + commit → CONTRACT: .claude.md updated

---

## Beginner Friendliness Goals

### Launcher (run.ps1 / run.bat)
- Auto-install Claude Code CLI after Node.js + Git installed
- Show clear progress with friendly messages and estimated times
- Add "Setup complete! Here's what to do next:" message on first run
- Better error messages with exact URLs and instructions
- Show "Already installed - skipping" for fast subsequent runs

### UI Improvements
- AppShell sidebar: add short descriptions under nav items
- Home page: improve welcome section clarity, better visual hierarchy
- Shared Context page: add info banner explaining what shared context is
- Tools page: simplify technical descriptions for beginners
- HowToUse modal: remove jargon, use plain English throughout
- Add title tooltips to ALL icon-only buttons
- Improve empty states with clear "Do this now" actions

### Documentation (README.md)
- Open with plain-English "What is this?" paragraph
- Step-by-step setup with expected outputs at each step
- "What you'll see when it works" section
- Comprehensive FAQ for common beginner issues
- Explain what a workspace is

---

## Working Rules (from .claude.md)
- No new npm packages
- API routes in app/api/ are FROZEN
- Tailwind v4 only (no config file)
- Every page must have 'use client' at top
- Keep zinc/slate dark-mode design system
- Windows-first
