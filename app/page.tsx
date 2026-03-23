'use client';

import { useState } from 'react';
import Link from 'next/link';

import { FileText, Terminal, Bot, FolderGit2, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';
import WorkspaceSelector from '@/components/layout/WorkspaceSelector';
import HowToUse from '@/components/layout/HowToUse';

const quickActions = [
  {
    label: 'Edit Context',
    description: 'Write shared instructions for all AI tools',
    href: '/context',
    icon: FileText,
    accent: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/50',
  },
  {
    label: 'Launch AI Tools',
    description: 'Open interactive AI terminal sessions',
    href: '/tools',
    icon: Terminal,
    accent: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
  },
  {
    label: 'Agent Teams',
    description: 'Orchestrate coordinated multi-agent builds',
    href: '/agents',
    icon: Bot,
    accent: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/50',
  },
  {
    label: 'Save Session',
    description: 'Commit current workspace state via git',
    href: '/sessions',
    icon: FolderGit2,
    accent: 'text-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
  },
];

const steps = [
  {
    number: '1',
    title: 'Connect',
    description: 'Point to your project folder using the input above',
  },
  {
    number: '2',
    title: 'Write Context',
    description: 'Create shared instructions that all AI tools will read',
  },
  {
    number: '3',
    title: 'Launch Tools',
    description: 'Open AI terminals or orchestrate agent teams',
  },
];

export default function HomePage() {
  const { projectPath, setSyncStatus } = useWorkspace();
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);

  const handleConnect = () => {
    setSyncStatus('Context loaded');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[900px] mx-auto w-full">
      {/* Workspace Selector */}
      <WorkspaceSelector onConnect={handleConnect} />

      {/* Welcome section (no workspace) */}
      {!projectPath && (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Welcome to OmniAgent Studio</h2>
          </div>
          <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
            Connect a project workspace to get started. This app helps you coordinate multiple AI coding tools with a shared context file.
          </p>

          {/* Three-step guide */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#121214] border border-[#27272a] rounded-lg p-4"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-300 mb-3">
                  {step.number}
                </div>
                <h3 className="text-sm font-medium text-zinc-200 mb-1">{step.title}</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsHowToUseOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold px-4 py-2 transition-colors"
          >
            Learn More
          </button>

          <HowToUse isOpen={isHowToUseOpen} onClose={() => setIsHowToUseOpen(false)} />
        </div>
      )}

      {/* Quick Actions (workspace connected) */}
      {projectPath && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`bg-[#18181b] border border-[#27272a] rounded-xl p-5 ${action.hoverBorder} transition-all cursor-pointer group`}
              >
                <Icon size={20} className={`${action.accent} mb-3`} />
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">{action.label}</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{action.description}</p>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
