'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bot, Home, FileText, Terminal, FolderGit2, HelpCircle, RefreshCw, FolderOpen, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, getAudioVolume, setAudioVolume } from '@/components/ui/useAudioNotification';

/** Returns { name, parent } split from a file path. */
function splitPath(p: string): { name: string; parent: string } {
  const parts = p.replace(/[/\\]+$/, '').split(/[/\\]/);
  const name = parts[parts.length - 1] || p;
  const sep = p.includes('/') ? '/' : '\\';
  const parent = parts.slice(0, -1).join(sep) || sep;
  return { name, parent };
}
import { WorkspaceProvider, useWorkspace } from '@/components/layout/WorkspaceProvider';
import StatusToast from '@/components/ui/StatusToast';
import HowToUse from '@/components/layout/HowToUse';

const navItems = [
  { label: 'Home', description: 'Start here', icon: Home, route: '/' },
  { label: 'Shared Context', description: 'Tell AI about your project', icon: FileText, route: '/context' },
  { label: 'AI Tools', description: 'Launch AI assistants', icon: Terminal, route: '/tools' },
  { label: 'Agent Teams', description: 'Coordinate multiple AIs', icon: Bot, route: '/agents' },
  { label: 'Ralph', description: 'Run tasks automatically', icon: RefreshCw, route: '/ralph' },
  { label: 'Sessions', description: 'Save your progress', icon: FolderGit2, route: '/sessions' },
];

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { projectPath } = useWorkspace();
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  // Start with server-safe defaults; sync from localStorage after hydration.
  // Using lazy initialisers here causes hydration mismatch because the server
  // returns the hard-coded defaults (window undefined) while the client reads
  // the real localStorage values — React sees different HTML and throws.
  const [audioOn, setAudioOn] = useState(true);
  const [audioVolume, setAudioVolumeState] = useState(40);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setAudioOn(isAudioEnabled());
    setAudioVolumeState(getAudioVolume());
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('omni-theme') as 'dark' | 'light' | null;
    const initial = saved ?? 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial === 'light' ? 'light' : '');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('omni-theme', next);
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const toggleAudio = () => {
    const next = !audioOn;
    setAudioEnabled(next);
    setAudioOn(next);
    // Persist to .claude/audio-enabled.txt so chime.ps1 (Stop hook) respects mute.
    if (projectPath) {
      fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, enabled: next }),
      }).catch(() => {});
    }
  };

  const handleVolumeChange = (v: number) => {
    setAudioVolume(v);
    setAudioVolumeState(v);
    // Persist to .claude/audio-volume.txt so chime.ps1 (Stop hook) reads it.
    // Fire-and-forget — non-critical, fail silently.
    if (projectPath) {
      fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, volume: v }),
      }).catch(() => {});
    }
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-[var(--c-border)] bg-[var(--c-bg)]">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[var(--c-border)] mb-2">
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <Bot size={16} className="text-zinc-400" />
            OmniAgent Studio
          </h1>
        </div>

        {/* Nav section label */}
        <div className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase px-5 mt-2 mb-2">
          Menu
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.route;
            const Icon = item.icon;
            return (
              <Link
                key={item.route}
                href={item.route}
                className={`flex items-center gap-3 px-2 py-2 rounded-md transition-colors w-full text-left group ${
                  isActive
                    ? 'bg-zinc-800/50 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon size={15} className={`shrink-0 ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`} />
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-medium leading-tight ${isActive ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                    {item.label}
                  </span>
                  <span className={`text-[10px] leading-tight mt-0.5 transition-opacity ${
                    isActive
                      ? 'text-zinc-500 opacity-100'
                      : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                  }`}>
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--c-border)] flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-500">v1.1.0</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--c-bg)]">
        {/* Breadcrumb header */}
        <header className="h-14 border-b border-[var(--c-border)] flex items-center justify-between px-6 bg-[var(--c-bg)] sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm text-zinc-400 min-w-0">
            <span className="shrink-0">Workspaces</span>
            <span className="text-zinc-600 shrink-0">/</span>
            {projectPath ? (
              <span
                className="flex items-center gap-1.5 min-w-0"
                title={projectPath}
              >
                <FolderOpen size={14} className="text-zinc-500 shrink-0" />
                <span className="text-zinc-200 font-semibold truncate">
                  {splitPath(projectPath).name}
                </span>
                <span className="text-zinc-600 font-mono text-xs truncate hidden sm:block">
                  {splitPath(projectPath).parent}
                </span>
              </span>
            ) : (
              <span className="text-zinc-600 italic text-xs">No workspace connected</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <StatusToast />
            <button
              onClick={toggleTheme}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <div className="flex items-center gap-1.5">
              {audioOn && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audioVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 h-1 cursor-pointer accent-zinc-400"
                  aria-label="Volume for AI notification sounds"
                  title={`Volume for AI notification sounds: ${audioVolume}%`}
                />
              )}
              <button
                onClick={toggleAudio}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Toggle audio notifications"
                aria-label={audioOn ? 'Mute audio notifications' : 'Unmute audio notifications'}
                aria-pressed={audioOn}
              >
                {audioOn ? <Volume2 size={16} /> : <VolumeX size={16} className="text-zinc-600" />}
              </button>
            </div>
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="How to use OmniAgent Studio (click for a guide)"
              aria-label="Open help guide"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>

        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Loading workspace...
            </div>
          }
        >
          {children}
        </Suspense>
      </main>

      <HowToUse isOpen={isHowToUseOpen} onClose={() => setIsHowToUseOpen(false)} />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <LayoutInner>{children}</LayoutInner>
    </WorkspaceProvider>
  );
}
