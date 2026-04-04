'use client';

import { X, Bot, Terminal, FolderGit2, Users, Play, Monitor, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

type HowToUseProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HowToUse({ isOpen, onClose }: HowToUseProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const savedFocusRef = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save/restore focus + focus trap
  useEffect(() => {
    if (isOpen) {
      savedFocusRef.current = document.activeElement as HTMLElement;
    } else {
      savedFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    if (el) el.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = el?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-use-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-full max-w-3xl bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-2xl flex flex-col max-h-[80dvh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-14 border-b border-[var(--c-border)] bg-[var(--c-inset)] flex items-center justify-between px-6 shrink-0">
              <h2 id="how-to-use-title" className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Bot size={16} className="text-emerald-400" />
                How to use OmniAgent Studio
              </h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 -mr-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-[var(--c-bg)] space-y-8">

              <section>
                <h3 className="text-lg font-medium text-zinc-100 mb-3 border-b border-zinc-800 pb-2">What is OmniAgent Studio?</h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  OmniAgent Studio is a control panel that runs AI coding assistants directly inside your project folder. Instead of copy-pasting code into a website chat, the AI can see and edit your actual files -- and you can run several AI tools at the same time, all sharing the same instructions.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="space-y-3 p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <FolderGit2 size={16} className="text-amber-400" />
                    1. Connect Workspace
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Start by using the folder icon at the top to select your project folder. This tells the app where your project is, so the AI knows where to look and work.
                  </p>
                </div>

                <div className="space-y-3 p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Bot size={16} className="text-emerald-400" />
                    2. Write Your AI Instructions
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    The big text editor is your <strong>Shared AI Instructions</strong>. Write your project description, goals, and any rules you want the AI to follow. The app saves these instructions to your project folder automatically so every AI tool you launch reads the same thing.
                  </p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Saved as <code className="text-emerald-300">.claude.md</code>, <code className="text-zinc-400">.gemini.md</code>, and <code className="text-zinc-400">agents.md</code> in your workspace.
                  </p>
                </div>

                <div className="space-y-3 p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Terminal size={16} className="text-blue-400" />
                    3. Launch AI Tools
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Under the &quot;AI Tools&quot; page, click a tool card (like Claude Code or Gemini) to open a new terminal window. The AI will start up inside your project folder and read the instructions you just wrote.
                  </p>
                </div>

                <div className="space-y-3 p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Users size={16} className="text-violet-400" />
                    4. Use Agent Teams
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    On the <strong className="text-zinc-200">Agent Teams</strong> page, enable the feature, install the <code className="text-orange-300">/build-with-agent-team</code> skill, then describe what to build. The AI will break your plan into tasks and run multiple AI assistants together, each handling a different part -- all automatically.
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
                  Agent Teams automatically splits a task between multiple AI assistants and coordinates them. The AI assistants share progress with each other -- for example, one AI will finish building the database before a second AI starts writing the server code that depends on it.
                </p>

                <p className="text-[13px] text-zinc-400 leading-relaxed mb-5">
                  To use it: go to the <strong className="text-zinc-200">Agent Teams</strong> page, click <strong className="text-zinc-200">Enable Feature</strong>, then install the skill and describe your plan in the text box. Click <strong className="text-zinc-200">Launch Agent Team</strong> and a terminal window will open with everything ready to go.
                </p>

                {/* Contract-First explanation */}
                <div className="p-4 border border-orange-500/20 bg-orange-500/5 rounded-lg mb-4">
                  <p className="text-xs text-zinc-300 font-semibold mb-2">How the AI assistants stay in sync</p>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">
                    The AI assistants work in the right order. For example, one AI designs the database first, then a second AI builds the server using that design -- so nothing is built on guesswork. Each assistant waits for the previous one to finish before starting its part.
                  </p>
                </div>

                {/* Split-pane setup */}
                <div className="p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                    <Monitor size={14} className="text-zinc-400" />
                    Want split-pane view? Install WSL + tmux
                  </div>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">
                    On Windows, each assistant can appear in its own visible terminal pane if you have <strong className="text-zinc-200">WSL</strong> and <strong className="text-zinc-200">tmux</strong> installed. Go to the <strong className="text-orange-400">Agent Teams &rarr; Split-Pane Setup</strong> tab for a one-click installer that handles everything automatically.
                  </p>
                </div>
              </section>

              {/* Troubleshooting */}
              <section>
                <h3 className="text-lg font-medium text-zinc-100 mb-3 border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-400" />
                  Troubleshooting
                </h3>

                <div className="space-y-4">
                  <div className="p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                    <p className="text-xs text-zinc-300 font-semibold mb-2">Claude Code won&apos;t start or login is broken</p>
                    <p className="text-[12px] text-zinc-400 leading-relaxed mb-2">
                      Double-click <code className="text-emerald-300">reset.bat</code> in the app folder. It removes your Claude Code config and reinstalls it cleanly. You will need to run <code className="text-zinc-300">claude login</code> again afterward.
                    </p>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Do <strong>not</strong> try to delete folders manually with <code>rmdir</code> in PowerShell &mdash; that command uses different syntax in PowerShell vs CMD and will show errors. Use <code className="text-emerald-300">reset.bat</code> instead.
                    </p>
                  </div>

                  <div className="p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                    <p className="text-xs text-zinc-300 font-semibold mb-2">Terminal opens but the AI tool is missing</p>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">
                      The app auto-installs missing tools when you launch them. If that fails, open any terminal and run: <code className="text-zinc-300">npm install -g @anthropic-ai/claude-code</code> (for Claude Code), then try again.
                    </p>
                  </div>

                  <div className="p-4 border border-[var(--c-border)] bg-[var(--c-inset)] rounded-lg">
                    <p className="text-xs text-zinc-300 font-semibold mb-2">App won&apos;t start at all</p>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">
                      Make sure <strong className="text-zinc-200">Node.js 18+</strong> is installed, then double-click <code className="text-emerald-300">run.bat</code>. It handles everything automatically &mdash; including installing Node.js and Git if needed.
                    </p>
                  </div>
                </div>
              </section>

            </div>

            <div className="h-16 border-t border-[var(--c-border)] bg-[var(--c-inset)] flex items-center justify-end px-6 shrink-0">
               <button
                  onClick={onClose}
                  className="px-6 py-2 bg-zinc-200 hover:bg-white text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
               >
                 Got it, let&apos;s go!
                 <Play size={14} />
               </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
