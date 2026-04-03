'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, FolderOpen, FolderPlus, ArrowLeft, X, Loader2, Home, Monitor, HardDrive, Pencil, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Directory = { name: string; path: string };
type FolderBrowserProps = { isOpen: boolean; onClose: () => void; onSelect: (path: string) => void; initialPath?: string };
type QuickAccess = { label: string; path: string; icon: React.ReactNode };

function getBreadcrumbs(p: string): { label: string; path: string }[] {
  if (!p) return [];
  const isWin = p.includes('\\') || /^[A-Za-z]:/.test(p);
  const sep = isWin ? '\\' : '/';
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
  const crumbs: { label: string; path: string }[] = [];
  let accumulated = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      accumulated = isWin ? part + sep : sep;
      crumbs.push({ label: isWin ? part + sep : '/', path: accumulated });
    } else {
      accumulated = accumulated.endsWith(sep) ? accumulated + part : accumulated + sep + part;
      crumbs.push({ label: part, path: accumulated });
    }
  }
  return crumbs;
}

function getQuickAccess(home: string): QuickAccess[] {
  const isWin = /^[A-Za-z]:[/\\]/.test(home);
  if (isWin) {
    const sep = '\\';
    const drive = home.split(sep)[0] + sep;
    return [
      { label: 'Home',      path: home,                     icon: <Home size={13} /> },
      { label: 'Desktop',   path: home + sep + 'Desktop',   icon: <Monitor size={13} /> },
      { label: 'Documents', path: home + sep + 'Documents', icon: <Monitor size={13} /> },
      { label: 'Downloads', path: home + sep + 'Downloads', icon: <Monitor size={13} /> },
      { label: drive,       path: drive,                    icon: <HardDrive size={13} /> },
    ];
  }
  const linuxUser = home.split('/').filter(Boolean).pop() ?? '';
  const winHome = linuxUser ? `/mnt/c/Users/${linuxUser}` : null;
  const items: QuickAccess[] = [{ label: 'Home (WSL)', path: home, icon: <Home size={13} /> }];
  if (winHome) items.splice(1, 0, { label: 'Windows', path: winHome, icon: <Monitor size={13} /> });
  items.push({ label: '/mnt/c', path: '/mnt/c', icon: <HardDrive size={13} /> });
  return items;
}

