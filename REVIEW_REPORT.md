# OmniAgent Studio — Code Review Report (Round 3)
**Date:** 2026-03-21  
**Reviewers:** security-reviewer · quality-reviewer · ux-reviewer (parallel Claude sub-agents)  
**Scope:** All `app/`, `components/`, `tsconfig.json`, `run.ps1`, `scripts/setup.ts`

---

## Executive Summary

| Severity | Count | Delta vs Round 2 | Fixed since Round 2 |
|----------|-------|-----------------|---------------------|
| Critical | 8 | +1 new (C-NEW1 FolderBrowser ARIA) | 0 |
| High | 15 | +4 new (H-NEW3,4 FolderBrowser; Q-H1 strict; S-H1 agentCount) | 0 |
| Medium | 17 | +2 new (M-NEW5,6 AgentTeams a11y) | 0 |
| Low | 19 | +2 new (L-NEW7,8 icon-button labels) | 0 |

**No findings from any prior round have been fixed.** All 4 critical shell injection issues (C1–C4) remain open. 8 Criticals total. Fix roadmap is prioritized below.

---

## CRITICAL

### C1 — Shell injection via `commitMsg` in `commit/route.ts` *(REPEAT — NOT FIXED)*
**File:** `app/api/commit/route.ts:32`  
User-supplied `message` is interpolated into `exec(\`git commit -m "${commitMsg}"\`)`. A crafted commit message can inject arbitrary shell commands.  
**Fix:** `spawn('git', ['commit', '-m', commitMsg], { cwd: projectPath, shell: false })`

### C2 — Shell injection via `projectPath` in `terminal/route.ts` *(REPEAT — NOT FIXED)*
**File:** `app/api/terminal/route.ts:43`  
`projectPath` injected directly into `cmd.exe /K "cd /d ${projectPath} && ..."`. Any path containing `"` or `&&` injects commands.  
**Fix:** Write path to a temp `.bat`, execute the `.bat` instead of inline string.

### C3 — Shell injection via `projectPath` in `agent-teams/route.ts` exec calls *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:1154,1159,1188,1194`  
`batPath`/`ps1Path` derived from attacker-controlled `projectPath` and interpolated unescaped into `exec()` shell strings.  
**Fix:** Pass script paths as array args to `spawn` with `shell: false`.

### C4 — cmd.exe escape bypass in `launch-headless` *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:1207–1217`  
User-supplied `plan` is `\"`-escaped then passed to `spawn('cmd.exe', ['/c', cmdToExecute])`. In cmd.exe `\"` is two characters, not an escape — crafted plans break out of quotes. `agentCount` also concatenated without any sanitization.  
**Fix:** `spawn('claude', ['--dangerously-skip-permissions', '-p', fullPrompt], { shell: false })`

