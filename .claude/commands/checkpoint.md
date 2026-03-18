# Checkpoint — Session Context Sync

You are closing out a work session. Audit what changed, update every shared context file with accurate current state, and leave the project fully documented so every AI tool picks up exactly where this session ended.

---

## Step 0: Audit the Session

### 0a. Git status — what changed?

\`\`\`bash
git status --short 2>/dev/null || echo "Not a git repo"
git diff --stat HEAD 2>/dev/null
\`\`\`

### 0b. New or untracked files

\`\`\`bash
git ls-files --others --exclude-standard 2>/dev/null
\`\`\`

### 0c. Recent commits this session

\`\`\`bash
git log --oneline --since="12 hours ago" 2>/dev/null || git log --oneline -5
\`\`\`

Internalize: which files changed (git diff stat), new files (untracked), work done (commits + in-session context).

---

## Step 1: Read all current context files

\`\`\`bash
echo "=== .claude.md ===" && cat .claude.md 2>/dev/null || echo "(not found)"
echo "=== .gemini.md ===" && cat .gemini.md 2>/dev/null || echo "(not found)"
echo "=== agents.md ===" && cat agents.md 2>/dev/null || echo "(not found)"
\`\`\`

Note what Session Log, Active Goals, and Project Structure currently say. You will append and patch — never replace or delete existing content.

---

## Step 2: Draft your update (reason before writing)

Before editing any file, plan:

1. **Session log entry** (1 line):
   `YYYY-MM-DD · /checkpoint · [what was accomplished] · [key files changed or created]`

2. **Goals to mark [x]**: Review each `[ ]` goal. Only mark complete if there is file evidence. When in doubt, leave as `[ ]`.

3. **New goals**: Any follow-ups, blockers, or TODOs from the audit?

4. **Project Structure changes**: Files added → add to structure. Files deleted → remove. Files renamed → update.

5. **Tech Stack changes**: New packages in package.json since last context update?

---

## Step 3: Update .claude.md

Edit `.claude.md` directly:
- Append session log entry at the bottom of `## Session Log`
- Update `[ ]` → `[x]` for completed goals only
- Add new goals under `## Active Goals`
- Update `## Project Structure` for file changes
- Update `## Tech Stack` if new dependencies were introduced

**Do not rewrite existing content — append and patch only.**

---

## Step 4: Sync to .gemini.md and agents.md

\`\`\`bash
cp .claude.md .gemini.md && echo "Synced → .gemini.md"
cp .claude.md agents.md && echo "Synced → agents.md"
\`\`\`

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
- If `.claude.md` doesn't exist, create it from the project template before proceeding
