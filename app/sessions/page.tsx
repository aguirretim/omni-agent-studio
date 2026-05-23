'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { FolderGit2, Loader2, CheckCircle2, XCircle, Home, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';

interface TokenTotals { input: number; output: number; cacheRead: number; cacheWrite: number }
interface SessionEntry {
  id: string; date: string; cost: number; model: string;
  tokens: TokenTotals;
}
interface UsageData {
  totalCost: number;
  todayCost: number;
  sessions: SessionEntry[];
  totalTokens: TokenTotals;
}

function fmt$(n: number): string {
  if (n < 0.01) return '<$0.01';
  return '$' + n.toFixed(2);
}
function fmtK(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

export default function SessionsPage() {
  const { projectPath, setSyncStatus } = useWorkspace();
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastCommitMsg, setLastCommitMsg] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const loadUsage = useCallback(async () => {
    if (!projectPath) return;
    setIsLoadingUsage(true);
    try {
      const res = await fetch(`/api/usage?projectPath=${encodeURIComponent(projectPath)}`);
      if (res.ok) setUsage(await res.json() as UsageData);
    } catch {}
    finally { setIsLoadingUsage(false); }
  }, [projectPath]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const handleCommitSession = async () => {
    if (!projectPath) return;
    setIsCommitting(true);
    setLastCommitMsg(null);
    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastCommitMsg(
          data.message.substring(0, 100) + (data.message.length > 100 ? '...' : '')
        );
        setSyncStatus('Session saved');
      } else {
        setLastCommitMsg(`Failed: ${data.error}`);
      }
    } catch {
      setLastCommitMsg('Fatal: Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  // Empty state
  if (!projectPath) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <FolderGit2 size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Connect a workspace on the Home page to manage sessions.
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

  const displaySessions = showAllSessions ? usage?.sessions ?? [] : (usage?.sessions ?? []).slice(0, 5);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[700px] mx-auto w-full">

        {/* Page heading */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Session Manager</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Save workspace snapshots via git, and track Claude Code token costs for this project.
          </p>
        </div>

        {/* Commit card */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-1">
            <FolderGit2 size={16} className="text-amber-400" />
            Save Session
          </div>
          <p className="text-[13px] text-zinc-500 leading-snug mb-4">
            Creates a git commit with an auto-generated message based on the current date and time.
          </p>

          <AnimatePresence mode="popLayout">
            {lastCommitMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400 flex items-start gap-2 break-words"
              >
                {lastCommitMsg?.startsWith('Failed') || lastCommitMsg?.startsWith('Fatal') ? (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{lastCommitMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleCommitSession}
            disabled={isCommitting || !projectPath}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:hover:bg-zinc-800 text-zinc-200 text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCommitting ? (
              <Loader2 size={14} className="animate-spin text-zinc-400" />
            ) : (
              'Save Session'
            )}
          </button>
        </div>

        {/* ── Usage / Cost card ── */}
        <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <DollarSign size={16} className="text-emerald-400" />
              Claude Code Usage
            </div>
            <button
              onClick={loadUsage}
              disabled={isLoadingUsage}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Refresh usage data"
            >
              <RefreshCw size={11} className={isLoadingUsage ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {isLoadingUsage && !usage ? (
            <div className="flex items-center gap-2 text-[11px] text-zinc-600 py-2">
              <Loader2 size={11} className="animate-spin" /> Loading usage data…
            </div>
          ) : usage ? (
            <>
              {/* Top stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--c-inset)] border border-[var(--c-border)] rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Today</span>
                  <span className="text-lg font-bold text-emerald-400">{fmt$(usage.todayCost)}</span>
                </div>
                <div className="bg-[var(--c-inset)] border border-[var(--c-border)] rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">All Time</span>
                  <span className="text-lg font-bold text-zinc-200">{fmt$(usage.totalCost)}</span>
                </div>
              </div>

              {/* Token breakdown */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                <span><span className="text-zinc-400">{fmtK(usage.totalTokens.input)}</span> in</span>
                <span><span className="text-zinc-400">{fmtK(usage.totalTokens.output)}</span> out</span>
                <span><span className="text-zinc-300">{fmtK(usage.totalTokens.cacheRead)}</span> cache read</span>
                <span><span className="text-zinc-300">{fmtK(usage.totalTokens.cacheWrite)}</span> cache write</span>
              </div>

              {/* Per-session table */}
              {usage.sessions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                    <TrendingUp size={9} /> Recent Sessions
                  </div>
                  <div className="bg-[var(--c-stripe)] border border-[var(--c-border)] rounded-lg overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-[var(--c-border)] text-zinc-500">
                          <th className="text-left px-3 py-2 font-medium">Session</th>
                          <th className="text-left px-3 py-2 font-medium">Date</th>
                          <th className="text-left px-3 py-2 font-medium">Model</th>
                          <th className="text-right px-3 py-2 font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displaySessions.map((s, i) => (
                          <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-black/10'}>
                            <td className="px-3 py-1.5 font-mono text-zinc-400">{shortId(s.id)}</td>
                            <td className="px-3 py-1.5 text-zinc-500">{s.date}</td>
                            <td className="px-3 py-1.5 text-zinc-500 max-w-[120px] truncate">{s.model.replace('claude-', '')}</td>
                            <td className="px-3 py-1.5 text-right text-emerald-400 font-semibold">{fmt$(s.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {usage.sessions.length > 5 && (
                    <button
                      onClick={() => setShowAllSessions(v => !v)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors text-left mt-1"
                    >
                      {showAllSessions ? 'Show less' : `Show all ${usage.sessions.length} sessions`}
                    </button>
                  )}
                </div>
              )}

              {usage.sessions.length === 0 && (
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  No sessions found yet. Costs will appear here after you run Claude Code in this workspace.
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-zinc-600">Could not load usage data.</p>
          )}
        </div>

      </div>
    </div>
  );
}
