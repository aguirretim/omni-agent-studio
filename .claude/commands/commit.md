# Smart Commit — Conventional Commits Workflow

You are a senior engineer writing a precise, honest git commit message.
Your job: inspect what is staged, understand *why* the changes exist, and produce a commit that follows the Conventional Commits spec (https://www.conventionalcommits.org).

**Optional context from the user:** $ARGUMENTS

---

## Step 1: Inspect the staged diff

```bash
git diff --cached --stat
git diff --cached
```

If nothing is staged, run:

```bash
git status --short
```

If nothing is staged and nothing has been changed, tell the user and stop.
If files are unstaged that the user probably wants to include, ask before staging them.

---

## Step 2: Understand the change

Read the diff carefully. Identify:

1. **What changed** — files, functions, logic, config, dependencies
2. **Why it likely changed** — bug fix, new feature, refactor, performance, security, docs, test, chore, build, ci
3. **Scope** — which module, package, or subsystem is affected (e.g., `auth`, `api`, `ui`, `deps`)
4. **Breaking changes** — does anything in the diff break backward compatibility?

Do NOT look at anything outside the staged diff unless you need to read a referenced file for context (e.g., a file referenced in a config change).

---

## Step 3: Draft the commit message

Follow Conventional Commits format strictly:

```
<type>(<scope>): <short imperative summary under 72 chars>

<body — optional, explain WHY not WHAT, wrap at 72 chars>

<footer — optional: BREAKING CHANGE: ..., Closes #123>
```

**Type selection rules:**
- `feat` — new capability visible to users or consumers of the API
- `fix` — corrects a defect or broken behavior
- `refactor` — restructures code without changing behavior or external API
- `perf` — measurable performance improvement
- `test` — adds or corrects tests only
- `docs` — documentation only (comments, README, .md files)
- `style` — whitespace, formatting, missing semicolons — no logic change
- `build` — changes to build system, scripts, bundler config
- `ci` — CI/CD pipeline configuration
- `chore` — maintenance tasks not in the above categories (e.g., update .gitignore)

**Scope rules:**
- Use the primary module or folder name, lowercase, hyphen-separated
- Omit scope if the change is truly global or cross-cutting
- Never use vague scopes like `misc` or `various`

**Summary rules:**
- Imperative mood: "add", "fix", "remove" — not "added", "fixes", "removed"
- No period at end
- Under 72 characters
- Describe the effect, not the mechanism (e.g., "prevent login after session expiry" not "add null check to getSession")

**Body rules (include when the diff alone doesn't explain the why):**
- Explain the motivation for the change
- Contrast with the previous behavior
- Wrap lines at 72 characters

**Footer rules:**
- `BREAKING CHANGE: <description>` if any public API, CLI arg, config key, or database schema changed in a non-backward-compatible way
- `Closes #<number>` or `Fixes #<number>` if you can infer the issue from $ARGUMENTS or the diff

---

## Step 4: Show the proposed message

Print the full commit message exactly as it will be passed to git. Ask the user:

```
Proposed commit message:
─────────────────────────────
[your message here]
─────────────────────────────
Commit with this message? (yes / edit / cancel)
```

Wait for confirmation. If the user says "edit", incorporate their changes and show the revised message before committing. If "cancel", stop.

---

## Step 5: Commit

```bash
git commit -m "<type>(<scope>): <summary>" -m "<body if any>" -m "<footer if any>"
```

Use separate `-m` flags for subject, body, and footer so git formats them as separate paragraphs. Do not use a heredoc — it breaks on Windows.

After the commit succeeds, print:
- The full commit hash (short)
- The subject line
- How many files changed and lines added/removed (from git output)

---

## Rules

- **Never fabricate** intent — if you cannot tell why something changed from the diff alone, write the most conservative accurate description and omit a body rather than guessing motivation
- **Never amend** a previous commit without explicit user instruction
- **Never force-push** under any circumstances
- **If $ARGUMENTS contains a message** — use it as the starting point for the summary, but still validate it against the diff and correct if inaccurate
- **One commit, one concern** — if the diff mixes unrelated changes, warn the user and suggest splitting before proceeding
