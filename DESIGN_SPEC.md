# OmniAgent Studio - Design Specification

> Produced by: ux-architect agent
> Date: 2026-03-18
> Consumers: frontend-builder, component-specialist

---

## 1. App Summary

OmniAgent Studio is a local desktop-style dashboard (Next.js 16) that lets developers coordinate multiple AI coding tools (Claude Code, Gemini CLI, OpenCode, OpenAI Codex) from a single interface. Users connect a project workspace, write a shared context file that gets synced to all AI tools simultaneously, then launch interactive terminals or headless background agents. The app also supports "Agent Teams" -- an experimental Claude Code feature where a lead agent autonomously forms and coordinates a multi-agent team.

---

## 2. Simplified Information Architecture

### Routing Strategy (Next.js App Router)

| Route | Page Name | Purpose |
|-------|-----------|---------|
| `/` | **Home** | Workspace selector, quick-start guide, recent workspaces |
| `/context` | **Shared Context** | The markdown editor for the shared AI context file |
| `/tools` | **AI Tools** | Launch interactive terminals for each AI tool |
| `/agents` | **Agents** | Ghost agents (headless tasks) + Agent Teams (multi-agent orchestration) |
| `/sessions` | **Sessions** | Git session manager -- commit current project state |

### Sidebar Navigation

Width: 260px fixed. Dark background `#09090b`, right border `#27272a`.

| Order | Label | Icon (lucide) | Route | Description |
|-------|-------|---------------|-------|-------------|
| 1 | Home | `Home` | `/` | Workspace setup + welcome |
| 2 | Shared Context | `FileText` | `/context` | Edit the shared AI instructions file |
| 3 | AI Tools | `Terminal` | `/tools` | Launch Claude, Gemini, OpenCode, Codex terminals |
| 4 | Agents | `Bot` | `/agents` | Ghost agents + Agent Teams |
| 5 | Sessions | `FolderGit2` | `/sessions` | Git commit manager |

**Sidebar footer**: Version label (`v1.1.0`) and green status dot (same as current).

**Active state**: The active nav item gets `bg-zinc-800/50` background and `text-zinc-200`. Inactive items are `text-zinc-500` with `hover:text-zinc-300 hover:bg-zinc-800/50`.

Use `usePathname()` from `next/navigation` to determine active state. Each nav item is a `<Link>` from `next/link`.

---

## 3. Simplified Terminology Map

| Old Term | New Term | Where Used |
|----------|----------|------------|
| OmniContext Root | Shared AI Context | Context editor heading, How To Use |
| Ghost Agents (Headless Tooling) | Quick Task (Headless) | Agents page section |
| Active Nodes / Active Models | AI Tools | Tools page heading, sidebar |
| Commit Node Stage | Save Session | Sessions page button |
| Session Controller | Session Manager | Sessions page heading |
| Write State | Save & Sync | Context editor button |
| Terminal Hub | AI Tools | Sidebar nav |
| Initialize workspace | Connect Workspace | Home page input |
| Spawning node | Launching tool | Status messages |
| State synchronized | Context saved | Status messages |
| Context mapped | Context loaded | Status messages |
| Dispatch | Run Task | Ghost agent submit button |
| Deploy/Deploying | Running | Ghost agent / team status |
| Ghost process | Background task | Status messages |
| Smart template generated | Template created | Status messages |
| Locks in current state and commits the project node | Commits all changes in your workspace via git | Sessions page description |
| Agent Team terminal launched | Agent team started | Status messages |

---

## 4. Component Breakdown

### 4.1 `app/layout.tsx` — Root Layout

**Renders**: `<html>` > `<body>` with sidebar + main content area.

**Contains**:
- `WorkspaceProvider` context wrapper (see State Management)
- Sidebar with nav links
- `<main>` with `<Suspense>` wrapping `{children}`

**State**: None local. Provides `WorkspaceContext`.

**API calls**: None.

---

### 4.2 `components/WorkspaceProvider.tsx` — Global State Context

**Props**: `{ children: React.ReactNode }`

**Provides via context**:
```typescript
interface WorkspaceContextValue {
  projectPath: string;
  setProjectPath: (path: string) => void;
  recentPaths: string[];
  addRecentPath: (path: string) => void;
  syncStatus: string | null;
  setSyncStatus: (msg: string | null) => void;
}
```

