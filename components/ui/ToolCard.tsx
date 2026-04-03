'use client';

import { Terminal, ArrowRight } from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';

interface ToolCardProps {
  name: string;
  command: string;
  icon: string;
  color: string;
  hoverBorder: string;
  description: string;
  detail: string;
  tags: string[];
  billingUrl: string;
}

// Derive chip style from the tool's accent color class
const chipStyle: Record<string, string> = {
  'text-orange-400': 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  'text-blue-400':   'bg-blue-500/10 border-blue-500/20 text-blue-400',
  'text-emerald-400':'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  'text-zinc-300':   'bg-zinc-700/30 border-zinc-600/30 text-zinc-400',
  'text-purple-400': 'bg-purple-500/10 border-purple-500/20 text-purple-400',
};

export default function ToolCard({
  name,
  command,
  icon,
  color,
  hoverBorder,
  description,
  detail,
  tags,
  billingUrl,
}: ToolCardProps) {
  const { projectPath, setSyncStatus } = useWorkspace();

  const spawnTerminal = async () => {
    if (!projectPath) {
      setSyncStatus('Connect a workspace first');
      return;
    }
    try {
      setSyncStatus(`Launching tool: ${command}`);
      await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, projectPath }),
      });
      setSyncStatus(`${command} online`);
    } catch {
      setSyncStatus(`Failed launching ${command}`);
    }
  };

  const chips = chipStyle[color] ?? 'bg-zinc-700/30 border-zinc-600/30 text-zinc-400';

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={spawnTerminal}
        className={`group relative flex flex-col gap-3 p-4 rounded-xl bg-[var(--c-inset)] hover:bg-[#1a1a1d] transition-all border border-[var(--c-border)] ${hoverBorder} shadow-sm text-left`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 shrink-0 rounded-lg bg-[var(--c-surface)] border border-zinc-700/50 flex items-center justify-center text-[13px] font-bold shadow-inner ${color}`}
            >
              {icon}
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-semibold text-zinc-200">{name}</div>
              <div className="text-[11px] text-zinc-500 leading-snug mt-0.5">{description}</div>
            </div>
          </div>
          <div className="w-7 h-7 shrink-0 rounded-full bg-[var(--c-surface)] flex items-center justify-center border border-[var(--c-border)] group-hover:bg-[var(--c-border)] group-hover:border-zinc-600 transition-all">
            <Terminal size={14} className="text-zinc-500 group-hover:text-zinc-200 transition-colors" />
          </div>
        </div>

        {/* Detail text */}
        <p className="text-[11px] text-zinc-500 leading-relaxed">{detail}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span
              key={tag}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chips}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </button>

      <div className="px-1.5 mt-0.5">
        <a
          href={billingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Check usage for ${name} (opens in new tab)`}
          className="w-full py-1.5 px-3 bg-zinc-800/20 hover:bg-zinc-800/60 border border-[var(--c-border)] hover:border-zinc-600 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 font-mono uppercase tracking-wider flex items-center justify-between transition-all group/link"
        >
          <span>Check usage ↗</span>
          <ArrowRight size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  );
}
