# Agent Team Tasks
Status: IN PROGRESS
Date: 2026-04-03
Task: Add light mode toggle to all UI

## Selected Skills
- `/ux-heuristic-review` — verify light mode contrast and usability after implementation
- `/ralph` — add remaining polish goals to Active Goals for autonomous iteration
- `/review-pr` — quality gate before commit
- `/commit` — final conventional commit

## Agents
- [ ] foundation-agent: globals.css CSS variables + light theme + AppShell toggle button
- [ ] pages-agent: Replace hardcoded hex colors in all page.tsx files
- [ ] components-agent: Replace hardcoded hex colors in all component files

## Contract Chain
foundation-agent → produces: app/globals.css (CSS vars defined), components/layout/AppShell.tsx (toggle wired)
  ↓ (parallel)
pages-agent → consumes: CSS var names from AGENT_TASKS.md, produces: updated page files
components-agent → consumes: CSS var names from AGENT_TASKS.md, produces: updated component files

## CSS Variable Contract (read this before touching any file)

These are the EXACT CSS variable names and their replacement mapping.
Use `bg-[var(--c-bg)]` Tailwind v4 arbitrary-value syntax.

| CSS Variable     | Dark value | Light value | Replaces these hex classes |
|------------------|------------|-------------|---------------------------|
| --c-bg           | #09090b    | #ffffff     | bg-[#09090b], border-[#09090b] |
| --c-surface      | #18181b    | #f8f9fa     | bg-[#18181b] |
| --c-inset        | #121214    | #f1f5f9     | bg-[#121214] |
| --c-border       | #27272a    | #e2e8f0     | border-[#27272a], bg-[#27272a] |
| --c-deep         | #0f0f11    | #edf2f7     | bg-[#0f0f11] |
| --c-stripe       | #0c0c0e    | #f8fafc     | bg-[#0c0c0e] |
| --c-hover        | #161618    | #f1f5f9     | bg-[#161618] |

Also replace border-[#3a3a3c] → border-[var(--c-border)] (same variable, softer border)

TAILWIND SYNTAX: Use `bg-[var(--c-bg)]` NOT `bg-(--c-bg)` — safer for Tailwind v4.

NOTE: The SplitPanePreview.tsx uses macOS simulator colors (#1c1c1e, #2c2c2e, etc.)
— leave those AS-IS. It's a terminal simulator that should always look dark.

## Task List

### Phase 1 — Sequential (foundation-agent must finish first)
- [ ] [foundation-agent] Update globals.css + AppShell theme toggle → CONTRACT: globals.css, AppShell.tsx

### Phase 2 — Parallel (after Phase 1)
- [ ] [pages-agent] Replace hex colors in all page files → CONTRACT: app/page.tsx, app/context/page.tsx, app/tools/page.tsx, app/sessions/page.tsx, app/ralph/page.tsx
- [ ] [components-agent] Replace hex colors in components → CONTRACT: HowToUse.tsx, FolderBrowser.tsx, WorkspaceSelector.tsx, AgentTeams.tsx, ToolCard.tsx, StatusToast.tsx

### Phase 3 — Integration
- [ ] TypeScript check (npx tsc --noEmit), commit

## Working Rules (from .claude.md — USER OVERRIDE)
- globals.css says "do not change" but user explicitly requested light mode — this overrides that rule
- No new npm packages — only existing deps
- API routes in app/api/ are FROZEN
- Tailwind CSS v4 — use `bg-[var(--c-bg)]` syntax for CSS variable utilities
- Every page must keep 'use client' at top
- TypeScript strict mode — 0 errors required
- SplitPanePreview.tsx: DO NOT change macOS simulator colors — leave dark always

## foundation-agent Detailed Instructions

### 1. globals.css changes
Add CSS custom properties to `:root` and a `[data-theme="light"]` block.
Keep all existing code. ADD the following:

```css
:root {
  /* Theme surface tokens (dark defaults) */
  --c-bg: #09090b;
  --c-surface: #18181b;
  --c-inset: #121214;
  --c-border: #27272a;
  --c-deep: #0f0f11;
  --c-stripe: #0c0c0e;
  --c-hover: #161618;
}

[data-theme="light"] {
  --c-bg: #ffffff;
  --c-surface: #f8f9fa;
  --c-inset: #f1f5f9;
  --c-border: #e2e8f0;
  --c-deep: #edf2f7;
  --c-stripe: #f8fafc;
  --c-hover: #f1f5f9;
}

/* ── Light mode global overrides ── */
/* Text color remapping (zinc-100/200/300 are nearly white, invisible on light bg) */
[data-theme="light"] .text-zinc-100 { color: #18181b; }
[data-theme="light"] .text-zinc-200 { color: #27272a; }
[data-theme="light"] .text-zinc-300 { color: #3f3f46; }

/* Hover text remapping */
[data-theme="light"] .hover\:text-zinc-200:hover { color: #18181b; }
[data-theme="light"] .hover\:text-zinc-300:hover { color: #27272a; }

/* Zinc bg remapping */
[data-theme="light"] .bg-zinc-800 { background-color: #f1f5f9; }
[data-theme="light"] .bg-zinc-900 { background-color: #f8f9fa; }
[data-theme="light"] .bg-zinc-950 { background-color: #ffffff; }
[data-theme="light"] .bg-zinc-800\/50 { background-color: rgba(226, 232, 240, 0.5); }
[data-theme="light"] .bg-zinc-800\/60 { background-color: rgba(226, 232, 240, 0.6); }

/* Hover bg remapping */
[data-theme="light"] .hover\:bg-zinc-700:hover { background-color: #e2e8f0; }
[data-theme="light"] .hover\:bg-zinc-800:hover { background-color: #f1f5f9; }

/* Border remapping */
[data-theme="light"] .border-zinc-700 { border-color: #d4d4d8; }
[data-theme="light"] .border-zinc-800 { border-color: #e4e4e7; }

/* Scrollbar for light mode */
[data-theme="light"] ::-webkit-scrollbar-thumb { background: #d4d4d8; }
[data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }

/* Body gradient: remove in light mode */
[data-theme="light"] body {
  background-image: none;
}
```

Also update the body rule to use the CSS var:
```css
body {
  background-color: var(--c-bg);
  ...
}
```
(Change `background-color: var(--background)` to `background-color: var(--c-bg)`)

### 2. AppShell.tsx changes
- Import `Sun` and `Moon` from lucide-react (add to existing import)
- Add `theme` state: `const [theme, setTheme] = useState<'dark' | 'light'>('dark')`
- Add useEffect to restore from localStorage on mount:
  ```ts
  useEffect(() => {
    const saved = localStorage.getItem('omni-theme') as 'dark' | 'light' | null;
    const initial = saved ?? 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial === 'light' ? 'light' : '');
  }, []);
  ```
  Use `document.documentElement.setAttribute` not `document.documentElement.dataset.theme` (safer).
  When theme is 'dark', set attribute to '' (empty string) OR removeAttribute — use removeAttribute for clean DOM.
  
- Add toggle function:
  ```ts
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('omni-theme', next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };
  ```

- Add toggle button in the header `<div className="flex items-center gap-3">` BEFORE the audio controls:
  ```tsx
  <button
    onClick={toggleTheme}
    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    aria-pressed={theme === 'light'}
  >
    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
  </button>
  ```

- Also update AppShell's own hardcoded hex colors (sidebar, header) using the CSS vars:
  - `bg-[#09090b]` → `bg-[var(--c-bg)]`
  - `bg-[#121214]` → `bg-[var(--c-inset)]`
  - `border-[#27272a]` → `border-[var(--c-border)]`