**State** (all local to provider):
- `projectPath: string` — current workspace path
- `recentPaths: string[]` — up to 5 recent paths, persisted to `localStorage` key `omniagent_recent_paths`
- `syncStatus: string | null` — transient status toast message, auto-clears after 3s

**Behavior**:
- On mount, reads `omniagent_recent_paths` from localStorage. If entries exist, sets `projectPath` to the first one.
- `addRecentPath(path)` prepends path, deduplicates, slices to 5, persists.
- `setSyncStatus(msg)` sets the message and schedules a 3-second auto-clear via `setTimeout`.

**API calls**: None.

---

### 4.3 `components/StatusToast.tsx` — Floating Status Indicator

**Props**: None (reads `syncStatus` from `WorkspaceContext`)

**Renders**: The animated pill in the top-right area showing transient status messages. Uses `AnimatePresence` + `motion.div` from framer-motion.

```typescript
// No props -- uses useWorkspace() hook
```

**State**: None local.

**API calls**: None.

**Placement**: Rendered inside the layout's main content area header, or as a fixed-position element. Currently in the breadcrumb header bar -- keep it there.

---

### 4.4 `components/WorkspaceSelector.tsx` — Workspace Path Input Bar

**Props**:
```typescript
interface WorkspaceSelectorProps {
  onConnect: (path: string) => void;  // called after successful context load
}
```

**Renders**: The workspace path input with folder-browse button, recent-paths dropdown, and "Connect" button.

**State** (local):
- `isRecentsOpen: boolean`
- `isLoading: boolean`

**Reads from context**: `projectPath`, `setProjectPath`, `recentPaths`, `setSyncStatus`

**API calls**:
- `POST /api/context` with `{ action: 'read', projectPath }` on Connect click

**Behavior**:
- Folder icon opens `FolderBrowser` modal
- Clock icon opens recents dropdown
- Connect button loads context and calls `onConnect`
- Enter key triggers connect

---

### 4.5 `components/FolderBrowser.tsx` — Folder Browser Modal (EXISTING - minor updates only)

**Props** (unchanged):
```typescript
interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}
```

**Renders**: Full-screen modal overlay with directory browser, path bar, navigation. No changes needed to logic or layout. Just update the component to match any style token changes.

**State** (local):
- `currentPath: string`
- `parentPath: string | null`
- `directories: Directory[]`
- `isLoading: boolean`
- `error: string | null`

**API calls**: `POST /api/fs` with `{ path }`

---

### 4.6 `components/HowToUse.tsx` — How To Use Modal (EXISTING - content updates)

