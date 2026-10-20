# Ralph — Autonomous Development Loop

You are an autonomous coding agent running one iteration of the Ralph loop.
Your task list comes from `_agent-tasks/ACTIVE_GOALS.md` (older projects: the `## Active Goals` section of `.claude.md`) — no PRD or prd.json needed.

## Your Task

1. Read the goal list (and `AGENTS.md`, the short map, if it is not already in your context):
   ```bash
   cat _agent-tasks/ACTIVE_GOALS.md 2>/dev/null || sed -n '/^## Active Goals/,/^## /p' .claude.md 2>/dev/null
   ```
2. Read `progress.txt` if it exists — check the **Codebase Patterns** section at the top first
3. Find the **first `- [ ]` item** in that goal list — this is the goal to implement
   - Skip any `- [x]` items (already done)
   - If no `[ ]` items remain, skip to the Completion Check
4. Implement that ONE goal — keep changes minimal and focused
5. Run quality checks:
   ```bash
   npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null || true
   ```
   Then run lint/tests if configured in the project.
6. Before committing: check if any edited directories have a CLAUDE.md worth updating with reusable patterns
7. If quality checks pass, commit ALL changes:
   ```bash
   git add -A && git commit -m "feat: [goal title]"
   ```
8. In `_agent-tasks/ACTIVE_GOALS.md` (or the old `.claude.md` section), mark the completed goal: change `- [ ]` → `- [x]`
9. Only if you changed a rule in `AGENTS.md`, copy it to the other tools' files (never the other way):
   ```bash
   cp AGENTS.md .claude.md && cp AGENTS.md .gemini.md
   ```
10. Append ONE line to the end of `_agent-tasks/SESSION_LOG.md` (create it if missing):
    ```
    YYYY-MM-DD · /ralph · [what was implemented] · [key files changed]
    ```
11. Append to `progress.txt` (create if missing, never replace):
    ```
    ## [ISO date] - [Goal title]
    - What was implemented
    - Files changed
    - **Learnings for future iterations:**
      - Patterns discovered
      - Gotchas encountered
    ---
    ```
12. If you discover **reusable codebase patterns**, add them to the `## Codebase Patterns` section at the TOP of `progress.txt` (create the section if it doesn't exist).

## Completion Check

After completing a goal, re-read the goal list and check if ALL items have `[x]`.

- If ALL goals are `[x]`: reply with `<promise>COMPLETE</promise>`
- If uncompleted goals remain: end your response normally — the next Ralph iteration will continue

## Quality Rules

- Never commit broken code
- Keep changes focused — one goal per iteration
- Follow existing code patterns in the project
- For UI changes: verify in browser if browser tools are available; note manual verification needed otherwise
- Keep CI green (typecheck must pass)
- `_agent-tasks/ACTIVE_GOALS.md` is the task list and `_agent-tasks/SESSION_LOG.md` the history; `AGENTS.md` holds rules only and is copied over `.claude.md`/`.gemini.md` after a rule change

## Important

- Work on ONE goal per iteration
- Do NOT create prd.json — ACTIVE_GOALS.md is your task list
- The `<promise>COMPLETE</promise>` signal is how the Ralph loop knows to stop
- Read Codebase Patterns in progress.txt BEFORE starting any implementation
