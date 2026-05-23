'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Terminal, Home, X } from 'lucide-react';

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
    description: "Anthropic's flagship agentic coding CLI",
    detail: "The strongest choice when correctness and judgment matter. Claude excels at complex multi-file refactors, architecture decisions, security-sensitive code, and tasks that require careful reasoning over many steps. It also acts as the lead orchestrator in Agent Teams — spawning and coordinating sub-agents to tackle large builds.",
    tags: ['Deep reasoning', 'Agent teams', 'Architecture', 'Safety-first', 'Multi-step tasks'],
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
    description: "Google's 1M-token context terminal agent",
    detail: "Unbeatable when the entire codebase needs to fit in context at once. Use Gemini to analyse a large or unfamiliar repo, audit legacy code, compare many files simultaneously, or process long log files. Authenticates via Google OAuth — no API key needed, free tier included. Best used as the analysis worker in a hybrid agent team.",
    tags: ['1M token context', 'Codebase analysis', 'Google OAuth (free)', 'Hybrid teams'],
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
    description: 'Open-source autonomous coding agent',
    detail: "A fully open-source agentic coding CLI with a rich terminal UI. Supports multiple providers (Anthropic, OpenAI, AWS Bedrock) and runs autonomously on well-scoped tasks. Good choice when you want full control over the agent runtime, need to self-host, or want to avoid vendor lock-in while keeping a polished coding-agent experience.",
    tags: ['Open-source', 'Multi-provider', 'Self-hostable', 'Autonomous', 'No vendor lock-in'],
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
    description: "OpenAI's terminal agent — o3 / gpt-4o",
    detail: "OpenAI's agentic coding CLI. Strongest for mathematical reasoning, algorithm problems, and tasks already embedded in the OpenAI ecosystem (structured outputs, function calling, Assistants API). The o3 model gives it an edge on competitive programming and formal reasoning benchmarks. Use it when your team is standardised on OpenAI infrastructure.",
    tags: ['o3 model', 'Math & algorithms', 'OpenAI ecosystem', 'Structured output'],
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
  },
  {
    id: 'openclaude',
    name: 'OpenClaude',
    command: 'openclaude',
    icon: 'OC',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    hoverBorder: 'hover:border-purple-500/50',
    description: 'Claude Code workflow for any LLM provider',
    detail: "An open-source drop-in for Claude Code that routes to any OpenAI-compatible API. Lets you run the same agentic coding workflow on DeepSeek (lower cost), Ollama (fully local, no internet, no API fees), GitHub Models (free tier), or any custom endpoint — without changing how you work. Use it alongside Claude to run mixed-provider agent teams.",
    tags: ['Any LLM provider', 'Ollama (local / free)', 'DeepSeek', 'GitHub Models', 'Cost optimisation'],
    billingUrl: 'https://github.com/Gitlawb/openclaude',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    command: 'ollama',
    icon: 'LM',
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    hoverBorder: 'hover:border-teal-500/50',
    description: 'Run LLMs locally — no API key, no internet',
    detail: "Starts the Ollama local model server on port 11434. On first launch, automatically pulls qwen2.5-coder:7b (~4 GB) if no models are installed — just press Enter to accept or Ctrl+C to pull a different model. Once running, point OpenClaude at http://localhost:11434 to run agentic coding workflows completely offline and for free.",
    tags: ['100% local', 'No API key', 'OpenAI-compatible API', 'Llama / Mistral / Qwen', 'Works with OpenClaude'],
    billingUrl: 'https://ollama.com/library',
  },
  {
    id: 'mirofish',
    name: 'MiroFish',
    command: 'mirofish',
    icon: 'MF',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
    hoverBorder: 'hover:border-violet-500/50',
    description: 'Swarm-intelligence prediction engine',
    detail: "Spins up MiroFish via Docker — a multi-agent simulation platform that seeds a knowledge graph from documents, spawns hundreds of autonomous agent personas, runs multi-round social simulations, and outputs structured prediction reports. Requires Docker Desktop. Runs on port 3001 (port 3000 is reserved for OmniAgent Studio).",
    tags: ['Multi-agent swarm', 'Knowledge graph', 'Prediction reports', 'Docker', 'LLM-agnostic'],
    billingUrl: 'https://github.com/666ghj/MiroFish',
  },
];

export default function ToolsPage() {
  const { projectPath } = useWorkspace();
  const [tipDismissed, setTipDismissed] = useState(false);

  // Restore dismissed state from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTipDismissed(localStorage.getItem('omni-tools-tip-dismissed') === 'true');
    }
  }, []);

  const dismissTip = () => {
    setTipDismissed(true);
    localStorage.setItem('omni-tools-tip-dismissed', 'true');
  };

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

        {/* Beginner tip */}
        {!tipDismissed && (
          <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-4 flex items-start gap-3">
            <div id="tools-tip-text" className="flex-1 text-[13px] text-zinc-400 leading-relaxed">
              New here? Start with <span className="text-zinc-200 font-medium">Claude Code</span> — it&apos;s the most capable and works great for any coding task. Just click the card, and a terminal window will open ready to go.
            </div>
            <button
              onClick={dismissTip}
              className="shrink-0 p-1 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Dismiss tip"
              aria-describedby="tools-tip-text"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

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
