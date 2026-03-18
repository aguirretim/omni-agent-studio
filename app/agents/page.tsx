'use client';

import Link from 'next/link';
import { Bot, Home } from 'lucide-react';

import { useWorkspace } from '@/components/WorkspaceProvider';
import AgentTeams from '@/components/AgentTeams';

export default function AgentsPage() {
  const { projectPath, setSyncStatus } = useWorkspace();

  // Empty state
  if (!projectPath) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <Bot size={32} className="text-zinc-600" />
        <p className="text-sm text-zinc-500 text-center">
          Connect a workspace on the Home page to use agents.
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
      <div className="p-6 flex flex-col gap-6 max-w-[1200px] mx-auto w-full">
        {/* Page heading */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Agent Teams</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Orchestrate multi-agent teams for autonomous, contract-first development.
          </p>
        </div>

        {/* Agent Teams section */}
        <AgentTeams projectPath={projectPath} setSyncStatus={setSyncStatus} />
      </div>
    </div>
  );
}
