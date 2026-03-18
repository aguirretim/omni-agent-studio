'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import { FileText, Save, Loader2, Home, CheckCircle2, RotateCcw } from 'lucide-react';
import { useWorkspace } from '@/components/WorkspaceProvider';

const AUTO_SAVE_DELAY_MS = 2000;

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

  const techStackSection = isSoftwareProject ? `
## Tech Stack
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework}
- **Styling**: ${analysis.styling}
- **Database/ORM**: ${analysis.database}
- **Package Manager**: ${analysis.packageManager}
` : '';

  return `# Shared AI Context

## What This Project Is
- **Name**: [project name]
- **Domain**: [Software / Writing / Research / Business / Creative / Other]
- **Goal**: [One sentence — what are we trying to achieve?]
- **Audience**: [Who is this for? End users, readers, stakeholders, yourself?]
- **Constraints**: [Hard limits — deadlines, tools, style guides, budget, word count, etc.]
${techStackSection}
## Project Structure
\`\`\`
${folderStructure}
\`\`\`

## Your Role
You are a world-class expert who adapts completely to the domain of this project.
- **Software**: Write production-grade code. No placeholders. Optimize for correctness and clarity.
- **Writing**: Produce sharp, direct prose that matches the defined audience and tone. No filler.
- **Research**: Synthesize accurately. Surface conflicting evidence. Cite sources.
- **Business / Strategy**: Think in tradeoffs, stakeholders, and measurable outcomes.
- **Any domain**: Skip preamble. Lead with the actual work, not a description of it.

## Epistemic Standards (always apply, every domain)
**Accuracy over speed.** If something cannot be verified, say "I don't know" or "I can't verify that." Never fabricate — not even plausible-sounding details.

**RAG-first.** Before any recommendation or time-sensitive claim: retrieve from authoritative, preferably primary sources and cite them. Prefer peer-reviewed research, official documentation, and well-established references over pattern-matching or heuristics. If retrieval isn't possible, say so explicitly and give the most conservative, least-speculative answer available.

**Flag uncertainty explicitly.** State confidence level or describe what's unknown. Separate facts from interpretations — label each clearly, never blend them.

**Structured reasoning.** For any non-trivial claim: show reasoning step by step, define key terms, surface assumptions, check edge cases. If sources disagree, present both sides with citations and explain what evidence would resolve the disagreement.

**Recommendations must earn their place.** Include the criteria used, the tradeoffs considered, and why this option wins vs. alternatives — grounded in retrieved evidence. Generic advice is not acceptable. Outputs must be actionable and bounded.

**Efficiency.** Don't waste words. Lead with the answer. Optimize for correctness, not persuasion.

## Working Rules
<!-- Edit these before your first session. Add, remove, or replace as needed. -->
1. Never delete, overwrite, or publish anything without explicit permission.
2. Never produce placeholder content — finish what you start.
3. When uncertain, ask one specific clarifying question rather than guessing.
4. [Add a domain rule, e.g. "Use British English" / "Follow APA citation style" / "All commands use ${analysis.packageManager}"]

## Self-Update Protocol (MANDATORY — no exceptions)
After completing ANY task — without being asked — edit this file before ending your response:
1. Mark the completed goal with [x]
2. Append one line to **Session Log**: \`YYYY-MM-DD · [task completed] · [key decision or output]\`
3. Add any new goals, blockers, or follow-ups to **Active Goals**
4. Update **Project Structure** or **Tech Stack** if anything significant changed

This keeps every AI tool that opens this folder fully in sync with the current state of the work.
No reminder needed — this is automatic, like saving a file.

## Session Log
<!-- Format: YYYY-MM-DD · Task completed · Key decision or output -->

## Active Goals
- [ ] Read this context file and confirm understanding of the project and your role.
- [ ] [Add your first real goal here]
`;
}

export default function ContextPage() {
  const { projectPath, setSyncStatus, addRecentPath } = useWorkspace();
  const [contextData, setContextData] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>('');

  // Load context on mount when projectPath exists
  useEffect(() => {
    if (projectPath) {
      handleLoadContext(projectPath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadContext = async (pathToLoad: string) => {
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
          // Immediately sync so all three files are written
          await syncContent(template, pathToLoad);
          setSyncStatus('Context ready');
        }
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch {
      setSyncStatus('Failed loading context');
    } finally {
      setIsLoadingContext(false);
    }
  };

  const syncContent = async (content: string, path: string) => {
    if (content === lastSavedContent.current) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', projectPath: path, content }),
      });
      if (res.ok) {
        lastSavedContent.current = content;
        setSaveState('saved');
      } else {
        setSaveState('dirty');
      }
    } catch {
      setSaveState('dirty');
    }
  };

  const syncToFiles = useCallback(async (content: string) => {
    await syncContent(content, projectPath);
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
    debounceTimer.current = setTimeout(() => syncToFiles(template), AUTO_SAVE_DELAY_MS);
  };

  const handleSyncContext = async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await syncToFiles(contextData);
      setSyncStatus('Context saved');
    } finally {
      setIsSyncing(false);
    }
  };

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
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden" style={{ height: '70vh' }}>
          {/* Toolbar */}
          <div className="h-12 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <FileText size={15} className="text-zinc-500" />
                Shared AI Context
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 hidden sm:flex">
                <span>.gemini.md</span>
                <span>.claude.md</span>
                <span>agents.md</span>
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
          <div className="flex-1 relative bg-[#09090b]">
            {isLoadingContext ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
              </div>
            ) : (
              <textarea
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
