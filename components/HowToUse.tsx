'use client';

import { X, Bot, Terminal, FolderGit2, Users, Play, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

type HowToUseProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HowToUse({ isOpen, onClose }: HowToUseProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-3xl bg-[#09090b] border border-[#27272a] rounded-xl shadow-2xl flex flex-col h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="h-14 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-6 shrink-0">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Bot size={16} className="text-emerald-400" />
              How to use OmniAgent Studio
            </h2>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 bg-[#09090b] space-y-8">
            
            <section>
              <h3 className="text-lg font-medium text-zinc-100 mb-3 border-b border-zinc-800 pb-2">Philosophy</h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                OmniAgent Studio solves the problem of scattered context. Never use browser-based AI chats for deep project work again. By running AI models in your terminal inside your project folder, you completely own your context files and can orchestrate multiple agents at once. 
              </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <FolderGit2 size={16} className="text-amber-400" />
                  1. Connect Workspace
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Start by using the folder icon at the top to select the absolute path of the project you are working on. This mounts the workspace to the studio so the AI agents know where to execute.
                </p>
              </div>

              <div className="space-y-3 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Bot size={16} className="text-emerald-400" />
                  2. Write Shared AI Context
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The big text editor is your <strong>Shared AI Context</strong>. It acts as the shared brain for all your AI agents.
                  Write your overarching project instructions here. When you click &quot;Save &amp; Sync&quot;, OmniAgent Studio saves this text as <code className="text-emerald-300">.gemini.md</code>, <code className="text-orange-300">.claude.md</code>, and <code className="text-zinc-300">agents.md</code> inside your workspace. Now, no matter which AI CLI you launch, they all wake up with the exact same instructions and context!
                </p>
              </div>

              <div className="space-y-3 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Terminal size={16} className="text-blue-400" />
                  3. Launch AI Tools
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Under the &quot;AI Tools&quot; page, click a tool card (like Claude Code or OpenCode) to instantly launch a new interactive Windows terminal. They will automatically boot inside your folder and read the Shared AI Context rules you just saved, ready to code!
                </p>
              </div>

              <div className="space-y-3 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Users size={16} className="text-violet-400" />
                  4. Orchestrate Agent Teams
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  On the <strong className="text-zinc-200">Agent Teams</strong> page, enable the feature, install the <code className="text-orange-300">/build-with-agent-team</code> skill, then describe what to build. A lead agent will decompose your plan, spawn specialized agents in dependency order, and coordinate them through a shared task list — all automatically.
                </p>
              </div>

            </section>

            {/* Agent Teams Section */}
            <section>
              <h3 className="text-lg font-medium text-zinc-100 mb-3 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <Users size={16} className="text-orange-400" />
                Agent Teams (Experimental)
              </h3>
              <p className="text-[13px] text-zinc-400 leading-relaxed mb-5">
                Agent Teams lets Claude Code autonomously form a multi-agent team, assign roles, and coordinate work through a shared task list. Unlike sub-agents (which work in isolation), team agents <strong className="text-zinc-200">talk to each other</strong> — a backend agent will wait for the database agent&apos;s schema before writing API routes, for example.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="space-y-2 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center">1</span>
                    Enable the feature
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    In the <strong className="text-zinc-200">Agent Teams</strong> panel, click <strong className="text-zinc-200">Enable Feature</strong>. This writes <code className="text-orange-300">experimental.agentTeams: true</code> to <code className="text-zinc-300">~/.claude/settings.json</code>. Only needs to be done once per machine.
                  </p>
                </div>

                <div className="space-y-2 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center">2</span>
                    Install the /build skill
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Click <strong className="text-zinc-200">Install /build Skill</strong>. This writes the contract-first orchestration prompt to <code className="text-zinc-300">.claude/commands/build-with-agent-team.md</code> in your project — making <code className="text-zinc-300">/build-with-agent-team</code> available inside Claude Code.
                  </p>
                </div>

                <div className="space-y-2 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold flex items-center justify-center">3</span>
                    Write a detailed plan
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Paste your plan in the textarea. The more specific, the better the team composition. List each component and its dependencies, e.g.: <em className="text-zinc-500">&ldquo;1) PostgreSQL schema, 2) JWT API endpoints, 3) React login forms&rdquo;</em>. Choose Auto agents or pick a count (2–6).
                  </p>
                </div>

                <div className="space-y-2 p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">4</span>
                    Launch: Terminal or Headless
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">Terminal mode</strong> opens Claude Code interactively — type <code className="text-zinc-300">/build-with-agent-team [plan]</code> to start.
                    <strong className="text-zinc-200"> Headless mode</strong> runs autonomously and streams all output to the panel UI. Use headless for bounded tasks, terminal for complex builds where you want to stay in the loop.
                  </p>
                </div>
              </div>

              {/* Contract-First explanation */}
              <div className="p-4 border border-orange-500/20 bg-orange-500/5 rounded-lg mb-4">
                <p className="text-xs text-zinc-300 font-semibold mb-2">How Contract-First Spawning works</p>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                  The lead agent doesn&apos;t launch all agents at once. It spawns them in dependency order and waits for each to emit a <strong className="text-zinc-200">contract</strong> (actual code, schema, or typed interfaces) before the next agent starts — preventing downstream agents from building on incorrect assumptions.
                </p>
                <div className="font-mono text-[11px] text-zinc-500 space-y-0.5">
                  <div><span className="text-orange-400">db-agent</span> → emits: schema.sql + TypeScript types</div>
                  <div className="pl-4 text-zinc-600">↓ contract received</div>
                  <div><span className="text-blue-400">backend-agent</span> → emits: OpenAPI spec + route handlers</div>
                  <div className="pl-4 text-zinc-600">↓ contract received</div>
                  <div><span className="text-emerald-400">frontend-agent</span> → builds UI against the real API spec</div>
                </div>
              </div>

              {/* Split-pane setup */}
              <div className="p-4 border border-[#27272a] bg-[#121214] rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                  <Monitor size={14} className="text-zinc-400" />
                  Want split-pane view? Install WSL + tmux
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  On Windows, each agent can appear in its own visible terminal pane (like the video demo) if you have <strong className="text-zinc-200">WSL</strong> and <strong className="text-zinc-200">tmux</strong> installed. Go to the <strong className="text-orange-400">Agent Teams → Split-Pane Setup</strong> tab for a one-click installer that handles everything automatically.
                </p>
              </div>
            </section>

          </div>
          
          <div className="h-16 border-t border-[#27272a] bg-[#121214] flex items-center justify-end px-6 shrink-0">
             <button 
                onClick={onClose}
                className="px-6 py-2 bg-zinc-200 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
             >
               Start Orchestrating
               <Play size={14} />
             </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
