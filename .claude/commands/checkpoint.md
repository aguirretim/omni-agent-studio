# Checkpoint — Session Context Sync

You are closing out a work session. Audit what changed, log it in `_agent-tasks/`, update open goals, and leave the project fully documented so every AI tool picks up exactly where this session ended.

---

## Step 0: Audit the Session

### 0a. Git status — what changed?

```bash
git status --short 2>/dev/null || echo "Not a git repo"
git diff --stat HEAD 2>/dev/null
```

### 0b. New or untracked files

```bash
git ls-files --others --exclude-standard 2>/dev/null
```

### 0c. Recent commits this session

```bash
git log --oneline --since="12 hours ago" 2>/dev/null || git log --oneline -5
```

Internalize: which files changed (git diff stat), new files (untracked), work done (commits + in-session context).

---

## Step 1: Read only what you need

`AGENTS.md` (the short map and rules) is usually loaded already; if not, read it once. Do not read `.claude.md`/`.gemini.md`: they are copies of it.

```bash
cat _agent-tasks/ACTIVE_GOALS.md 2>/dev/null || echo "(no ACTIVE_GOALS.md yet)"
tail -5 _agent-tasks/SESSION_LOG.md 2>/dev/null || echo "(no SESSION_LOG.md yet)"
```

Never read SESSION_LOG.md whole. You will append and patch — never replace or delete existing content.

---

## Step 2: Draft your update (reason before writing)

Before editing any file, plan:

1. **Session log entry** (1 line):
   `YYYY-MM-DD · /checkpoint · [what was accomplished] · [key files changed or created]`

2. **Goals to mark [x]**: Review each `[ ]` goal. Only mark complete if there is file evidence. When in doubt, leave as `[ ]`.

3. **New goals**: Any follow-ups, blockers, or TODOs from the audit?

4. **Map changes**: a top-level folder added, moved or removed → update **Where things are** in `AGENTS.md`. Ordinary file changes do not go in the map.

5. **Rule changes**: only a new standing rule, a lesson worth keeping, or a stack change edits `AGENTS.md` (one line each; keep it under ~150 lines).

---

## Step 3: Write the updates

- Append the ONE log line (≤300 chars) at the end of `_agent-tasks/SESSION_LOG.md` (create the file if missing).
- In `_agent-tasks/ACTIVE_GOALS.md`: mark finished goals `[x]` (or move them into the log) and add new open goals.
- Edit `AGENTS.md` only for the map or rule changes from Step 2.

**Do not rewrite existing content — append and patch only.**

---

## Step 4: Only if AGENTS.md changed, copy it to the other tools' files

```bash
cp AGENTS.md .claude.md && cp AGENTS.md .gemini.md && echo "Synced AGENTS.md → .claude.md + .gemini.md"
```

Never copy `.claude.md` onto `AGENTS.md`: `AGENTS.md` is the source.

---

## Step 5: Report to user

- Exact session log line added
- Goals marked [x] complete (list them)
- Goals still open (list them)
- Whether AGENTS.md changed and was copied to .claude.md/.gemini.md
- Any new goals added

---

## Rules

- **Never delete** existing SESSION_LOG.md entries — only append
- **Never fabricate** completed goals — only mark [x] with file evidence
- **Do not commit** — just update context files; the user decides when to commit
- If `AGENTS.md` doesn't exist, create it from the OmniAgent Studio context page (Shared Context) before proceeding; an old long `.claude.md` is read but not rewritten
