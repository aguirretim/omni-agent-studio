# Agent Team Tasks
Status: IN PROGRESS
Date: 2026-04-03
Task: Add "Install All Library Skills" button to the Skill Library tab

## Selected Skills
- `/review-pr` — quality gate after implementation
- `/commit` — final commit with conventional message

## Agents
- [ ] feature-agent: Add Install All Library Skills button to AgentTeams Skill Library tab

## Contract Chain
feature-agent → produces: components/features/AgentTeams.tsx (updated)

## Task List
### Phase 1 — Single agent (self-contained change)
- [ ] [feature-agent] Add isInstallingAllPacks state + handleInstallAllPacks fn + Install All Library Skills button → CONTRACT: AgentTeams.tsx

### Phase 2 — Integration
- [ ] [feature-agent] TypeScript check + commit

## Implementation Notes
- API routes are frozen — no new API actions. Loop through packs client-side.
- handleInstallAllPacks: iterate packs array, call install-pack for each sequentially
- Button goes in the Skill Library tab header row (line ~1008 in AgentTeams.tsx)
- Show progress: "Installing X/Y packs..." while running
- Disable button when all packs already installed (check installedPacks record)
- Use existing Download + CheckCircle2 + Loader2 icons (already imported)