### C5 — HowToUse modal missing ARIA dialog semantics *(REPEAT — NOT FIXED)*
**File:** `components/layout/HowToUse.tsx:26`  
No `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. Screen readers do not announce modal boundary.  
**Fix:** `<motion.div role="dialog" aria-modal="true" aria-labelledby="how-to-use-title">`

### C6 (was C7) — HowToUse AnimatePresence exit animation never fires *(REPEAT — NOT FIXED)*
**File:** `components/layout/HowToUse.tsx:22`  
`if (!isOpen) return null` before `<AnimatePresence>` — component unmounts before exit animation.  
**Fix:** Move guard inside AnimatePresence: `<AnimatePresence>{isOpen && <motion.div exit={...}>`

### C-NEW1 — FolderBrowser modal missing ARIA dialog semantics *(NEW)*
**File:** `components/layout/FolderBrowser.tsx:70–78`  
Full-screen modal overlay has no `role="dialog"`, `aria-modal`, or `aria-labelledby`. Identical gap to C5 but in a different component.  
**Fix:** `<motion.div role="dialog" aria-modal="true" aria-labelledby="folder-browser-title">`

### C-NEW2 — FolderBrowser AnimatePresence exit animation never fires *(NEW)*
**File:** `components/layout/FolderBrowser.tsx:68`  
Same `if (!isOpen) return null` before `<AnimatePresence>` pattern as C6. Exit animation on close never fires.  
**Fix:** Same as C6 — move guard inside AnimatePresence.

---

## HIGH

### S-H1 — `agentCount` not validated, injected into bash scripts *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:967,1056,1111`  
`agentCount` from POST body has no type or range check. Flows into a bash heredoc single-quoted string. Crafted value like `"' Enter; rm -rf / #"` escapes single-quote context.  
**Fix:** Validate as positive integer: `const count = parseInt(agentCount, 10); if (!Number.isFinite(count) || count < 1 || count > 10) return 400;`

### S-H2 — Arbitrary working directory / `git init` on any path *(REPEAT — NOT FIXED)*
**File:** `app/api/commit/route.ts:12–24`  
`projectPath` is fully attacker-controlled with no boundary check. Can run `git init` + `git add .` in `C:\Windows\System32` or any writable path.  
**Fix:** Validate path is under `os.homedir()`: `if (!path.resolve(projectPath).startsWith(os.homedir())) return 403;`

### S-H3 — No auth/CSRF on privileged `install-wsl` / `install-distro` actions *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:1295–1313`  
Any browser tab can POST to trigger a UAC elevation prompt for WSL installation. Zero authentication required.  
**Fix:** Add `Origin` header check: `if (request.headers.get('origin') !== 'http://localhost:3000') return 403;`

### S-H4 — Path traversal in `context/route.ts` (arbitrary file write) *(REPEAT — NOT FIXED)*
**File:** `app/api/context/route.ts:44–59`  
`projectPath` unrestricted. Writes `.gemini.md`, `.claude.md`, `agents.md` to any directory. No size limit on `content`.  
**Fix:** Same path boundary check as S-H2; add 1 MB `content` size limit.

### S-H5 — Arbitrary script write + execute via `launch-terminal` *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:1134–1196`  
Scripts written to `projectPath` (attacker-controlled) are immediately executed. Combines with C3/C4 for write-then-execute chain.  
**Fix:** Path boundary check on `projectPath`; spawn args as array (no shell); validate `agentCount`.

### Q-H1 — `strict: false` in tsconfig.json *(REPEAT — NOT FIXED)*
**File:** `tsconfig.json:11`  
TypeScript strict mode disabled. Silences `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`. All routes use `error: any` in catch blocks unchecked.  
**Fix:** `"strict": true` — expected breakage is small (catch blocks, a few optional chains).

### H-NEW3 — FolderBrowser: No focus trap *(NEW)*
**File:** `components/layout/FolderBrowser.tsx:70`  
Full-screen modal opens but Tab key cycles through content behind the overlay. No focus trap, no focus restore on close.  
**Fix:** On open, focus first focusable element inside modal; trap Tab/Shift+Tab; on close, restore focus to trigger.

### H-NEW4 — FolderBrowser: Backdrop click does not close modal *(NEW)*
**File:** `components/layout/FolderBrowser.tsx:72`  
Backdrop has no `onClick` handler. Only X button and Escape dismiss it — violates standard modal pattern.  
**Fix:** `<div className="fixed inset-0 ..." onClick={onClose}>` + `e.stopPropagation()` on inner panel.

### H7 — HowToUse: No focus trap *(REPEAT — NOT FIXED)*
**File:** `components/layout/HowToUse.tsx`  
Tab key navigates behind backdrop through sidebar nav. Focus not moved on open, not restored on close.  
**Fix:** Same as H-NEW3.

### H8 — HowToUse: Backdrop click does not close modal *(REPEAT — NOT FIXED)*
**File:** `components/layout/HowToUse.tsx:26`  
Backdrop `<div>` has no `onClick` handler.  
**Fix:** `onClick={onClose}` on backdrop.

### H9 — AgentTeams collapse button missing `aria-expanded`/`aria-controls` *(REPEAT — NOT FIXED)*
**File:** `components/features/AgentTeams.tsx:260–286`  
Collapse button communicates open/closed state via icon and CSS only.  
**Fix:** `aria-expanded={isExpanded}` `aria-controls="agent-teams-content"` on button; `id="agent-teams-content"` on panel.

### H10 — AgentTeams tab widget missing ARIA + keyboard nav *(REPEAT — NOT FIXED)*
**File:** `components/features/AgentTeams.tsx:299–312`  
No `role="tablist"`, `role="tab"`, `aria-selected`, `role="tabpanel"`. No arrow-key navigation (required by ARIA Tabs pattern).  
**Fix:** Full ARIA tabs implementation with Left/Right arrow key cycling.

### H11 — StatusToast: No `role="status"` / `aria-live` *(REPEAT — NOT FIXED)*
**File:** `components/ui/StatusToast.tsx:12–22`  
Async feedback announced visually only — invisible to screen readers.  
**Fix:** `<motion.div role="status" aria-live="polite" aria-atomic="true">`

### H12 — sessions/page.tsx: Failed commit renders success icon *(REPEAT — NOT FIXED)*
**File:** `app/sessions/page.tsx:90`  
`<CheckCircle2 className="text-emerald-500">` rendered unconditionally regardless of commit success/failure.  
**Fix:** Check `lastCommitMsg?.startsWith('Failed') || lastCommitMsg?.startsWith('Fatal')` → render `<XCircle className="text-red-400">`.

### H13 — HowToUse documents removed "Headless mode" feature *(REPEAT — NOT FIXED)*
**File:** `components/layout/HowToUse.tsx:149–153`  
Step 4 describes Headless mode which was removed 2026-03-18. Creates user confusion.  
**Fix:** Remove paragraph; describe terminal-only launch workflow.

---

## MEDIUM

### S-M1 — Unrestricted filesystem traversal in `fs/route.ts` *(REPEAT — NOT FIXED)*
**File:** `app/api/fs/route.ts:17–50`  
Allows browsing any directory on host filesystem (C:\Windows, /etc, etc). No root boundary enforced.  
**Fix:** Restrict to paths under `os.homedir()`.

### S-M2 — Path traversal in `analyze/route.ts` *(REPEAT — NOT FIXED)*
**File:** `app/api/analyze/route.ts:9,22`  
`projectPath` unvalidated — reads `package.json` from any path on disk.  
**Fix:** Same path boundary check.

### S-M3 — `wslProject` bash path lacks single-quote escaping *(REPEAT — NOT FIXED)*
**File:** `app/api/agent-teams/route.ts:1096`  
`toWslPath` result used in `cd '${wslProject}'` without escaping single quotes. PowerShell path at line 1172 *does* escape but bash path does not.  
**Fix:** `const safePath = wslProject.replace(/'/g, "'\\''")`

### S-M4 — No body size limit on `context` sync *(REPEAT — NOT FIXED)*
**File:** `app/api/context/route.ts:44–59`  
No max size on `content`. Can fill disk via repeated calls.  
**Fix:** Enforce 1 MB max; return 413 if exceeded.

### S-M5 — Error messages leak filesystem paths *(REPEAT)*
**Files:** All API routes `catch` blocks  
Raw `error.message` returned — leaks absolute paths, software versions.  
**Fix:** Return `{ error: 'Internal server error' }` in production; log actual error server-side only.

### Q-M1 — `AnimatePresence` exit animations broken *(REPEAT — NOT FIXED)*
**Files:** `components/layout/FolderBrowser.tsx:68`, `components/layout/HowToUse.tsx:22`  
Both guard before `AnimatePresence` — exit animation never fires. (See also C6, C-NEW2.)  
**Fix:** Move early return inside `AnimatePresence`.

### Q-M2 — `handleLoadContext` not memoized, `eslint-disable` masks bug *(REPEAT — NOT FIXED)*
**File:** `app/context/page.tsx:122–127`  
`useEffect(fn, [])` with `eslint-disable` hides missing deps. If deps were added, effect runs every render.  
**Fix:** `useCallback` for `handleLoadContext`; list in effect deps.

### Q-M3 — Duplicate auto-clear in `AgentTeams.flash()` *(REPEAT — NOT FIXED)*
**Files:** `components/features/AgentTeams.tsx:84–87`, `components/layout/WorkspaceProvider.tsx:56–61`  
`WorkspaceProvider.setSyncStatus` already auto-clears after 3s. `flash()` in AgentTeams adds a second competing timeout.  
**Fix:** Remove `flash()` and call `setSyncStatus()` directly.

### M4 — AnimatePresence exit broken in both modals *(covered by Q-M1, C6, C-NEW2)*

### M9 — context/page.tsx textarea has no accessible label *(REPEAT — NOT FIXED)*
**File:** `app/context/page.tsx:314–315`  
No `aria-label`, `aria-labelledby`, or `<label>` on textarea.  
**Fix:** `<textarea aria-label="Shared AI context editor" ...>`

### M10 — ToolCard external links open new tab without warning *(REPEAT — NOT FIXED)*
**File:** `components/ui/ToolCard.tsx:72–82`  
`target="_blank"` with no accessible announcement or visible icon.  
**Fix:** `aria-label="Check usage for {name} (opens in new tab)"` + ↗ icon.

### M11 — SplitPanePreview cycling text not `aria-hidden` *(REPEAT — NOT FIXED)*
**File:** `components/features/SplitPanePreview.tsx:119–127`  
Continuous line announcements disrupt screen reader users.  
**Fix:** `aria-hidden="true"` on mosaic container.

### M12 — sessions/page.tsx page heading duplicated in card body *(REPEAT — NOT FIXED)*
**File:** `app/sessions/page.tsx:65–79`  
Identical sentence at line 67 and 78.  
**Fix:** Remove one copy.

### M13 — AgentTeams WSL install button re-enables mid-install *(REPEAT — NOT FIXED)*
**File:** `components/features/AgentTeams.tsx:165–178`  
Button re-enables after API returns, before async UAC+install completes.  
**Fix:** Keep disabled until `checkWsl()` confirms `wslAvailable: true`.

### M14 — context/page.tsx `70vh` editor unusable on mobile *(REPEAT — NOT FIXED)*
**File:** `app/context/page.tsx:253`  
Collapses when mobile keyboard appears.  
**Fix:** `h-[70dvh] min-h-[300px]`.

### M15 — SplitPanePreview hardcoded heights overflow narrow viewports *(REPEAT — NOT FIXED)*
**File:** `components/features/SplitPanePreview.tsx:120,138`  
**Fix:** `h-[min(400px,60vw)]`.

### M-NEW5 — AgentTeams agent count selector missing accessible group label *(NEW)*
**File:** `components/features/AgentTeams.tsx:381–396`  
Count buttons have no `role="group"` or `aria-labelledby`.  
**Fix:** `<div role="group" aria-labelledby="agent-count-label"><span id="agent-count-label">Agents</span>...`

### M-NEW6 — AgentTeams skill status communicated via color only *(NEW)*
**File:** `components/features/AgentTeams.tsx:344–371`  
✓/↑ symbols + green/amber/gray only. No accessible label per button.  
**Fix:** `aria-label={isCurrent ? \`${label} — installed\` : isOutdated ? \`${label} — update available\` : \`Install ${label}\`}`

---

## LOW

| ID | File | Issue |
|----|------|-------|
| S-L1 | `run.ps1:41–53` | MSI downloaded without hash verification |
| S-L2 | `scripts/setup.ts:14` | `execSync(\`npm install -g ${pkgName}\`)` — latent injection if pkgName ever externalized |
| Q-L1 | `components/layout/HowToUse.tsx:5` | `useState` imported but unused |
| Q-L2 | `components/ui/ToolCard.tsx:7–16` | `id` and `bgColor` props received but never used |
| Q-L3 | `components/layout/WorkspaceSelector.tsx:109` | `key={idx}` on recentPaths list — should be `key={path}` |
| Q-L4 | `components/layout/FolderBrowser.tsx:45` | `catch (err)` with unused var — should be `catch {}` |
| Q-L5 | `components/features/AgentTeams.tsx:403` | IIFE in JSX — extract as sub-component or computed var |
| Q-L6 | `components/layout/FolderBrowser.tsx:53` | `fetchDirectory` missing from `useEffect` deps |
| Q-L7 | `tsconfig.json:16` | `"moduleResolution": "node"` outdated — use `"bundler"` for Next.js 13+ |
| Q-L8 | `app/context/page.tsx:253` | Inline `style={{ height: '70vh' }}` — use Tailwind `h-[70vh]` |
| Q-L9 | `components/features/SplitPanePreview.tsx:121` | `key={i}` on line list — use composite key |
| Q-L10 | `components/layout/WorkspaceSelector.tsx:46` / `app/page.tsx:68` | `setSyncStatus('Context loaded')` called twice on connect |
| L12 | `app/page.tsx:18–43` | Quick action accent colors not in CSS token set |
| L13 | All animated components | No `prefers-reduced-motion` support |
| L14 | `components/ui/StatusToast.tsx:17` | Pulse dot animates on stable "saved" messages |
| L15 | `app/tools/page.tsx:41` | OpenCode "Check usage" links to docs, not billing |
| L16 | `components/layout/HowToUse.tsx:32` | `h-[80vh]` clips on short screens — use `max-h-[80dvh]` |
| L17 | Multiple | Undocumented near-black surface tones not in globals.css |
| L-NEW7 | `components/layout/WorkspaceSelector.tsx:65,85` | Icon-only buttons use `title` not `aria-label` |
| L-NEW8 | `HowToUse.tsx:41`, `FolderBrowser.tsx:83` | Close buttons missing `aria-label="Close dialog"` |

---

## Fix Roadmap

### Tier 1 — Security (ship-blocker)
1. **Replace all `exec(shellString)` with `spawn(cmd, args[], { shell: false })`** — eliminates C1–C4 and C3 across all 3 routes
2. **Validate `projectPath` against `os.homedir()` boundary** — fixes S-H2, S-H4, S-M1, S-M2, S-H5
3. **Validate `agentCount` as positive integer** — fixes S-H1
4. **Add `Origin` header check on mutating routes** — fixes S-H3 CSRF

### Tier 2 — Correctness
5. **Enable `"strict": true` in tsconfig.json** — Q-H1
6. **Fix AnimatePresence exit pattern** in both modals (C6, C-NEW2, Q-M1)
7. **Fix sessions/page.tsx error icon** — H12 (5-line change)
8. **Remove stale Headless mode docs** from HowToUse — H13

### Tier 3 — Accessibility
9. **Add `role="dialog"` + `aria-modal` + `aria-labelledby`** to HowToUse + FolderBrowser (C5, C-NEW1)
10. **Add focus trap + restore** to both modals (H7, H-NEW3)
11. **Add backdrop `onClick={onClose}`** to both modals (H8, H-NEW4)
12. **Add `role="status"` + `aria-live` to StatusToast** (H11)
13. **Add full ARIA tabs + arrow-key nav** to AgentTeams (H10)
14. **Add `aria-expanded`/`aria-controls`** to AgentTeams collapse button (H9)

### Tier 4 — Polish
15. Medium/Low items: `handleLoadContext` memoization, `flash()` dedup, unused props, key props, icon button labels, mobile heights, reduced motion