**Props** (unchanged):
```typescript
interface HowToUseProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Content updates**: Replace all old terminology with new terminology from Section 3. Update step labels:
1. "Connect Workspace" (was "Initialize Workspace")
2. "Write Shared AI Context" (was "Define The Omni Context Root")
3. "Launch AI Tools" (was "Launch Active Nodes")
4. "Run Quick Tasks" (was "Live Streaming Ghost Agents")

Keep the Agent Teams section content as-is (terminology there is already fine).

**State**: None local.
**API calls**: None.

---

### 4.7 `components/ToolCard.tsx` — AI Tool Launch Card (NEW)

**Props**:
```typescript
interface ToolCardProps {
  id: string;
  name: string;         // e.g. "Claude Code"
  command: string;      // e.g. "claude"
  icon: string;         // Single character: "C", "G", "O", "X"
  color: string;        // Tailwind text color class: "text-orange-400"
  bgColor: string;      // Tailwind bg class: "bg-orange-400/10"
  hoverBorder: string;  // Tailwind hover border: "hover:border-orange-500/50"
  description: string;  // One-line tool description
  billingUrl: string;   // External link to usage/billing page
}
```

**Renders**: A single tool launch card. Includes:
- Icon square (9x9, rounded, with tool letter + brand color)
- Tool name + description
- Launch button (terminal icon on right side)
- Small "Check usage" link below

**State**: None local.

**Reads from context**: `projectPath`, `setSyncStatus`

**API calls**: `POST /api/terminal` with `{ command, projectPath }`

**Behavior**: Clicking the card calls `spawnTerminal`. If no `projectPath`, shows a status message "Connect a workspace first".

---

### 4.8 `components/GhostAgent.tsx` — Quick Task (Headless) Panel (NEW - extracted from page.tsx)

**Props**:
```typescript
interface GhostAgentProps {
  projectPath: string;
  setSyncStatus: (msg: string | null) => void;
}
```

**Renders**: The ghost agent panel with:
- Header: "Quick Task (Headless)" label + model selector dropdown
- Output area (scrollable `<pre>`)
- Input form: text input + "Run Task" button

**State** (local):
- `ghostPrompt: string`
- `ghostModel: string` (default: `'gemini'`)
- `isRunning: boolean`
- `output: string`

**API calls**: `POST /api/ghost` with `{ model, prompt, projectPath }` — streams response via ReadableStream.

**Model options** (unchanged): `gemini`, `claude`, `opencode`, `codex`

---

### 4.9 `components/AgentTeams.tsx` — Agent Teams Panel (EXISTING - minor updates)

**Props** (unchanged):
```typescript
interface AgentTeamsProps {
  projectPath: string;
  setSyncStatus: (msg: string | null) => void;
}
```

No structural changes. This component is already well-organized with tabs (Launch, Split-Pane Setup, How It Works). Keep all existing functionality. Minor terminology updates only:
- "Deploying Team..." -> "Starting Team..."
- "Deploy headless agent team..." -> "Running headless agent team..."

**API calls** (unchanged): All go to `POST /api/agent-teams` with various `action` values.

---

## 5. Layout Design

### `app/layout.tsx` Structure

```
<html lang="en" class="dark">
  <body class="antialiased h-screen flex bg-[#09090b] text-zinc-50 font-sans">
    <WorkspaceProvider>

      <!-- Sidebar: 260px fixed -->
      <aside class="w-[260px] flex-shrink-0 flex flex-col border-r border-[#27272a] bg-[#09090b]">

        <!-- Logo area: h-14 -->
        <div class="h-14 flex items-center px-4 border-b border-[#27272a] mb-2">
          <Bot size={16} /> OmniAgent Studio
        </div>

        <!-- Nav section label -->
        <div class="text-[10px] uppercase tracking-widest text-zinc-500 px-5 mt-2 mb-2">
          Menu
        </div>

        <!-- Nav links -->
        <nav class="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          <!-- Each: Link with icon + label -->
          <!-- Active: bg-zinc-800/50 text-zinc-200 -->
          <!-- Inactive: text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 -->
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-[#27272a] flex items-center justify-between">
          <span class="text-[11px] text-zinc-500">v1.1.0</span>
          <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        <!-- Breadcrumb header: h-14 sticky top-0 -->
        <header class="h-14 border-b border-[#27272a] flex items-center justify-between px-6 bg-[#09090b] sticky top-0 z-20">
          <!-- Left: breadcrumb showing current workspace path -->
          <!-- Right: StatusToast + HelpCircle button -->
        </header>

        <Suspense fallback={...}>
          {children}
        </Suspense>
      </main>

    </WorkspaceProvider>
  </body>
</html>
```

The breadcrumb header lives in `layout.tsx` (not in each page), since it shows the workspace path which is global. The `HelpCircle` button and `StatusToast` are also in the header.

---

## 6. Page Designs

### 6.1 Home Page (`app/page.tsx` — route `/`)

**Purpose**: Connect a workspace, see welcome/onboarding if first visit.

**Structure**:

```
<div class="flex-1 p-6 flex flex-col gap-6 max-w-[900px] mx-auto" style={{ overflowY: 'auto' }}>

  <!-- WorkspaceSelector -->
  <WorkspaceSelector onConnect={handleConnect} />

  <!-- Welcome section (shown when NO projectPath) -->
  {!projectPath && (
    <WelcomeSection />
  )}

  <!-- Connected state (shown when projectPath exists) -->
  {projectPath && (
    <QuickActions />
  )}

</div>
```

#### Welcome Section (empty state, no workspace connected)

A centered card with:
- Heading: "Welcome to OmniAgent Studio"
- Subtitle: "Connect a project workspace to get started. This app helps you coordinate multiple AI coding tools with a shared context file."
- Three-step guide (styled as a horizontal row of cards):
  1. **Connect** -- "Point to your project folder using the input above"
  2. **Write Context** -- "Create shared instructions that all AI tools will read"
  3. **Launch Tools** -- "Open AI terminals or run background tasks"
- Button: "Learn More" (opens HowToUse modal)

Style: Use `bg-[#18181b] border border-[#27272a] rounded-xl p-8` for the welcome card. Step cards: `bg-[#121214] border border-[#27272a] rounded-lg p-4`. Keep it visually light and inviting.

#### Quick Actions (workspace connected)

A row of 3-4 large action cards:
- **Edit Context** -> navigates to `/context` -- icon: `FileText`, accent: emerald
- **Launch AI Tools** -> navigates to `/tools` -- icon: `Terminal`, accent: blue
- **Run Quick Task** -> navigates to `/agents` -- icon: `Bot`, accent: violet
- **Save Session** -> navigates to `/sessions` -- icon: `FolderGit2`, accent: amber

Each card: `bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-[accent]/50 transition-all cursor-pointer`. Include the icon, title, and one-line description.

Use `<Link>` from `next/link` for navigation.

---

### 6.2 Shared Context Page (`app/context/page.tsx` — route `/context`)

**Purpose**: Edit and sync the shared AI context file.

**Structure**:

```
<div class="flex-1 p-6 flex flex-col gap-6 max-w-[1200px] mx-auto" style={{ overflowY: 'auto' }}>

  <!-- Context Editor Panel -->
  <div class="flex-1 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden max-h-[700px]">

    <!-- Toolbar -->
    <div class="h-12 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <FileText size={15} class="text-zinc-500" />
          Shared AI Context
        </div>
        <div class="flex items-center gap-2 text-[11px] font-mono text-zinc-600 hidden sm:flex">
          <span>.gemini.md</span>
          <span>.claude.md</span>
          <span>agents.md</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Generate Template button -->
        <button> <Wand2 /> Template </button>
        <!-- Save & Sync button -->
        <button> <Save /> Save & Sync </button>
      </div>
    </div>

    <!-- Textarea -->
    <div class="flex-1 relative bg-[#09090b]">
      <textarea class="absolute inset-0 w-full h-full ..." />
    </div>
  </div>

</div>
```

**State** (local to this page):
- `contextData: string`
- `isLoadingContext: boolean`
- `isSyncing: boolean`

**API calls**:
- `POST /api/context` `{ action: 'read', projectPath }` -- on mount if projectPath exists
- `POST /api/context` `{ action: 'sync', projectPath, content }` -- on Save & Sync click
- `POST /api/analyze` `{ projectPath }` -- on Template button click

**Empty state**: If no `projectPath` in context, show a message: "Connect a workspace on the Home page to edit your shared context." with a Link to `/`.

---

### 6.3 AI Tools Page (`app/tools/page.tsx` — route `/tools`)

**Purpose**: Launch interactive AI tool terminals.

**Structure**:

```
<div class="flex-1 p-6 flex flex-col gap-6 max-w-[900px] mx-auto" style={{ overflowY: 'auto' }}>

  <!-- Page heading -->
  <div>
    <h2 class="text-lg font-semibold text-zinc-100">AI Tools</h2>
    <p class="text-sm text-zinc-500 mt-1">
      Launch an AI coding assistant in a new terminal window. Each tool reads your shared context file automatically.
    </p>
  </div>

  <!-- Tool cards grid: 1 col on mobile, 2 cols on md+ -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <ToolCard id="claude" name="Claude Code" ... />
    <ToolCard id="gemini" name="Gemini CLI" ... />
    <ToolCard id="opencode" name="Open Code" ... />
    <ToolCard id="codex" name="OpenAI Codex" ... />
  </div>

</div>
```

**Tool definitions** (data, not components):
```typescript
const tools = [
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    icon: 'C',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    hoverBorder: 'hover:border-orange-500/50',
    description: "Anthropic's flagship coding agent. Excellent for deep logic.",
    billingUrl: 'https://console.anthropic.com/settings/billing',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    icon: 'G',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    hoverBorder: 'hover:border-blue-500/50',
    description: "Google's massive context terminal wrapper.",
    billingUrl: 'https://aistudio.google.com/app/plan_information',
  },
  {
    id: 'opencode',
    name: 'Open Code',
    command: 'opencode',
    icon: 'O',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    hoverBorder: 'hover:border-emerald-500/50',
    description: 'Open-source autonomous framework CLI.',
    billingUrl: 'https://opencode.ai/docs/cli/',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    command: 'codex',
    icon: 'X',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-400/10',
    hoverBorder: 'hover:border-zinc-500/50',
    description: "OpenAI's terminal agent powered by o3/gpt-4o.",
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
  },
];
```

**Empty state**: If no `projectPath`, show: "Connect a workspace on the Home page to launch tools." with a Link to `/`.

---

### 6.4 Agents Page (`app/agents/page.tsx` — route `/agents`)

**Purpose**: Run headless quick tasks and manage Agent Teams.

**Structure**:

```
<div class="flex-1 p-6 flex flex-col gap-6 max-w-[1200px] mx-auto" style={{ overflowY: 'auto' }}>

  <!-- Page heading -->
  <div>
    <h2 class="text-lg font-semibold text-zinc-100">Agents</h2>
    <p class="text-sm text-zinc-500 mt-1">
      Run background AI tasks or orchestrate multi-agent teams.
    </p>
  </div>

  <!-- Quick Task (Headless) section -->
  <GhostAgent projectPath={projectPath} setSyncStatus={setSyncStatus} />

  <!-- Agent Teams section -->
  <AgentTeams projectPath={projectPath} setSyncStatus={setSyncStatus} />

</div>
```

**Empty state**: If no `projectPath`, show: "Connect a workspace on the Home page to use agents." with a Link to `/`.

---

### 6.5 Sessions Page (`app/sessions/page.tsx` — route `/sessions`)

**Purpose**: Commit current workspace state via git.

**Structure**:

```
<div class="flex-1 p-6 flex flex-col gap-6 max-w-[700px] mx-auto" style={{ overflowY: 'auto' }}>

  <!-- Page heading -->
  <div>
    <h2 class="text-lg font-semibold text-zinc-100">Session Manager</h2>
    <p class="text-sm text-zinc-500 mt-1">
      Commits all changes in your workspace via git. Use this to save a snapshot of your progress after an AI session.
    </p>
  </div>

  <!-- Commit card -->
  <div class="bg-[#18181b] border border-[#27272a] rounded-xl p-6">

    <!-- Last commit message (if any) -->
    <AnimatePresence>
      {lastCommitMsg && (
        <motion.div ...>
          <CheckCircle2 /> {lastCommitMsg}
        </motion.div>
      )}
    </AnimatePresence>

    <!-- Save Session button -->
    <button class="w-full py-3 bg-zinc-800 hover:bg-zinc-700 ...">
      {isCommitting ? <Loader2 class="animate-spin" /> : 'Save Session'}
    </button>
  </div>

</div>
```

**State** (local):
- `isCommitting: boolean`
- `lastCommitMsg: string | null`

**API calls**: `POST /api/commit` with `{ projectPath }`

**Empty state**: If no `projectPath`, show: "Connect a workspace on the Home page to manage sessions." with a Link to `/`.

---

## 7. Welcome/Onboarding Flow

### First-time user experience:

1. **User opens app** -> lands on `/` (Home page).
2. **No workspace connected** -> The WorkspaceSelector is at the top but empty. Below it, the Welcome Section renders with:
   - A clear heading explaining what the app does
   - Three visual steps showing the workflow
   - A "Learn More" button linking to the HowToUse modal
3. **User connects a workspace** (types path or uses folder browser) -> Welcome Section is replaced by Quick Actions cards.
4. **Sidebar nav items** are always visible and clickable, but each page shows an empty-state message when `projectPath` is empty, guiding the user back to Home to connect first.

### The HelpCircle button in the header

Keep the `HelpCircle` button in the top header bar (right side). Clicking it opens the `HowToUse` modal. This is always accessible from any page.

---

## 8. Color & Style System

### Existing Design Tokens (from globals.css -- keep all)

```css
:root {
  --background: #09090b;        /* zinc-950 -- app background */
  --foreground: #fafafa;        /* zinc-50  -- primary text */
  --muted: #27272a;             /* zinc-800 -- borders, dividers */
  --muted-foreground: #a1a1aa;  /* zinc-400 -- secondary text */
  --border: #27272a;            /* zinc-800 -- card/panel borders */
  --accent: #18181b;            /* zinc-900 -- card backgrounds */
  --accent-foreground: #fafafa;

  --brand-claude: #d97757;      /* Orange -- Claude Code */
  --brand-gemini: #4285f4;      /* Blue -- Gemini */
  --brand-opencode: #10b981;    /* Emerald -- OpenCode */
}
```

### Surface Hierarchy

| Level | Background | Use |
|-------|-----------|-----|
| L0 (deepest) | `#09090b` (zinc-950) | App background, textarea backgrounds |
| L1 (card) | `#18181b` (zinc-900) | Cards, panels, inputs |
| L2 (header) | `#121214` | Panel headers, toolbar bars |
| L3 (elevated) | `#1a1a1d` | Hover states on cards |

### Accent Colors by Feature

| Feature | Color | Tailwind Class | Use |
|---------|-------|---------------|-----|
| Claude Code | Orange | `text-orange-400`, `bg-orange-400/10` | Tool card, Agent Teams |
| Gemini CLI | Blue | `text-blue-400`, `bg-blue-400/10` | Tool card |
| OpenCode | Emerald | `text-emerald-400`, `bg-emerald-400/10` | Tool card, success states |
| Codex | Zinc | `text-zinc-300`, `bg-zinc-400/10` | Tool card |
| Ghost/Quick Tasks | Violet | `text-violet-400`, `bg-violet-500/10` | Quick Task panel |
| Sessions | Amber | `text-amber-400` | Session page icon |
| Success | Emerald | `text-emerald-400/500` | Checkmarks, status dots |
| Error | Red | `text-red-400` | Error messages |

### Typography

- Font family: `'Inter', system-ui, sans-serif`
- Mono font: system `font-mono` (used for paths, code, terminal output)
- Page headings: `text-lg font-semibold text-zinc-100`
- Page subtitles: `text-sm text-zinc-500`
- Section headings: `text-sm font-medium text-zinc-200`
- Body text: `text-[13px] text-zinc-400 leading-relaxed`
- Labels: `text-[10px] font-semibold text-zinc-600 uppercase tracking-wider`
- Tiny text: `text-[11px] text-zinc-500`

### Button Styles

| Type | Style |
|------|-------|
| Primary (CTA) | `bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold` |
| Secondary | `bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold` |
| Ghost | `hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md text-xs font-medium border border-transparent hover:border-zinc-700` |
| Accent (violet) | `bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-lg text-xs font-semibold` |
| Accent (orange) | `bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm font-semibold` |
| Disabled | Add `disabled:opacity-50 disabled:cursor-not-allowed` |

### Animations (framer-motion)

Keep existing patterns:
- Modal entrance: `initial={{ opacity: 0, scale: 0.95, y: 10 }}` `animate={{ opacity: 1, scale: 1, y: 0 }}`
- Status toast: `initial={{ opacity: 0, y: -5 }}` `animate={{ opacity: 1, y: 0 }}`
- Collapse/expand: `initial={{ height: 0, opacity: 0 }}` `animate={{ height: 'auto', opacity: 1 }}`
- Transition timing: `duration: 0.15` for modals, `duration: 0.2` for collapse

### Utility Classes (from globals.css -- keep all)

- `.app-border` -- applies `border-color: var(--border)`
- `.subtle-ring:focus-within` -- focus ring with `box-shadow`
- `.premium-shadow` -- deep shadow for elevated cards
- Custom scrollbar styling (6px, zinc-700 thumb)

---

## 9. State Management Architecture

### Global State (React Context)

Use a single `WorkspaceContext` provided by `WorkspaceProvider` in `layout.tsx`.

```typescript
// components/WorkspaceProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WorkspaceContextValue {
  projectPath: string;
  setProjectPath: (path: string) => void;
  recentPaths: string[];
  addRecentPath: (path: string) => void;
  syncStatus: string | null;
  setSyncStatus: (msg: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projectPath, setProjectPath] = useState('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [syncStatus, setSyncStatusRaw] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('omniagent_recent_paths');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentPaths(parsed);
        if (parsed.length > 0) setProjectPath(parsed[0]);
      } catch {}
    }
  }, []);

  const addRecentPath = useCallback((path: string) => {
    setRecentPaths(prev => {
      const next = [path, ...prev.filter(p => p !== path)].slice(0, 5);
      localStorage.setItem('omniagent_recent_paths', JSON.stringify(next));
      return next;
    });
  }, []);

  const setSyncStatus = useCallback((msg: string | null) => {
    setSyncStatusRaw(msg);
    if (msg) {
      setTimeout(() => setSyncStatusRaw(null), 3000);
    }
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      projectPath, setProjectPath,
      recentPaths, addRecentPath,
      syncStatus, setSyncStatus,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
```

### Page-Local State

Each page manages its own form/loading state:

| Page | Local State |
|------|-------------|
| `/context` | `contextData`, `isLoadingContext`, `isSyncing` |
| `/tools` | None (ToolCard is stateless aside from the spawn call) |
| `/agents` | Ghost agent state lives in `GhostAgent` component; Agent Teams state lives in `AgentTeams` component |
| `/sessions` | `isCommitting`, `lastCommitMsg` |

### Cross-Page Shared State

Only `projectPath`, `recentPaths`, and `syncStatus` need to be shared across pages. All live in `WorkspaceContext`.

---

## 10. API Contract Reference

### `POST /api/context`

**Used by**: Context page (`/context`), WorkspaceSelector on connect

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `action` | `'read' \| 'sync'` | Read existing context or write new content |
| `projectPath` | `string` | Absolute path to workspace |
| `content` | `string` (sync only) | Markdown content to write |
| **Response (read)** | | |
| `content` | `string` | Content of the first found context file |
| **Response (sync)** | | |
| `success` | `boolean` | |
| `results` | `Array<{ file: string, status: string, message?: string }>` | Per-file write results |

Writes identical content to `.gemini.md`, `.claude.md`, and `agents.md`.

---

### `POST /api/analyze`

**Used by**: Context page (Template button)

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `projectPath` | `string` | Absolute path to workspace |
| **Response** | | |
| `success` | `boolean` | |
| `techStack` | `{ framework, styling, language, database, packageManager }` | All strings |
| `folderStructure` | `string` | Visual directory tree |

---

### `POST /api/terminal`

**Used by**: ToolCard component

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `command` | `'claude' \| 'gemini' \| 'opencode' \| 'codex'` | Tool to launch |
| `projectPath` | `string` | Absolute path to workspace |
| **Response** | | |
| `success` | `boolean` | |
| `message` | `string` | Confirmation message |

Opens a new `cmd.exe` window on Windows with the tool running inside it. Auto-installs if not found.

---

### `POST /api/ghost`

**Used by**: GhostAgent component

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `model` | `'claude' \| 'gemini' \| 'opencode' \| 'codex'` | AI model to run |
| `prompt` | `string` | Task prompt |
| `projectPath` | `string` | Absolute path to workspace |
| **Response** | | |
| (streaming) | `text/plain` | Streamed output via ReadableStream |

Returns a streaming `text/plain` response. Client reads via `res.body.getReader()`.

---

### `POST /api/commit`

**Used by**: Sessions page

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `projectPath` | `string` | Absolute path to workspace |
| `message` | `string` (optional) | Custom commit message. Defaults to `Session close: <ISO timestamp>` |
| **Response** | | |
| `success` | `boolean` | |
| `message` | `string` | Git output or "nothing to commit" |

Runs `git add . && git commit`. Initializes git repo if not already one.

---

### `POST /api/fs`

**Used by**: FolderBrowser component

| Field | Type | Description |
|-------|------|-------------|
| **Request** | | |
| `path` | `string` (optional) | Directory to read. Defaults to `os.homedir()` |
| **Response** | | |
| `currentPath` | `string` | Resolved absolute path |
| `parentPath` | `string \| null` | Parent directory, null if at root |
| `directories` | `Array<{ name: string, path: string }>` | Subdirectories (hidden dirs excluded) |

---

### `POST /api/agent-teams`

**Used by**: AgentTeams component

Multiplex endpoint. The `action` field determines behavior:

| Action | Additional Fields | Response | Description |
|--------|-------------------|----------|-------------|
| `enable` | (none) | `{ success, path }` | Writes `experimental.agentTeams: true` to `~/.claude/settings.json` |
| `install-skill` | `projectPath` | `{ success, path }` | Writes orchestration prompt to `.claude/commands/build-with-agent-team.md` |
| `launch-terminal` | `projectPath`, `plan`, `agentCount?` | `{ success, mode }` | Opens interactive Claude Code terminal. Mode: `wt-tmux`, `cmd-tmux`, `wt-cmd`, or `cmd` |
| `launch-headless` | `projectPath`, `plan`, `agentCount?` | Streaming `text/plain` | Runs Claude Code headlessly, streams output |
| `check-wsl` | (none) | `{ wslAvailable, distroInstalled, tmuxInstalled }` | Checks WSL/tmux status |
| `install-wsl` | (none) | `{ success, message }` | Triggers elevated WSL install |
| `install-tmux` | (none) | Streaming `text/plain` | Installs tmux inside WSL via apt |

---

## 11. File Structure (New)

```
app/
  layout.tsx              -- Root layout with sidebar + WorkspaceProvider
  page.tsx                -- Home page (workspace selector + welcome/quick actions)
  globals.css             -- Design tokens + base styles (unchanged)
  context/
    page.tsx              -- Shared Context editor page
  tools/
    page.tsx              -- AI Tools launcher page
  agents/
    page.tsx              -- Agents page (ghost + teams)
  sessions/
    page.tsx              -- Session manager page
  api/                    -- ALL UNCHANGED
    analyze/route.ts
    agent-teams/route.ts
    commit/route.ts
    context/route.ts
    fs/route.ts
    ghost/route.ts
    terminal/route.ts

components/
  WorkspaceProvider.tsx   -- NEW: React Context for global state
  WorkspaceSelector.tsx   -- NEW: Extracted workspace input bar
  StatusToast.tsx         -- NEW: Extracted status indicator
  ToolCard.tsx            -- NEW: Individual tool launch card
  GhostAgent.tsx          -- NEW: Extracted ghost agent panel
  FolderBrowser.tsx       -- EXISTING: Minor style updates
  HowToUse.tsx            -- EXISTING: Terminology updates
  AgentTeams.tsx          -- EXISTING: Minor terminology updates

scripts/
  setup.ts                -- UNCHANGED
```

---

## 12. Migration Notes for Builders

### What page.tsx (617 lines) becomes:

The monolithic `page.tsx` is decomposed as follows:

| Old Location (page.tsx lines) | New Location |
|------|------|
| `projectPath`, `recentPaths`, `syncStatus` state | `WorkspaceProvider.tsx` |
| Workspace input bar (lines 327-406) | `WorkspaceSelector.tsx` |
| Status toast in header (lines 299-311) | `StatusToast.tsx` |
| Context editor (lines 411-454) | `app/context/page.tsx` |
| Generate template handler (lines 102-168) | `app/context/page.tsx` |
| Sync context handler (lines 170-192) | `app/context/page.tsx` |
| Tool launcher cards (lines 510-561) | `ToolCard.tsx` + `app/tools/page.tsx` |
| `spawnTerminal` function (lines 194-213) | `ToolCard.tsx` (inline or shared util) |
| Ghost agent panel (lines 456-503) | `GhostAgent.tsx` |
| Ghost agent handlers (lines 215-262) | `GhostAgent.tsx` |
| Agent Teams (line 506) | `app/agents/page.tsx` (imports `AgentTeams.tsx`) |
| Session controller (lines 563-594) | `app/sessions/page.tsx` |
| Commit handler (lines 264-285) | `app/sessions/page.tsx` |
| FolderBrowser modal (lines 600-608) | Mounted in `WorkspaceSelector.tsx` |
| HowToUse modal (lines 610-613) | Mounted in `layout.tsx` header |
| Header bar (lines 291-321) | `layout.tsx` |

### Key Constraints

1. **ALL API routes are frozen** -- do not modify anything in `app/api/`.
2. **Keep framer-motion** for all animations.
3. **Keep lucide-react** for all icons.
4. **Keep tailwindcss v4** -- no config file needed, just `@import "tailwindcss"` in globals.css.
5. **No new dependencies** -- only use what's in `package.json`.
6. **Every page must be `'use client'`** since they use hooks, context, and browser APIs.
7. **localStorage key `omniagent_recent_paths`** must remain the same for backward compatibility.
