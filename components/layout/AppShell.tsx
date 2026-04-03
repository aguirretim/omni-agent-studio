'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bot, Home, FileText, Terminal, FolderGit2, HelpCircle, RefreshCw, FolderOpen, Volume2, VolumeX } from 'lucide-react';
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
  { label: 'Home', icon: Home, route: '/' },
  { label: 'Shared Context', icon: FileText, route: '/context' },
  { label: 'AI Tools', icon: Terminal, route: '/tools' },
  { label: 'Agent Teams', icon: Bot, route: '/agents' },
  { label: 'Ralph', icon: RefreshCw, route: '/ralph' },
  { label: 'Sessions', icon: FolderGit2, route: '/sessions' },
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

  useEffect(() => {
    setAudioOn(isAudioEnabled());
    setAudioVolumeState(getAudioVolume());
  }, []);

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
      <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-[#27272a] bg-[#09090b]">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-[#27272a] mb-2">
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
                className={`flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors w-full text-left text-sm font-medium ${
                  isActive
                    ? 'bg-zinc-800/50 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-zinc-400' : 'text-zinc-600'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-500">v1.1.0</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        {/* Breadcrumb header */}
        <header className="h-14 border-b border-[#27272a] flex items-center justify-between px-6 bg-[#09090b] sticky top-0 z-20">
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
            <div className="flex items-center gap-1.5">
              {audioOn && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audioVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 h-1 cursor-pointer accent-zinc-400"
                  aria-label="Notification volume"
                  title={`Volume: ${audioVolume}%`}
                />
              )}
              <button
                onClick={toggleAudio}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title={audioOn ? `Mute notifications (${audioVolume}%)` : 'Unmute notifications'}
                aria-label={audioOn ? 'Mute audio notifications' : 'Unmute audio notifications'}
                aria-pressed={audioOn}
              >
                {audioOn ? <Volume2 size={16} /> : <VolumeX size={16} className="text-zinc-600" />}
              </button>
            </div>
            <button
              onClick={() => setIsHowToUseOpen(true)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              title="How to Use"
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
