'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import { FileText, Save, Loader2, Home, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';
import { useAudioNotification } from '@/components/ui/useAudioNotification';

const AUTO_SAVE_DELAY_MS = 2000;
// Must match MAX_MAP_BYTES in app/api/context/route.ts
const MAX_MAP_BYTES = 40_000;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

async function buildTemplate(projectPath: string, packageManager: string): Promise<string> {
  let analysis = {
    framework: 'Unknown',
    styling: 'Unknown',
    language: 'Unknown',
    database: 'Unknown',
    packageManager,
  };
  let folderStructure = 'No specific structure detected.';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        analysis = data.techStack;
        folderStructure = data.folderStructure || folderStructure;
      }
    }
  } catch {
    // analysis stays at defaults — template still generates
  }

  const isSoftwareProject = analysis.language !== 'Unknown' || analysis.framework !== 'Unknown';
  const projectName = projectPath.split(/[\\/]/).filter(Boolean).pop() || '[project name]';

  const stackLine = isSoftwareProject
    ? `Stack: ${analysis.language} · ${analysis.framework} · ${analysis.styling} · ${analysis.database} · ${analysis.packageManager}\n`
    : '';

  // Short-map format (Jake Van Clief): this file loads every session, so it holds
  // only identity, where things are, routing and rules. History, goals and long
  // lessons live in _agent-tasks/ (created by /api/context on first save).
  return `# ${projectName} — map and rules

[One or two sentences: what this project is, who it is for, and any hard limits.]
${stackLine}This file loads every session, so it holds only rules and where to look. History lives in \`_agent-tasks/\` (see Logging).

## Where things are
Top-level folders (cut this to one line each: what lives there):
\`\`\`
${folderStructure}
\`\`\`
- \`_agent-tasks/\` — \`SESSION_LOG.md\` (history, one line per task), \`ACTIVE_GOALS.md\` (open work),
  \`LESSONS_FULL.md\` (long lessons), one \`AGENT_TASKS_*.md\` per agent-team run.
- Never read unless asked: [archives, old versions, generated or vendored folders].

## Routing: job → read first → skill
| Job | Read first | Use |
|---|---|---|
| "What did we do before / where is X" | grep \`_agent-tasks/SESSION_LOG.md\` (never read it whole) | — |
| Open goals | \`_agent-tasks/ACTIVE_GOALS.md\` | \`/ralph\` works through them |
| Big multi-part work | — | \`/build-with-agent-team\` (see Agents) |
| Check a claim | — | \`/fact-check\` |
| End of a session | — | \`/checkpoint\` |
| [a job you do often] | [the file or folder to read first] | [skill] |

## Working rules
<!-- Edit these before your first session. Add, remove, or replace as needed. -->
1. Never delete, overwrite, or publish anything without explicit permission. Back up before overwriting.
2. Never produce placeholder content. Finish what you start.
3. When unsure, ask one specific question rather than guess.
4. [Add a project rule, e.g. "Use British English" / "All commands use ${analysis.packageManager}"]

## Epistemic standards
- Accuracy over speed. If it can't be verified, say so. Never fabricate.
- Retrieve from primary sources before time-sensitive claims, and cite them.
- Label facts vs interpretation; state confidence and what is unknown.
- When sources disagree, show both and say what would settle it.
- Recommendations state criteria, tradeoffs, and why this option wins. Lead with the answer.

## Agents
- One agent first. Spawn a team only when parts are independent and parallel, or verbose enough to bury the
  lead's context, or when an independent review lens is worth it.
- Each agent writes one output file (its contract). An idle agent has not necessarily written it: check the file.
- The agent that writes a final must not be its only checker.

## Lessons (one line each; full text in \`_agent-tasks/LESSONS_FULL.md\`)
<!-- After a correction, add one line here only if it is a standing rule: what to do next time. -->

## Logging
After finishing a task, without being asked:
1. Append ONE line (≤300 chars) to the END of \`_agent-tasks/SESSION_LOG.md\`:
   \`YYYY-MM-DD · [how: manual | /skill] · [what was done] · [main file or decision]\`. Details go in notes or docs.
2. Update \`_agent-tasks/ACTIVE_GOALS.md\` if a goal opened or closed.
3. After a correction: one line in "Lessons" above if it is a standing rule; the full story goes in
   \`_agent-tasks/LESSONS_FULL.md\`. Rules for one sub-folder go in that folder's own \`AGENTS.md\`.
4. Edit this file only for a rule or map change, and keep it under ~150 lines.
\`.claude.md\` and \`.gemini.md\` are copies of this file for other tools. Edit \`AGENTS.md\` (or save it on the
OmniAgent Studio context page), then copy it over them. Never copy them back onto \`AGENTS.md\`.

## MCP tools (prefer these; fall back instead of stopping)
- Connected MCP servers expose tools named \`mcp__<server>__*\`. Use them when the task matches, and say which you used.
- On a rate limit, quota or auth error, fall back (another search or scrape server, then a plain fetch) and keep going.

<!-- MCP-LIST:START - sync-mcp-context.ps1 fills this table -->
<!-- MCP-LIST:END -->
`;
}

