'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, ArrowLeft, X, Loader2, Home, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Directory = {
  name: string;
  path: string;
};

type FolderBrowserProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
};

export default function FolderBrowser({ isOpen, onClose, onSelect, initialPath }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  const fetchDirectory = useCallback(async (path?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path || initialPath || '' }),
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setDirectories(data.directories);
      } else {
        setError(data.error || 'Failed to load directory');
      }
    } catch {
      setError('Network error reading directory');
    } finally {
      setIsLoading(false);
    }
  }, [initialPath]);

  // Fetch when opened or initialized
  useEffect(() => {
    if (isOpen) {
      fetchDirectory(initialPath);
    }
  }, [isOpen, initialPath, fetchDirectory]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save/restore focus + focus trap
  useEffect(() => {
    if (isOpen) {
      savedFocusRef.current = document.activeElement as HTMLElement;
    } else {
      savedFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    if (el) el.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="folder-browser-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl flex flex-col h-[70vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4 shrink-0">
              <h2 id="folder-browser-title" className="text-sm font-semibold text-zinc-200">Select Workspace Directory</h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 -mr-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Path Navigation Bar */}
            <div className="p-3 border-b border-[#27272a] bg-[#09090b] flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => fetchDirectory()}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0"
                title="Home Directory"
              >
                <Home size={16} />
              </button>
              <div className="h-4 w-px bg-zinc-800 mx-1 shrink-0" />

              {parentPath && (
                <button
                  onClick={() => fetchDirectory(parentPath)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors shrink-0 flex items-center gap-1 text-xs font-medium"
                >
                  <ArrowLeft size={14} />
                  Up
                </button>
              )}

              <div className="text-xs font-mono text-zinc-300 whitespace-nowrap px-2 px-3 py-1.5 bg-[#18181b] rounded border border-[#27272a] ml-auto">
                {currentPath || 'Loading...'}
              </div>
            </div>

            {/* Directory List Area */}
            <div className="flex-1 overflow-y-auto p-2 bg-[#09090b]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-3">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs">Reading file system...</span>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-red-400/80 gap-2 p-6 text-center">
                  <div className="text-sm font-semibold">Access Denied</div>
                  <div className="text-xs">{error}</div>
                  <button
                    onClick={() => fetchDirectory(parentPath || '')}
                    className="mt-4 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              ) : directories.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  No subdirectories found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {directories.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => fetchDirectory(dir.path)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#18181b] border border-transparent hover:border-[#27272a] text-left transition-colors group"
                    >
                      <Folder size={16} className="text-zinc-500 group-hover:text-blue-400 shrink-0" />
                      <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 truncate flex-1">
                        {dir.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="h-16 border-t border-[#27272a] bg-[#121214] flex items-center justify-between px-4 shrink-0">
               <div className="text-xs text-zinc-500">
                 Click a folder to open it
               </div>
               <button
                  onClick={() => {
                    onSelect(currentPath);
                    onClose();
                  }}
                  disabled={isLoading || !!error}
                  className="px-4 py-2 bg-zinc-200 hover:bg-white disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
               >
                 <CheckCircle2 size={14} />
                 Select This Workspace
               </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
