'use client';

import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Clock, ChevronDown, ArrowRight, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorkspace } from './WorkspaceProvider';
import FolderBrowser from './FolderBrowser';

interface WorkspaceSelectorProps {
  onConnect: (path: string) => void;
}

/** Split a path into { name, parent } for display in the recents list. */
function splitPath(p: string): { name: string; parent: string } {
  const sep = p.includes('/') ? '/' : '\\';
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
  const name = parts[parts.length - 1] || p;
  const parent = parts.slice(0, -1).join(sep) || sep;
  return { name, parent };
}

export default function WorkspaceSelector({ onConnect }: WorkspaceSelectorProps) {
  const { projectPath, setProjectPath, recentPaths, addRecentPath, setSyncStatus } = useWorkspace();

  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false);
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
const recentsRef = useRef<HTMLDivElement>(null);

  // Close recent dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (event.button === 2) return; // ignore right-clicks
      if (recentsRef.current && !recentsRef.current.contains(event.target as Node)) {
        setIsRecentsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBrowse = () => {
    setIsFolderBrowserOpen(true);
  };

  const handleConnect = async (overridePath?: string) => {
    const pathToLoad = overridePath || projectPath;
    if (!pathToLoad) return;

    setIsLoading(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', projectPath: pathToLoad }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('Context loaded');
        addRecentPath(pathToLoad);
        onConnect(pathToLoad);
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch {
      setSyncStatus('Failed loading context');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative group flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <button
              onClick={handleBrowse}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
              title="Browse for Folder"
              aria-label="Browse for folder"
            >
              <FolderOpen size={16} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Connect workspace (e.g., C:\Projects\MyApp)... Click folder icon to browse."
            className="w-full bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl py-3.5 pl-12 pr-[140px] text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-mono"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConnect();
            }}
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-2">
            <div className="relative" ref={recentsRef}>
              <button
                onClick={() => setIsRecentsOpen(!isRecentsOpen)}
                className="bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 border border-transparent hover:border-zinc-700"
                title="Recent Workspaces"
                aria-label="Recent workspaces"
              >
                <Clock size={14} />
                <ChevronDown size={12} className="opacity-70" />
              </button>

              <AnimatePresence>
                {isRecentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-[var(--c-inset)] border border-[var(--c-border)] rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                  >
                    <div className="px-3 py-2 border-b border-[var(--c-border)] bg-[var(--c-surface)] text-xs font-semibold text-zinc-400">
                      Recent Workspaces
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 bg-[var(--c-bg)]">
                      {recentPaths.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-600">No recent paths found.</div>
                      ) : (
                        recentPaths.map((p) => {
                          const { name, parent } = splitPath(p);
                          return (
                            <button
                              key={p}
                              onClick={() => {
                                setProjectPath(p);
                                handleConnect(p);
                                setIsRecentsOpen(false);
                              }}
                              className="w-full text-left px-2 py-2.5 rounded-lg hover:bg-[var(--c-surface)] flex items-start gap-3 transition-colors group"
                            >
                              <FolderOpen size={14} className="text-zinc-500 group-hover:text-blue-400 shrink-0 mt-0.5" />
                              <span className="flex flex-col min-w-0">
                                <span className="text-[13px] text-zinc-200 font-medium leading-tight truncate">{name}</span>
                                <span className="text-[11px] text-zinc-500 font-mono leading-tight truncate mt-0.5">{parent}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => handleConnect()}
              disabled={isLoading || !projectPath}
              className="bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-zinc-100"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Connect'}
              <ArrowRight size={14} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>

      <FolderBrowser
        isOpen={isFolderBrowserOpen}
        onClose={() => setIsFolderBrowserOpen(false)}
        initialPath={projectPath}
        onSelect={(path) => {
          setProjectPath(path);
          handleConnect(path);
        }}
      />
    </>
  );
}