export default function ContextPage() {
  const { projectPath, setSyncStatus, addRecentPath } = useWorkspace();
  const chime = useAudioNotification();
  const [contextData, setContextData] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>('');

  // Restore banner dismissed state from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBannerDismissed(localStorage.getItem('omni-context-banner-dismissed') === 'true');
    }
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('omni-context-banner-dismissed', 'true');
  };

  const handleLoadContext = useCallback(async (pathToLoad: string) => {
    if (!pathToLoad) return;

    setIsLoadingContext(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', projectPath: pathToLoad }),
      });
      const data = await res.json();
      if (res.ok) {
        addRecentPath(pathToLoad);

        if (data.content && data.content.trim().length > 0) {
          // Existing content — load it as-is
          setContextData(data.content);
          lastSavedContent.current = data.content;
          setSaveState('saved');
          setSyncStatus('Context loaded');
        } else {
          // No content yet — auto-generate and save the template
          setSyncStatus('Setting up context…');
          const template = await buildTemplate(pathToLoad, 'npm');
          setContextData(template);
          lastSavedContent.current = '';
          setSaveState('dirty');
          // Immediately sync so AGENTS.md (+ its copies) and the _agent-tasks/ starter files are written
          const ok = await syncContent(template, pathToLoad, true);
          setSyncStatus(ok ? 'Context ready' : 'Context not saved');
        }
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch {
      setSyncStatus('Failed loading context');
    } finally {
      setIsLoadingContext(false);
    }
  }, [addRecentPath, setSyncStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load context whenever projectPath changes
  useEffect(() => {
    if (projectPath) {
      handleLoadContext(projectPath);
    }
  }, [projectPath, handleLoadContext]);

  // initProject: also create _agent-tasks/SESSION_LOG.md, ACTIVE_GOALS.md and LESSONS_FULL.md if missing
  const syncContent = async (content: string, path: string, initProject = false): Promise<boolean> => {
    if (content === lastSavedContent.current) return true;
    setSaveState('saving');
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', projectPath: path, content, initProject }),
      });
      if (res.ok) {
        lastSavedContent.current = content;
        setSaveState('saved');
        setSaveError(null);
        return true;
      }
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error || `Save failed (HTTP ${res.status})`);
      setSaveState('dirty');
      return false;
    } catch {
      setSaveError('Save failed: the Studio server did not answer.');
      setSaveState('dirty');
      return false;
    }
  };

  const syncToFiles = useCallback(async (content: string, initProject = false) => {
    return syncContent(content, projectPath, initProject);
  }, [projectPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContextChange = (value: string) => {
    setContextData(value);
    setSaveState('dirty');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      syncToFiles(value);
    }, AUTO_SAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleResetToTemplate = async () => {
    if (!confirm('Reset to template? This will replace the current content with a fresh template. This cannot be undone.')) return;
    const template = await buildTemplate(projectPath, 'npm');
    setContextData(template);
    setSaveState('dirty');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => syncToFiles(template, true), AUTO_SAVE_DELAY_MS);
  };

  const handleSyncContext = async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const ok = await syncToFiles(contextData);
      setSyncStatus(ok ? 'Context saved' : 'Context not saved');
      if (ok) chime();
    } finally {
      setIsSyncing(false);
    }
  };

  const mapBytes = new TextEncoder().encode(contextData).length;

  // Empty state
  if (!projectPath) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <FileText size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Connect a workspace on the Home page to edit your shared context.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold px-4 py-2 transition-colors"
        >
          <Home size={14} />
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        {!bannerDismissed && (
          <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-4 flex items-start gap-3">
            <div id="context-banner-text" className="flex-1 text-[13px] text-zinc-400 leading-relaxed">
              This is your project map (AGENTS.md). Keep it short: what the project is, where things are, which file to read for which job, and the rules. Every AI tool you launch reads it at the start of each session. History goes in _agent-tasks/SESSION_LOG.md and open goals in _agent-tasks/ACTIVE_GOALS.md, not here.
            </div>
            <button
              onClick={dismissBanner}
              className="shrink-0 p-1 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Dismiss banner"
              aria-describedby="context-banner-text"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {saveError && (
          <div role="alert" className="border border-red-500/30 bg-red-500/5 rounded-lg p-4 text-[13px] text-red-300 leading-relaxed">
            {saveError}
          </div>
        )}

        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl flex flex-col overflow-hidden h-[70dvh] min-h-[300px]">
          {/* Toolbar */}
          <div className="h-12 border-b border-[var(--c-border)] bg-[var(--c-inset)] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <FileText size={15} className="text-zinc-500" />
                Shared AI Context
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 hidden sm:flex">
                <span className="text-zinc-400">AGENTS.md</span>
                <span>→ .claude.md · .gemini.md</span>
                <span className={mapBytes > MAX_MAP_BYTES ? 'text-red-400' : mapBytes > MAX_MAP_BYTES * 0.75 ? 'text-amber-400' : ''}>
                  {(mapBytes / 1000).toFixed(1)} / {MAX_MAP_BYTES / 1000} KB
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetToTemplate}
                disabled={!projectPath}
                title="Reset to template"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-all border border-transparent hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              {saveState === 'dirty' && (
                <span className="text-[10px] text-zinc-600 font-medium">Unsaved…</span>
              )}
              {saveState === 'saving' && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                  <Loader2 size={10} className="animate-spin" />
                  Saving…
                </span>
              )}
              {saveState === 'saved' && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                  <CheckCircle2 size={10} />
                  All agents synced
                </span>
              )}
              <button
                onClick={handleSyncContext}
                disabled={isSyncing || !projectPath || saveState === 'saved'}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} className="group-hover:text-emerald-400 transition-colors" />
                )}
                Save & Sync
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 relative bg-[var(--c-bg)]">
            {isLoadingContext ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : (
              <textarea
                aria-label="Shared AI context editor"
                className="absolute inset-0 w-full h-full bg-transparent resize-none p-5 text-[13px] leading-relaxed font-mono text-zinc-300 focus:outline-none"
                value={contextData}
                onChange={(e) => handleContextChange(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
