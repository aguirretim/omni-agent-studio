# Agent Team Tasks
Status: DONE

## Selected Skills
- `/build-with-agent-team` — orchestrating multi-file feature addition
- `/review-pr` — code quality gate before commit
- `/commit` — final step

## Agents
- [x] [lead]: OpenClaude integration — tools page + terminal route + agent-teams route + AgentTeams UI

## Contract Chain
lead → produced: app/tools/page.tsx, app/api/terminal/route.ts, app/api/agent-teams/route.ts, components/features/AgentTeams.tsx

## Task List
### Phase 1 — All sequential (single agent)
- [x] [[lead]] Add OpenClaude tool card to tools page → CONTRACT: app/tools/page.tsx
- [x] [[lead]] Add openclaude to terminal/route.ts whitelist → CONTRACT: app/api/terminal/route.ts
- [x] [[lead]] Add launch-openclaude action to agent-teams route → CONTRACT: app/api/agent-teams/route.ts
- [x] [[lead]] Add Multi-LLM section to AgentTeams.tsx Launch tab → CONTRACT: components/features/AgentTeams.tsx

### Phase 2 — Quality Gate
- [x] TypeScript: 0 errors (./node_modules/.bin/tsc --noEmit)
