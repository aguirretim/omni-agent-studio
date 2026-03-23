'use client';

import { useState } from 'react';
import Link from 'next/link';

import { FolderGit2, Loader2, CheckCircle2, XCircle, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';

export default function SessionsPage() {
  const { projectPath, setSyncStatus } = useWorkspace();
  const [isCommitting, setIsCommitting] = useState(false);
  const [lastCommitMsg, setLastCommitMsg] = useState<string | null>(null);

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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[700px] mx-auto w-full">
      {/* Page heading */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Session Manager</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Commits all changes in your workspace via git. Use this to save a snapshot of your progress after an AI session.
        </p>
      </div>

      {/* Commit card */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6">
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
      </div>
    </div>
  );
}
