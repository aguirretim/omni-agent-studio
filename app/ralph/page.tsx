'use client';

import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, CheckCircle2, Circle, Loader2,
  FileText, HelpCircle, ChevronRight, Terminal, Home,
} from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Goal {
  text: string;
  done: boolean;
}

type TabId = 'goals' | 'progress' | 'howto';

const TABS: { id: TabId; label: string }[] = [
  { id: 'goals',    label: 'Goals' },
  { id: 'progress', label: 'Progress' },
  { id: 'howto',    label: 'How It Works' },
];

// ─── Goals Tab ───────────────────────────────────────────────────────────────

interface GoalsTabProps {
  projectPath: string;
}

function GoalsTab({ projectPath }: GoalsTabProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contextFile, setContextFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ralph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-goals', projectPath }),
      });
      const data = await res.json();
      setGoals(Array.isArray(data.goals) ? (data.goals as Goal[]) : []);
      setContextFile(typeof data.contextFile === 'string' ? data.contextFile : null);
    } catch {
      setGoals([]);
      setContextFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  const doneCount = goals.filter(g => g.done).length;
  const totalCount = goals.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const firstPendingIdx = goals.findIndex(g => !g.done);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <FileText size={32} className="text-zinc-600" />
        <div>
          <p className="text-sm font-medium text-zinc-300">No Active Goals found</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Add goals to the <span className="font-mono text-zinc-400">## Active Goals</span> section in your Shared Context, then refresh.
          </p>
        </div>
        <Link
          href="/context"
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold px-4 py-2 transition-colors"
        >
          <ChevronRight size={12} />
          Open Shared Context
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {contextFile && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">
              <FileText size={9} />
              {contextFile}
            </span>
          )}
        </div>
        <button
          onClick={loadGoals}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-all disabled:opacity-40"
          aria-label="Refresh goals"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            {doneCount} of {totalCount} {totalCount === 1 ? 'goal' : 'goals'} complete
          </span>
          <span className="text-[11px] font-semibold text-zinc-400">{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Goal list */}
      <div className="flex flex-col gap-1.5">
        {goals.map((goal, i) => {
          const isUpNext = i === firstPendingIdx;
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isUpNext
                  ? 'border-l-2 border-orange-500 pl-2 bg-orange-500/5 border border-orange-500/20 border-l-orange-500'
                  : 'bg-[#18181b] border border-[#27272a]'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {goal.done ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <Circle size={14} className="text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs leading-snug ${goal.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {goal.text}
                </span>
              </div>
              {isUpNext && (
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-1.5 py-0.5 rounded-full">
                  Up next
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

interface ProgressTabProps {
  projectPath: string;
}

function ProgressTab({ projectPath }: ProgressTabProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ralph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-progress', projectPath }),
      });
      const data = await res.json();
      setContent(data.content ?? null);
    } catch {
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-500 font-mono">progress.txt</span>
        <button
          onClick={loadProgress}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-all disabled:opacity-40"
          aria-label="Refresh progress"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : content === null ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <FileText size={28} className="text-zinc-600" />
          <div>
            <p className="text-sm font-medium text-zinc-400">No progress yet</p>
            <p className="text-xs text-zinc-600 mt-1">Run <span className="font-mono text-zinc-400">/ralph</span> to start the autonomous loop.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#27272a] bg-[#09090b] overflow-hidden">
          <pre className="p-4 text-[12px] leading-relaxed font-mono text-zinc-300 whitespace-pre-wrap overflow-auto max-h-[60dvh] min-h-[200px]">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── How It Works Tab ─────────────────────────────────────────────────────────

function HowItWorksTab() {
  const steps = [
    {
      step: '1',
      title: 'Add goals to Shared Context',
      desc: (
        <>
          Open the{' '}
          <Link href="/context" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">
            Shared Context
          </Link>{' '}
          page and add tasks under the <span className="font-mono text-zinc-300">## Active Goals</span> section using checkbox syntax:
          <br />
          <span className="font-mono text-zinc-400 text-[11px]">- [ ] Implement feature X</span>
        </>
      ),
    },
    {
      step: '2',
      title: 'Run /ralph in Claude Code',
      desc: 'Ralph reads your Active Goals, implements one goal per iteration, commits the changes, and marks the goal [x]. The loop continues until all goals are complete.',
    },
    {
      step: '3',
      title: 'Monitor progress here',
      desc: 'The Goals tab shows live status — completed goals are checked off, the next goal is highlighted in orange. Check the Progress tab for detailed logs.',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Steps */}
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">The Loop</h3>
        <div className="flex flex-col gap-3">
          {steps.map(s => (
            <div key={s.step} className="flex gap-3 items-start">
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                {s.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-200 mb-0.5">{s.title}</div>
                <p className="text-[11px] text-zinc-500 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion signal */}
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Completion Signal</h3>
        <p className="text-[11px] text-zinc-500 mb-2 leading-snug">
          Ralph stops the loop when it emits this token — indicating all goals are marked <span className="font-mono text-zinc-400">[x]</span>:
        </p>
        <div className="rounded-lg border border-[#27272a] bg-[#0f0f11] px-4 py-3">
          <code className="text-[12px] font-mono text-emerald-400">{'<promise>COMPLETE</promise>'}</code>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
        <HelpCircle size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-zinc-400 leading-snug">
          <span className="font-semibold text-zinc-300">No PRD or prd.json needed</span> — Ralph reads your Active Goals directly from the shared context file (<span className="font-mono text-zinc-300">.claude.md</span> / <span className="font-mono text-zinc-300">.gemini.md</span> / <span className="font-mono text-zinc-300">agents.md</span>).
        </p>
      </div>

      {/* Command reference */}
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Commands Reference</h3>
        <div className="rounded-lg border border-[#27272a] overflow-hidden">
          {[
            { cmd: '/ralph', desc: 'Run the autonomous loop — implements one Active Goal per iteration, commits, marks [x]', icon: <Terminal size={12} className="text-zinc-500" /> },
          ].map((row, i, arr) => (
            <div
              key={row.cmd}
              className={`flex items-center gap-3 px-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-[#27272a]' : ''} ${i % 2 === 0 ? 'bg-[#09090b]' : 'bg-[#0c0c0e]'}`}
            >
              {row.icon}
              <span className="text-[11px] font-mono font-bold text-emerald-400 w-24 shrink-0">{row.cmd}</span>
              <span className="text-[11px] text-zinc-500">{row.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RalphPage() {
  const { projectPath } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabId>('goals');

  const TAB_IDS = TABS.map(t => t.id);

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = TAB_IDS.indexOf(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab(TAB_IDS[(idx + 1) % TAB_IDS.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab(TAB_IDS[(idx - 1 + TAB_IDS.length) % TAB_IDS.length]);
    }
  };

  // Empty state — no workspace
  if (!projectPath) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <FileText size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Connect a workspace on the Home page to use Ralph.
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

        {/* Page heading */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Ralph</h2>
          <p className="text-sm text-zinc-500 mt-1">Autonomous development loop — reads Active Goals from shared context</p>
        </div>

        {/* Main card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">

          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Ralph sections"
            onKeyDown={handleTabKeyDown}
            className="flex border-b border-[#27272a] bg-[#0f0f11]"
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                id={`ralph-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`ralph-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-emerald-500'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="p-5 bg-[#09090b]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                role="tabpanel"
                id={`ralph-panel-${activeTab}`}
                aria-labelledby={`ralph-tab-${activeTab}`}
                tabIndex={0}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
              >
                {activeTab === 'goals'    && <GoalsTab projectPath={projectPath} />}
                {activeTab === 'progress' && <ProgressTab projectPath={projectPath} />}
                {activeTab === 'howto'    && <HowItWorksTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
