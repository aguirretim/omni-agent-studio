'use client';

import { useState } from 'react';
import Link from 'next/link';

import { FileText, Terminal, Bot, FolderGit2, Sparkles, ArrowRight, CheckCircle2, FolderOpen, ChevronRight } from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';
import WorkspaceSelector from '@/components/layout/WorkspaceSelector';
import HowToUse from '@/components/layout/HowToUse';

const quickActions = [
  {
    label: 'AI Instructions',
    sublabel: 'Step 2',
    description: 'Tell the AI what your project is about and what rules to follow. Every AI tool reads this automatically.',
    href: '/context',
    icon: FileText,
    accent: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/50',
    bg: 'bg-emerald-500/5',
    recommended: true,
  },
  {
    label: 'AI Tools',
    sublabel: 'Step 3',
    description: 'Open Claude Code, Gemini CLI, or other AI assistants. They\'ll start up with your instructions already loaded.',
    href: '/tools',
    icon: Terminal,
    accent: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
    bg: 'bg-blue-500/5',
    recommended: false,
  },
  {
    label: 'Agent Teams',
    sublabel: 'Advanced',
    description: 'Have multiple AI assistants work together on a task — one plans, others build, test, and review.',
    href: '/agents',
    icon: Bot,
    accent: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/50',
    bg: '',
    recommended: false,
  },
  {
    label: 'Save Work',
    sublabel: 'Git commit',
    description: 'Create a save point for your project using git. Like hitting Save in a game — you can always come back to this point.',
    href: '/sessions',
    icon: FolderGit2,
    accent: 'text-amber-400',
    hoverBorder: 'hover:border-amber-500/50',
    bg: '',
    recommended: false,
  },
];

const steps = [
  {
    number: '1',
    title: 'Pick a folder',
    description: 'Use the path bar above — click the folder icon and navigate to your project. No project yet? Create an empty folder anywhere on your computer.',
    icon: FolderOpen,
    color: 'text-blue-400',
    ring: 'ring-blue-500/30',
  },
  {
    number: '2',
    title: 'Write AI instructions',
    description: 'Go to AI Instructions and describe your project. What is it? What rules should the AI follow? This gets automatically shared with every AI tool you launch.',
    icon: FileText,
    color: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  {
    number: '3',
    title: 'Launch an AI assistant',
    description: 'Open Claude Code or another AI from the AI Tools page. It will read your instructions and start helping right away.',
    icon: Terminal,
    color: 'text-violet-400',
    ring: 'ring-violet-500/30',
  },
];

const faqs = [
  {
    q: 'What is a workspace?',
    a: 'It\'s the folder on your computer where your project lives. OmniAgent Studio reads files from that folder and saves your AI instructions there.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. The AI assistants handle the code. You describe what you want to build and they figure out the implementation.',
  },
  {
    q: 'What AI tools does this work with?',
    a: 'Claude Code, Gemini CLI, OpenCode, and Codex CLI. You can install any of them from the AI Tools page.',
  },
];

export default function HomePage() {
  const { projectPath, setSyncStatus } = useWorkspace();
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleConnect = () => {
    setSyncStatus('Context loaded');
  };

  // Extract just the folder name from the path for display
  const folderName = projectPath
    ? projectPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? projectPath
    : '';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-5 max-w-[900px] mx-auto w-full">

        {/* Workspace Selector */}
        <WorkspaceSelector onConnect={handleConnect} />
        {!projectPath && (
          <p className="text-[11px] text-zinc-600 -mt-2 px-1">
            A workspace is the folder where your project lives. If you don&apos;t have one, create an empty folder anywhere on your computer first.
          </p>
        )}

        {/* ── NO WORKSPACE: Welcome + Setup Guide ── */}
        {!projectPath && (
          <>
            {/* Hero card */}
            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-zinc-400" />
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Getting started</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Welcome to OmniAgent Studio</h2>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-5 max-w-[520px]">
                OmniAgent Studio is a control panel for AI coding tools. Connect your project folder, write a set of instructions for the AI, then launch Claude Code or other assistants — they all read the same instructions automatically.
              </p>

              {/* 3-step cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.number} className="bg-[var(--c-inset)] border border-[var(--c-border)] rounded-lg p-4 flex flex-col gap-2">
                      <div className={`w-8 h-8 rounded-lg ring-2 ${step.ring} bg-[var(--c-bg)] flex items-center justify-center`}>
                        <Icon size={15} className={step.color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Step {step.number}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{step.title}</h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setIsHowToUseOpen(true)}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold px-4 py-2 transition-colors"
                >
                  Full guide
                  <ArrowRight size={12} />
                </button>
                <span className="text-[11px] text-zinc-600">or just pick a folder above to start</span>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--c-border)]">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Common questions</span>
              </div>
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-[var(--c-border)] last:border-b-0">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-[var(--c-inset)] transition-colors"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-[13px] font-medium text-zinc-300">{faq.q}</span>
                    <ChevronRight
                      size={14}
                      className={`text-zinc-600 shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-3 text-[12px] text-zinc-400 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── WORKSPACE CONNECTED: Dashboard ── */}
        {projectPath && (
          <>
            {/* Connected banner */}
            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-200 truncate">
                  Connected: <span className="text-emerald-400">{folderName}</span>
                </p>
                <p className="text-[11px] text-zinc-500 font-mono truncate">{projectPath}</p>
              </div>
              <button
                onClick={() => setIsHowToUseOpen(true)}
                className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                How to use
              </button>
            </div>

            {/* Suggested next step */}
            <div className="bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-5">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Suggested next step</p>
              <Link
                href="/context"
                className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-200">Write your AI instructions</p>
                  <p className="text-[11px] text-zinc-500">Describe your project so every AI tool knows what you&apos;re building</p>
                </div>
                <ArrowRight size={14} className="text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
              </Link>
            </div>

            {/* All actions grid */}
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-0.5">Everything you can do</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={`${action.bg} bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl p-5 ${action.hoverBorder} transition-all cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Icon size={18} className={action.accent} />
                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{action.sublabel}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-200 mb-1">{action.label}</h3>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{action.description}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <HowToUse isOpen={isHowToUseOpen} onClose={() => setIsHowToUseOpen(false)} />
      </div>
    </div>
  );
}
