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
  billingUrl: string;
}

export default function ToolCard({
  name,
  command,
  icon,
  color,
  hoverBorder,
  description,
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

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={spawnTerminal}
        className={`group relative flex items-center justify-between p-4 rounded-xl bg-[#121214] hover:bg-[#1a1a1d] transition-all border border-[#27272a] ${hoverBorder} shadow-sm text-left`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 shrink-0 rounded-lg bg-[#18181b] border border-zinc-700/50 flex items-center justify-center text-[14px] font-bold shadow-inner ${color}`}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-zinc-200">{name}</div>
            <div className="text-[11px] text-zinc-500 leading-snug mt-0.5">{description}</div>
          </div>
        </div>
        <div className="w-7 h-7 shrink-0 rounded-full bg-[#18181b] flex items-center justify-center border border-[#27272a] group-hover:bg-[#27272a] group-hover:border-zinc-600 transition-all">
          <Terminal size={14} className="text-zinc-500 group-hover:text-zinc-200 transition-colors" />
        </div>
      </button>

      <div className="px-1.5 mt-0.5">
        <a
          href={billingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Check usage for ${name} (opens in new tab)`}
          className="w-full py-1.5 px-3 bg-zinc-800/20 hover:bg-zinc-800/60 border border-[#27272a] hover:border-zinc-600 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 font-mono uppercase tracking-wider flex items-center justify-between transition-all group/link"
        >
          <span>Check usage ↗</span>
          <ArrowRight size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  );
}
