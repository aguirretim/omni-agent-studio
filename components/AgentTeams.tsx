'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users, Zap, Play, Loader2, CheckCircle2, AlertCircle,
  ChevronUp, ChevronDown, FileCode2, Monitor, Info,
  RefreshCw, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WslStatus {
  wslAvailable: boolean;
  distroInstalled: boolean;
  tmuxInstalled: boolean;
}

interface AgentTeamsProps {
  projectPath: string;
  setSyncStatus: (msg: string | null) => void;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
      ok
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-zinc-800 text-zinc-500 border-zinc-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      {label}
    </span>
  );
}

export default function AgentTeams({ projectPath, setSyncStatus }: AgentTeamsProps) {
  // Feature setup
  const [isEnabled, setIsEnabled] = useState(false);
  const [skillsInstalled, setSkillsInstalled] = useState<Record<string, 'missing' | 'current' | 'outdated'>>({});
  const [isEnabling, setIsEnabling] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<string | null>(null);

  // Panel state
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'launch' | 'setup' | 'guide'>('launch');

  // Launch config
  const [agentCount, setAgentCount] = useState<number | 'auto'>('auto');

  // WSL / tmux
  const [wslStatus, setWslStatus] = useState<WslStatus | null>(null);
  const [isCheckingWsl, setIsCheckingWsl] = useState(false);
  const [isInstallingWsl, setIsInstallingWsl] = useState(false);
  const [isInstallingTmux, setIsInstallingTmux] = useState(false);
  const [wslOutput, setWslOutput] = useState('');

  const wslOutputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wslOutputRef.current) wslOutputRef.current.scrollTop = wslOutputRef.current.scrollHeight;
  }, [wslOutput]);

  const flash = (msg: string) => {
    setSyncStatus(msg);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Sync enabled/installed state from disk on mount and when projectPath changes
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-status', projectPath }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setIsEnabled(!!data.isEnabled);
      if (data.skills) setSkillsInstalled(data.skills);
    } catch {}
  }, [projectPath]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const checkWsl = useCallback(async () => {
    setIsCheckingWsl(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-wsl' }),
      });
      const data = await res.json();
      if (res.ok) setWslStatus(data);
    } catch {
      flash('WSL check failed');
    } finally {
      setIsCheckingWsl(false);
    }
  }, []);

  // Auto-check WSL when setup tab opens
  useEffect(() => {
    if (activeTab === 'setup' && !wslStatus) checkWsl();
  }, [activeTab, wslStatus, checkWsl]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable' }),
      });
      const data = await res.json();
      if (res.ok) { setIsEnabled(true); flash('Agent teams enabled in ~/.claude/settings.json'); checkStatus(); }
      else flash(`Error: ${data.error}`);
    } catch { flash('Failed to enable agent teams'); }
    finally { setIsEnabling(false); }
  };

  const handleInstallSkill = async (skillName: string) => {
    if (!projectPath) { flash('Set workspace first'); return; }
    setInstallingSkill(skillName);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-skill', projectPath, skillName }),
      });
      const data = await res.json();
      if (res.ok) {
        setSkillsInstalled(prev => ({ ...prev, [skillName]: 'current' }));
        flash(`Installed → .claude/commands/${data.filename}`);
        checkStatus();
      } else flash(`Error: ${data.error}`);
    } catch { flash('Failed to install skill'); }
    finally { setInstallingSkill(null); }
  };

  const handleInstallWsl = async () => {
    setIsInstallingWsl(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-wsl' }),
      });
      const data = await res.json();
      if (res.ok) flash(data.message);
      else flash(`Error: ${data.error}`);
    } catch { flash('WSL install failed'); }
    finally { setIsInstallingWsl(false); }
  };

  const handleInstallTmux = async () => {
    setIsInstallingTmux(true);
    setWslOutput('');
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-tmux' }),
      });
      if (!res.ok || !res.body) { flash('tmux install failed'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setWslOutput(p => p + decoder.decode(value, { stream: true }));
      }
      // Re-check status after install
      await checkWsl();
    } catch { flash('tmux install failed'); }
    finally { setIsInstallingTmux(false); }
  };

  const handleLaunch = async () => {
    if (!projectPath) return;
    const count = agentCount === 'auto' ? undefined : agentCount;
    flash('Launching agent team terminal...');
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch-terminal', projectPath, agentCount: count }),
      });
      const data = await res.json();
      const modeMsg: Record<string, string> = {
        'wt-tmux': 'Windows Terminal opened — split panes will appear as agents spawn',
        'cmd-tmux': 'tmux terminal opened — split panes will appear as agents spawn',
        'wt-cmd':  'Windows Terminal opened (no split panes — install tmux for that)',
        'cmd':     'Terminal opened — install WSL + tmux for split-pane view',
      };
      flash(modeMsg[data.mode] ?? 'Agent team terminal launched');
    } catch { flash('Failed to launch terminal'); }
  };

  const allReady = wslStatus?.wslAvailable && wslStatus?.distroInstalled && wslStatus?.tmuxInstalled;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <button
        className="w-full h-12 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4 hover:bg-[#161618] transition-colors"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Users size={15} className="text-orange-400" />
            Agent Teams
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
            isEnabled
              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}>
            {isEnabled ? 'ENABLED' : 'EXPERIMENTAL'}
          </span>
          {allReady && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              SPLIT-PANE READY
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">Claude Code only</span>
          {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* ── Tabs ── */}
            <div className="flex border-b border-[#27272a] bg-[#0f0f11]">
              {(['launch', 'setup', 'guide'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'text-orange-400 border-orange-500'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {tab === 'setup' ? 'Split-Pane Setup' : tab === 'guide' ? 'How It Works' : 'Launch'}
                </button>
              ))}
            </div>

            <div className="p-4 bg-[#09090b]">

              {/* ══════════════════════════════════════════════
                  LAUNCH TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'launch' && (
                <div className="flex flex-col gap-4">

                  {/* Feature setup row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleEnable}
                      disabled={isEnabling || isEnabled}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        isEnabled
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 cursor-default'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                      } disabled:opacity-60`}
                    >
                      {isEnabling ? <Loader2 size={12} className="animate-spin" /> : isEnabled ? <CheckCircle2 size={12} /> : <Zap size={12} />}
                      {isEnabled ? 'Feature Enabled' : 'Enable Feature'}
                    </button>

                    {[
                      { key: 'claude-only',    label: '/build',                  title: 'Claude-only agents' },
                      { key: 'hybrid',         label: '/build-hybrid',           title: 'Claude + Gemini + OpenCode' },
                      { key: 'smart-delegate', label: '/build-smart-delegate',   title: 'Auto-routes based on usage' },
                      { key: 'fact-check',     label: '/fact-check',             title: 'Multi-model research & verification' },
                      { key: 'checkpoint',     label: '/checkpoint',             title: 'Sync all context files at any checkpoint' },
                    ].map(({ key, label, title }) => {
                      const status = skillsInstalled[key] ?? 'missing';
                      const isInstalling = installingSkill === key;
                      const isCurrent = status === 'current';
                      const isOutdated = status === 'outdated';
                      return (
                        <button
                          key={key}
                          onClick={() => handleInstallSkill(key)}
                          disabled={isInstalling || !projectPath || isCurrent}
                          title={isOutdated ? `${title} — update available` : title}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            isCurrent
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                              : isOutdated
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/50'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                          } disabled:opacity-60`}
                        >
                          {isInstalling
                            ? <Loader2 size={12} className="animate-spin" />
                            : isCurrent
                              ? <CheckCircle2 size={12} />
                              : <FileCode2 size={12} />}
                          {isCurrent ? `${label} ✓` : isOutdated ? `${label} ↑` : `Install ${label}`}
                        </button>
                      );
                    })}

                    {!isEnabled && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <AlertCircle size={10} /> enable before launching
                      </span>
                    )}
                  </div>

                  {/* Agent count */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Agents</label>
                    <div className="flex items-center gap-1">
                      {(['auto', 2, 3, 4, 6] as const).map(n => (
                        <button
                          key={n}
                          onClick={() => setAgentCount(n)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                            agentCount === n
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >{n === 'auto' ? 'Auto' : n}</button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Opens Claude Code in a terminal. Tell Claude your task there. It can spawn sub-agents in split panes and call Gemini, OpenCode, or Codex as specialist workers — all coordinated through AGENT_TASKS.md.
                  </p>

                  {/* Launch button */}
                  <button
                    onClick={handleLaunch}
                    disabled={!projectPath}
                    className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10"
                  >
                    <Play size={15} /> Launch Agent Team ({agentCount === 'auto' ? 'Auto' : agentCount} agents)
                  </button>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  SPLIT-PANE SETUP TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'setup' && (
                <div className="flex flex-col gap-5">

                  <div className="flex items-start gap-3 p-3 bg-[#121214] border border-[#27272a] rounded-lg">
                    <Monitor size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Agent Teams can display each agent in its own split pane — like a real dev team visible at once.
                      On Windows this requires <strong className="text-zinc-200">WSL</strong> (Windows Subsystem for Linux) and <strong className="text-zinc-200">tmux</strong>.
                      Install both below and Claude Code will automatically use split-pane view when launching teams.
                    </p>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge ok={!!wslStatus?.wslAvailable} label="WSL" />
                    <StatusBadge ok={!!wslStatus?.distroInstalled} label="Linux Distro" />
                    <StatusBadge ok={!!wslStatus?.tmuxInstalled} label="tmux" />
                    {allReady && <StatusBadge ok label="Split-pane ready ✓" />}
                    <button
                      onClick={checkWsl}
                      disabled={isCheckingWsl}
                      className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {isCheckingWsl
                        ? <Loader2 size={11} className="animate-spin" />
                        : <RefreshCw size={11} />}
                      Refresh
                    </button>
                  </div>

                  {/* Step 1 — WSL */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        wslStatus?.wslAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>1</span>
                      <span className="text-xs font-semibold text-zinc-300">Install WSL (Windows Subsystem for Linux)</span>
                      {wslStatus?.wslAvailable && <CheckCircle2 size={13} className="text-emerald-400" />}
                    </div>
                    {!wslStatus?.wslAvailable && (
                      <div className="ml-7 flex flex-col gap-2">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          WSL is built into Windows 10/11. Clicking Install will open a UAC prompt — approve it, then <strong className="text-zinc-300">restart Windows</strong> when it finishes.
                        </p>
                        <button
                          onClick={handleInstallWsl}
                          disabled={isInstallingWsl}
                          className="self-start flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        >
                          {isInstallingWsl ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          Install WSL (requires admin)
                        </button>
                        <p className="text-[10px] text-zinc-600">
                          Or open an admin PowerShell and run: <code className="text-zinc-400">wsl --install</code>
                        </p>
                      </div>
                    )}
                    {wslStatus?.wslAvailable && !wslStatus?.distroInstalled && (
                      <div className="ml-7 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-[11px] text-amber-400/80 leading-relaxed">
                          WSL is installed but no Linux distro found. Open the Microsoft Store, install <strong>Ubuntu</strong>, and launch it once to finish setup. Then click Refresh above.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Step 2 — tmux */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        wslStatus?.tmuxInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>2</span>
                      <span className="text-xs font-semibold text-zinc-300">Install tmux inside WSL</span>
                      {wslStatus?.tmuxInstalled && <CheckCircle2 size={13} className="text-emerald-400" />}
                    </div>
                    {wslStatus?.distroInstalled && !wslStatus?.tmuxInstalled && (
                      <div className="ml-7 flex flex-col gap-2">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          tmux is the terminal multiplexer that creates split panes. Install it with one click — output streams here.
                        </p>
                        <button
                          onClick={handleInstallTmux}
                          disabled={isInstallingTmux}
                          className="self-start flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                        >
                          {isInstallingTmux ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          Install tmux via apt
                        </button>
                      </div>
                    )}
                    {!wslStatus?.distroInstalled && (
                      <p className="ml-7 text-[10px] text-zinc-600">Complete Step 1 first.</p>
                    )}
                  </div>

                  {/* tmux install output */}
                  <AnimatePresence>
                    {wslOutput && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <div ref={wslOutputRef} className="bg-[#0c0c0e] border border-[#27272a] rounded-lg p-3 max-h-40 overflow-y-auto">
                          <pre className="text-[11px] font-mono text-zinc-500 whitespace-pre-wrap leading-relaxed">{wslOutput}</pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* All done */}
                  {allReady && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400/80 leading-relaxed">
                        All dependencies ready! Switch to the <strong>Launch</strong> tab — when you click &ldquo;Launch Agent Team (Terminal)&rdquo;, Claude Code will automatically open each agent in its own split pane.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  HOW IT WORKS TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'guide' && (
                <div className="flex flex-col gap-5 text-xs text-zinc-400 leading-relaxed">

                  <div className="flex items-start gap-3 p-3 bg-[#121214] border border-[#27272a] rounded-lg">
                    <Info size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <p>
                      Agent Teams is an <strong className="text-zinc-200">experimental Claude Code feature</strong> where a lead agent autonomously forms a team, assigns roles, and coordinates work through a shared task list — far beyond regular sub-agents.
                    </p>
                  </div>

                  {[
                    {
                      step: '1',
                      title: 'Enable & Install Skills (once per project)',
                      color: 'text-orange-400',
                      body: (
                        <>
                          On the <strong className="text-zinc-200">Launch</strong> tab, click <strong className="text-zinc-200">Enable Feature</strong> — this writes <code className="text-orange-300">experimental.agentTeams: true</code> to <code className="text-zinc-300">~/.claude/settings.json</code>.
                          Then install whichever skills you need: <strong className="text-zinc-200">/build</strong> (Claude-only), <strong className="text-zinc-200">/build-hybrid</strong>, <strong className="text-zinc-200">/build-smart-delegate</strong>, or <strong className="text-zinc-200">/fact-check</strong> for multi-model research. Each writes a prompt file into <code className="text-zinc-300">.claude/commands/</code>.
                        </>
                      ),
                    },
                    {
                      step: '2',
                      title: 'Write a clear plan',
                      color: 'text-blue-400',
                      body: (
                        <>
                          Paste your plan in the textarea. Be specific: list each component, its tech stack, and what it depends on.
                          Example: <em className="text-zinc-500">&ldquo;Build auth with: 1) PostgreSQL schema, 2) JWT API, 3) React forms&rdquo;</em>.
                          The more detail you give, the smarter the team composition will be.
                        </>
                      ),
                    },
                    {
                      step: '3',
                      title: 'Launch → Contract-First Spawning',
                      color: 'text-violet-400',
                      body: (
                        <>
                          The lead agent analyzes your plan, identifies dependency chains, and spawns agents in the right order.
                          It won&apos;t start the backend agent until the database agent emits its <strong className="text-zinc-200">contract</strong> (schema + types) — preventing agents from building on incorrect assumptions.
                        </>
                      ),
                    },
                    {
                      step: '4',
                      title: 'Agents collaborate via AGENT_TASKS.md',
                      color: 'text-emerald-400',
                      body: (
                        <>
                          The lead agent creates <code className="text-zinc-300">AGENT_TASKS.md</code> at your project root before any agents start. All agents read and update this file to track progress, announce contracts, and avoid stepping on each other&apos;s toes.
                        </>
                      ),
                    },
                    {
                      step: '5',
                      title: 'Hybrid teams — Claude leads, other tools assist',
                      color: 'text-amber-400',
                      body: (
                        <>
                          Claude is always the lead. But it can call <strong className="text-zinc-200">Gemini CLI</strong> as a bash subprocess for large-context codebase analysis (up to 1M tokens), and <strong className="text-zinc-200">OpenCode or Codex</strong> for generating isolated, fully-specified files. Claude reviews all specialist output before treating it as a contract — only Claude sub-agents can self-correct. The skill file teaches Claude exactly when and how to delegate to each tool.
                        </>
                      ),
                    },
                    {
                      step: '6',
                      title: '/fact-check — multi-model research & verification',
                      color: 'text-sky-400',
                      body: (
                        <>
                          Run <code className="text-sky-300">/fact-check [claim]</code> to have every available model research a claim <strong className="text-zinc-200">independently</strong> — preventing anchoring bias. Claude, Gemini, and Codex each write findings to temp files. Claude then cross-verifies them, flags contradictions, and saves a structured <code className="text-zinc-300">FACT_CHECK_[topic].md</code> report with confirmed findings, disputed claims, and what remains unresolved.
                        </>
                      ),
                    },
                    {
                      step: '7',
                      title: '/checkpoint — sync all context at any point',
                      color: 'text-violet-400',
                      body: (
                        <>
                          Run <code className="text-violet-300">/checkpoint</code> at any point — mid-session or end-of-session — to audit git changes, update the Session Log and Active Goals in <code className="text-zinc-300">.claude.md</code>, then mirror to <code className="text-zinc-300">.gemini.md</code> and <code className="text-zinc-300">agents.md</code>. Every AI tool that opens the folder next starts with a complete, accurate picture of where things stand.
                        </>
                      ),
                    },
                  ].map(({ step, title, color, body }) => (
                    <div key={step} className="flex gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 bg-zinc-800 ${color}`}>
                        {step}
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-300 mb-1">{title}</p>
                        <p className="text-[11px] leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-[#121214] border border-zinc-800 rounded-lg">
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      <strong className="text-zinc-400">Pro tip:</strong> Launch an interactive Claude Code terminal from the <strong className="text-zinc-500">AI Tools</strong> page first, explore the codebase, then paste a specific, detailed plan into Agent Teams. The more concrete your plan, the better the team composition.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
