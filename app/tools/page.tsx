'use client';

import Link from 'next/link';
import { Terminal, Home } from 'lucide-react';

import { useWorkspace } from '@/components/layout/WorkspaceProvider';
import ToolCard from '@/components/ui/ToolCard';

const tools = [
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'claude',
    icon: 'C',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    hoverBorder: 'hover:border-orange-500/50',
    description: "Anthropic's flagship coding agent. Excellent for deep logic.",
    billingUrl: 'https://console.anthropic.com/settings/billing',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    command: 'gemini',
    icon: 'G',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    hoverBorder: 'hover:border-blue-500/50',
    description: "Google's massive context terminal wrapper.",
    billingUrl: 'https://aistudio.google.com/app/plan_information',
  },
  {
    id: 'opencode',
    name: 'Open Code',
    command: 'opencode',
    icon: 'O',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    hoverBorder: 'hover:border-emerald-500/50',
    description: 'Open-source autonomous framework CLI.',
    billingUrl: 'https://opencode.ai/docs/cli/',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    command: 'codex',
    icon: 'X',
    color: 'text-zinc-300',
    bgColor: 'bg-zinc-400/10',
    hoverBorder: 'hover:border-zinc-500/50',
    description: "OpenAI's terminal agent powered by o3/gpt-4o.",
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
  },
];

export default function ToolsPage() {
  const { projectPath } = useWorkspace();

  // Empty state
  if (!projectPath) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <Terminal size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Connect a workspace on the Home page to launch tools.
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
      <div className="p-6 flex flex-col gap-6 max-w-[900px] mx-auto w-full">
        {/* Page heading */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">AI Tools</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Launch an AI coding assistant in a new terminal window. Each tool reads your shared context file automatically.
          </p>
        </div>

        {/* Tool cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map(({ id, bgColor, ...toolProps }) => (
            <ToolCard key={id} {...toolProps} />
          ))}
        </div>
      </div>
    </div>
  );
}