export default function FolderBrowser({ isOpen, onClose, onSelect, initialPath }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeDir, setHomeDir] = useState('');
  const [validQuickAccess, setValidQuickAccess] = useState<QuickAccess[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // New folder state
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Rename state
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  const fetchDirectory = useCallback(async (path?: string, pushHistory = true) => {
    setIsLoading(true);
    setError(null);
    setCreatingFolder(false);
    setRenamingPath(null);
    try {
      const res = await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path || initialPath || '' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (!homeDir) setHomeDir(data.currentPath);
        if (pushHistory && currentPath) setHistory(h => [...h, currentPath]);
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
  }, [initialPath, homeDir, currentPath]);

  const goBack = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(h => h.slice(0, -1));
    fetchDirectory(prev, false);
  };

  // Create folder
  const startCreating = () => {
    setCreatingFolder(true);
    setNewFolderName('New Folder');
    setCreateError('');
    setTimeout(() => { newFolderInputRef.current?.select(); }, 50);
  };

  const confirmCreate = async () => {
    const name = newFolderName.trim();
    if (!name) { setCreateError('Name cannot be empty'); return; }
    const res = await fetch('/api/fs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mkdir', path: currentPath, name }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatingFolder(false);
      fetchDirectory(currentPath, false);
    } else {
      setCreateError(data.error || 'Failed to create folder');
    }
  };

  // Rename folder
  const startRenaming = (dir: Directory) => {
    setRenamingPath(dir.path);
    setRenameName(dir.name);
    setRenameError('');
    setTimeout(() => { renameInputRef.current?.select(); }, 50);
  };

  const confirmRename = async () => {
    if (!renamingPath) return;
    const name = renameName.trim();
    if (!name) { setRenameError('Name cannot be empty'); return; }
    const res = await fetch('/api/fs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: renamingPath, name }),
    });
    const data = await res.json();
    if (res.ok) {
      setRenamingPath(null);
      fetchDirectory(currentPath, false);
    } else {
      setRenameError(data.error || 'Failed to rename');
    }
  };

  useEffect(() => {
    if (isOpen) fetchDirectory(initialPath, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!homeDir) return;
    const items = getQuickAccess(homeDir);
    Promise.all(items.map(async item => {
      try {
        const res = await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: item.path }) });
        return res.ok ? item : null;
      } catch { return null; }
    })).then(results => setValidQuickAccess(results.filter((x): x is QuickAccess => x !== null)));
  }, [homeDir]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (creatingFolder) { setCreatingFolder(false); return; }
        if (renamingPath) { setRenamingPath(null); return; }
        onClose();
      }
      if (e.key === 'Backspace' && isOpen && history.length > 0 && !creatingFolder && !renamingPath &&
          !(document.activeElement instanceof HTMLInputElement)) goBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, history, creatingFolder, renamingPath]);

  useEffect(() => {
    if (isOpen) savedFocusRef.current = document.activeElement as HTMLElement;
    else savedFocusRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    if (el) el.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el?.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault(); (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
          <motion.div
            ref={dialogRef}
            role="dialog" aria-modal="true" aria-labelledby="folder-browser-title" tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="folder-browser-dialog w-full max-w-[640px] bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg shadow-2xl flex flex-col overflow-hidden"
            style={{ height: 420 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Title bar */}
            <div className="folder-browser-titlebar flex items-center justify-between px-4 py-2.5 bg-[#2c2c2e] border-b border-[#3a3a3c] shrink-0">
              <span id="folder-browser-title" className="text-[13px] font-semibold text-zinc-200 select-none">Browse For Folder</span>
              <button onClick={onClose} aria-label="Close" className="w-5 h-5 flex items-center justify-center rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors">
                <X size={9} className="text-[#7a0000]" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="folder-browser-toolbar flex items-center gap-1.5 px-2 py-1.5 bg-[#252527] border-b border-[#3a3a3c] shrink-0">
              <button onClick={goBack} disabled={history.length === 0} aria-label="Go back"
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                <ArrowLeft size={14} />
              </button>

              {/* Breadcrumb */}
              <div className="folder-browser-breadcrumb flex-1 flex items-center gap-0.5 bg-[#1c1c1e] border border-[#3a3a3c] rounded px-2 py-1 overflow-x-auto no-scrollbar min-w-0">
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center gap-0.5 shrink-0">
                    {i > 0 && <span className="text-zinc-600 text-[11px] mx-0.5 select-none">›</span>}
                    <button onClick={() => fetchDirectory(crumb.path)}
                      className={`text-[12px] px-1 py-0.5 rounded transition-colors whitespace-nowrap ${
                        i === breadcrumbs.length - 1 ? 'text-zinc-100 font-medium cursor-default' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                      }`}>
                      {crumb.label}
                    </button>
                  </span>
                ))}
                {!currentPath && <span className="text-zinc-500 text-[12px]">Loading…</span>}
              </div>

              {/* New Folder button */}
              <button onClick={startCreating} disabled={isLoading || !!error} aria-label="New folder"
                title="New Folder"
                className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                <FolderPlus size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <div className="folder-browser-sidebar w-36 shrink-0 bg-[#1c1c1e] border-r border-[#3a3a3c] py-2 flex flex-col gap-0.5 overflow-y-auto">
                <div className="px-3 pb-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider select-none">Quick Access</div>
                {validQuickAccess.map(item => (
                  <button key={item.path} onClick={() => fetchDirectory(item.path)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${
                      currentPath === item.path ? 'bg-[#3a3a3c] text-zinc-100' : 'text-zinc-400 hover:bg-[#2c2c2e] hover:text-zinc-200'
                    }`}>
                    <span className="text-zinc-500 shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* File list */}
              <div className="flex-1 overflow-y-auto bg-[#19191b]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center gap-2 text-zinc-500">
                    <Loader2 size={16} className="animate-spin" /><span className="text-xs">Loading…</span>
                  </div>
                ) : error ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <div className="text-sm text-red-400">Access Denied</div>
                    <div className="text-xs text-zinc-500">{error}</div>
                    {parentPath && (
                      <button onClick={() => fetchDirectory(parentPath)} className="mt-2 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors">
                        Go Back
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-1">
                    {/* Existing folders */}
                    {directories.map(dir => (
                      <div key={dir.path} className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#2c2c2e] transition-colors">
                        {renamingPath === dir.path ? (
                          /* Rename inline input */
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <Folder size={15} className="text-amber-400 shrink-0" />
                            <input
                              ref={renameInputRef}
                              value={renameName}
                              onChange={e => { setRenameName(e.target.value); setRenameError(''); }}
                              onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingPath(null); }}
                              className="flex-1 bg-[#3a3a3c] border border-blue-500/60 rounded px-1.5 py-0.5 text-[13px] text-zinc-100 outline-none min-w-0"
                              autoFocus
                            />
                            <button onClick={confirmRename} className="p-0.5 text-blue-400 hover:text-blue-300 shrink-0"><Check size={13} /></button>
                            {renameError && <span className="text-[11px] text-red-400 ml-1">{renameError}</span>}
                          </div>
                        ) : (
                          <>
                            <button
                              onDoubleClick={() => fetchDirectory(dir.path)}
                              onKeyDown={e => e.key === 'Enter' && fetchDirectory(dir.path)}
                              className="flex items-center gap-2.5 flex-1 min-w-0 text-left focus:outline-none"
                            >
                              <Folder size={15} className="text-amber-400/80 shrink-0 group-hover:text-amber-400" />
                              <span className="text-[13px] text-zinc-300 group-hover:text-zinc-100 truncate">{dir.name}</span>
                            </button>
                            {/* Rename button — visible on hover */}
                            <button
                              onClick={() => startRenaming(dir)}
                              aria-label={`Rename ${dir.name}`}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all shrink-0"
                            >
                              <Pencil size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* New folder inline row */}
                    {creatingFolder && (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#252527]">
                        <FolderPlus size={15} className="text-amber-400 shrink-0" />
                        <input
                          ref={newFolderInputRef}
                          value={newFolderName}
                          onChange={e => { setNewFolderName(e.target.value); setCreateError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreatingFolder(false); }}
                          className="flex-1 bg-[#3a3a3c] border border-blue-500/60 rounded px-1.5 py-0.5 text-[13px] text-zinc-100 outline-none min-w-0"
                          autoFocus
                        />
                        <button onClick={confirmCreate} className="p-0.5 text-blue-400 hover:text-blue-300 shrink-0"><Check size={13} /></button>
                        {createError && <span className="text-[11px] text-red-400 ml-1">{createError}</span>}
                      </div>
                    )}

                    {!creatingFolder && directories.length === 0 && (
                      <div className="h-20 flex items-center justify-center text-zinc-500 text-xs">No subfolders</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="folder-browser-footer flex items-center gap-2 px-3 py-2.5 bg-[#2c2c2e] border-t border-[#3a3a3c] shrink-0">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#1c1c1e] border border-[#3a3a3c] rounded px-2 py-1">
                <FolderOpen size={12} className="text-amber-400/70 shrink-0" />
                <span className="text-[11px] font-mono text-zinc-400 truncate">{currentPath || '—'}</span>
              </div>
              <button onClick={onClose} className="px-3 py-1.5 text-[12px] font-medium text-zinc-300 bg-[#3a3a3c] hover:bg-[#48484a] rounded transition-colors shrink-0">
                Cancel
              </button>
              <button
                onClick={() => { onSelect(currentPath); onClose(); }}
                disabled={isLoading || !!error || !currentPath}
                className="px-3 py-1.5 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded transition-colors shrink-0"
              >
                Select Folder
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
