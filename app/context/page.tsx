'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { FileText, Wand2, Save, Loader2, Home } from 'lucide-react';
import { useWorkspace } from '@/components/WorkspaceProvider';

export default function ContextPage() {
  const { projectPath, setSyncStatus, addRecentPath } = useWorkspace();
  const [contextData, setContextData] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
        setContextData(data.content);
        setSyncStatus('Context loaded');
        addRecentPath(pathToLoad);
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch {
      setSyncStatus('Failed loading context');
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!projectPath) return;

    setSyncStatus('Analyzing project...');
    setIsSyncing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      let analysis = {
        framework: 'Unknown',
        styling: 'Unknown',
        language: 'Unknown',
        database: 'Unknown',
        packageManager: 'npm',
      };
      let folderStructure = 'No specific structure detected.';

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          analysis = data.techStack;
          folderStructure = data.folderStructure || folderStructure;
        }
      }

      const template = `# Omni Context Root

## Role & Persona
You are an elite Staff Software Engineer. You write clean, modular, and hyper-optimized code. You do not explain basic concepts unless asked. You prioritize actionable solutions over textbook theory.

## Detected Architecture
- **Language**: ${analysis.language}
- **Framework**: ${analysis.framework}
- **Styling**: ${analysis.styling}
- **Database/ORM**: ${analysis.database}
- **Package Manager**: ${analysis.packageManager}

## Project Root Overview
\`\`\`
${folderStructure}
\`\`\`

## Core Directives
1. **Never use generic placeholder text.** Always generate complete, production-ready code.
2. **Prioritize Aesthetics:** UIs must look premium (e.g., Vercel/Linear dark mode, subtle animations, flawless spacing).
3. **No destructive actions:** Never delete files or drop tables without explicit permission.
4. **Environment:** Execute scripts and commands using ${analysis.packageManager} and Windows cmd.exe syntax.
5. **Maintain Context:** As you complete goals, aggressively update this file (.gemini.md / .claude.md / agents.md) to check off tasks, add new learnings, and keep the Omni Context Root perfectly synchronized with reality.

## Active Goals
- [ ] Understand the provided project structure and context.
- [ ] Step 2
`;
      setContextData(template);
      setSyncStatus('Template created');
    } catch {
      setSyncStatus('Template analysis failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncContext = async () => {
    if (!projectPath) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', projectPath, content: contextData }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('Context saved');
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch {
      setSyncStatus('Sync failed');
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
      {/* Context Editor Panel */}
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
              onClick={handleGenerateTemplate}
              disabled={!projectPath || isSyncing}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all border border-transparent hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate boilerplate template"
            >
              <Wand2 size={13} className="group-hover:text-violet-400 transition-colors" />
              Template
            </button>
            <button
              onClick={handleSyncContext}
              disabled={isSyncing || !projectPath}
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
              onChange={(e) => setContextData(e.target.value)}
              spellCheck={false}
              placeholder="Your shared AI context will appear here..."
            />
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
