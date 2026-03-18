# Agent Team Tasks
Status: COMPLETE

## Mission
Redesign and simplify OmniAgent Studio — a Next.js dashboard that lets users launch and coordinate
multiple AI coding tools (Claude Code, Gemini CLI, OpenAI Codex, OpenCode) with a shared context file.

## Agents
- [ ] [ux-architect]: Analyze current app, produce detailed design spec + component plan
- [ ] [frontend-builder]: Rebuild layout.tsx, page.tsx and all components from spec
- [ ] [component-specialist]: Rebuild individual components (FolderBrowser, HowToUse, AgentTeams, ToolCard)

## Contract Chain
[ux-architect] → produces: DESIGN_SPEC.md (layout, naming, component breakdown)
  ↓
[frontend-builder] → consumes: DESIGN_SPEC.md, produces: app/layout.tsx, app/page.tsx
[component-specialist] → consumes: DESIGN_SPEC.md, produces: components/*.tsx
  ↓
Both merged → complete redesigned app

## Current Problems to Fix
1. page.tsx is 617 lines — needs decomposing
2. Sidebar nav buttons are decorative (non-functional)
3. Confusing terminology:
   - "OmniContext Root" → "Shared AI Context"
   - "Ghost Agents (Headless Tooling)" → "Quick Task (Headless)"
   - "Active Nodes" → "AI Tools"
   - "Commit Node Stage" → "Commit Changes"
   - "Terminal Hub" → "Terminal Launch"
4. No onboarding / welcome state for new users
5. "How To Use" buried behind tiny ? icon — should be prominent on empty state
6. Dense layout with poor visual hierarchy
7. Agent Teams section collapsed and buried

## Design Goals
- Anyone unfamiliar with AI tools should immediately understand what this app does
- Clear step-by-step flow: Connect Workspace → Set Context → Launch Tools → Run Agents
- Keep the dark mode aesthetic (it's great)
- Add empty/welcome state when no workspace is connected
- Make AI Tools launch buttons prominent and clearly labeled
- Keep ALL existing functionality (just simplify labels and layout)

## Task List

### Phase 1 — Design Spec (sequential, must complete first)
- [x] [ux-architect] Read all existing files deeply, then write DESIGN_SPEC.md → CONTRACT: DESIGN_SPEC.md exists

### Phase 2 — Build (parallel after Phase 1)
- [x] [frontend-builder] Rebuild app/layout.tsx and app/page.tsx using DESIGN_SPEC.md
- [x] [component-specialist] Rebuild components/FolderBrowser.tsx, components/HowToUse.tsx, components/AgentTeams.tsx, add components/ToolCard.tsx

### Phase 3 — Integration Polish
- [x] [lead] Review all rebuilt files for consistency, fix any import/type errors, ensure app compiles
