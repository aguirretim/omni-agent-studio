'use client';

import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface SplitPanePreviewProps {
  onLaunch: () => void;
}

interface AgentPane {
  id: string;
  name: string;
  role: string;
  color: string;
  dotColor: string;
  lines: string[];
}

const AGENTS: AgentPane[] = [
  {
    id: 'frontend',
    name: 'agent-1',
    role: 'frontend',
    color: 'text-orange-400',
    dotColor: 'bg-orange-400',
    lines: [
      '> Reading components/features/AgentTeams.tsx',
      '> Analyzing tab structure...',
      '> CONTRACT received from lead',
      '> Writing SplitPanePreview component...',
      '> Adding framer-motion animations',
      '> [CONTRACT READY: ui-builder]',
    ],
  },
  {
    id: 'backend',
    name: 'agent-2',
    role: 'backend',
    color: 'text-blue-400',
    dotColor: 'bg-blue-400',
    lines: [
      '> Scanning app/api/agent-teams/route.ts',
      '> Checking launch-terminal action',
      '> WSL status check: all deps ready',
      '> Verifying tmux pane spawn logic',
      '> Backend contracts verified ✓',
    ],
  },
  {
    id: 'testing',
    name: 'agent-3',
    role: 'testing',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    lines: [
      '> Running: npm run build --dry-run',
      '> Checking TypeScript types...',
      '> No errors found in 24 files',
      '> Verifying framer-motion imports',
      '> All checks passed ✓',
    ],
  },
  {
    id: 'context',
    name: 'agent-4',
    role: 'context',
    color: 'text-purple-400',
    dotColor: 'bg-purple-400',
    lines: [
      '> Reading .claude.md session log',
      '> Updating AGENT_TASKS.md...',
      '> Syncing .gemini.md + agents.md',
      '> Session context updated ✓',
    ],
  },
];

function TerminalPane({ agent, delay }: { agent: AgentPane; delay: number }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      setVisibleLines(agent.lines.slice(0, 1));
      indexRef.current = 1;
      intervalRef.current = setInterval(() => {
        indexRef.current = (indexRef.current % agent.lines.length) + 1;
        setVisibleLines(agent.lines.slice(0, indexRef.current));
      }, 800);
    }, delay);

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [agent.lines, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
      className="flex flex-col border-[#27272a]"
      style={{ borderWidth: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#121214] border-b border-[#27272a]">
        <div className={`flex items-center gap-1.5 ${agent.color}`}>
          <span className={`w-2 h-2 rounded-full ${agent.dotColor}`} />
          <span className="text-xs font-semibold">{agent.name} · {agent.role}</span>
        </div>
        <span className="text-[10px] px-1.5 rounded bg-zinc-800 text-zinc-500">{agent.role}</span>
      </div>

      {/* Body */}
      <div className="flex-1 bg-[#050507] font-mono text-[11px] overflow-hidden px-2 py-1.5 text-zinc-400 h-[150px]">
        {visibleLines.map((line, i) => (
          <div key={`${agent.id}-line-${i}`} className="leading-5">{line}</div>
        ))}
        {visibleLines.length > 0 && (
          <span className="animate-pulse text-zinc-300">_</span>
        )}
      </div>
    </motion.div>
  );
}

export default function SplitPanePreview({ onLaunch }: SplitPanePreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Terminal mosaic */}
      <div
        aria-hidden="true"
        className="rounded-xl border border-[#27272a] bg-[#050507] overflow-hidden h-[min(400px,60vw)]"
      >
        <div className="grid grid-cols-2 grid-rows-2 h-full divide-x divide-y divide-[#27272a]">
          {AGENTS.map((agent, i) => (
            <TerminalPane key={agent.id} agent={agent} delay={i * 300} />
          ))}
        </div>
      </div>

      {/* Launch button */}
      <div className="flex justify-center">
        <button
          onClick={onLaunch}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Launch Agent Team
        </button>
      </div>
    </div>
  );
}
