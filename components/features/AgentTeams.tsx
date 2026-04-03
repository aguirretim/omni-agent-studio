'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import {
  Users, Zap, Play, Loader2, CheckCircle2, AlertCircle,
  ChevronUp, ChevronDown, FileCode2, Monitor, Info,
  RefreshCw, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitPanePreview from '@/components/features/SplitPanePreview';
import { useAudioNotification } from '@/components/ui/useAudioNotification';

interface WslStatus {
  wslAvailable: boolean;
  distroInstalled: boolean;
  tmuxInstalled: boolean;
  claudeInWsl: boolean;
  needsRestart?: boolean;
}

interface SkillPack {
  id: string;
  name: string;
  repo: string;
  repoUrl: string;
  stars: number;
  description: string;
  skillCount: number;
  skills: Array<{ key: string; label: string; description: string; filename: string }>;
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
  const [isInstallingAll, setIsInstallingAll] = useState(false);

  // Panel state
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'launch' | 'setup' | 'guide' | 'preview' | 'library'>('launch');

  // Launch config
  const [agentCount, setAgentCount] = useState<number | 'auto'>('auto');
  const [plan, setPlan] = useState('');
  const [terminalType, setTerminalType] = useState<'auto' | 'wt-tmux' | 'wt-ps' | 'cmd-ps'>('auto');
  const [openclaudeProvider, setOpenclaudeProvider] = useState<'openai' | 'gemini' | 'deepseek' | 'ollama' | 'github'>('openai');
  const [isLaunchingOc, setIsLaunchingOc] = useState(false);

  const suggestedSkills = useMemo(() => {
    if (!plan.trim()) return [];
    const text = plan.toLowerCase();
    const matches: Array<{ skill: string; reason: string }> = [];

    const taxonomy: Array<{ keywords: string[]; skills: string[]; reason: string }> = [
      { keywords: ['bug','fix','error','broken','failing','crash'], skills: ['/debug', '/smart-fix'], reason: 'debugging' },
      { keywords: ['review','pull request','merge'], skills: ['/review-pr', '/code-reviewer'], reason: 'code review' },
      { keywords: ['refactor','clean','optimize','restructure'], skills: ['/refactor-clean', '/tech-debt'], reason: 'refactoring' },
      { keywords: ['test','testing','spec','coverage','jest','vitest'], skills: ['/test-gen', '/debug'], reason: 'testing' },
      { keywords: ['ui','ux','design','component','frontend','layout','style'], skills: ['/ux-heuristic-review', '/design-critique'], reason: 'UI/UX' },
      { keywords: ['accessibility','a11y','wcag','aria'], skills: ['/wcag-audit'], reason: 'accessibility' },
      { keywords: ['security','vulnerability','auth','xss','csrf'], skills: ['/security-hardening'], reason: 'security' },
      { keywords: ['explain','document','docs','readme'], skills: ['/explain', '/doc-generate'], reason: 'documentation' },
      { keywords: ['prd','requirements','feature plan','user story'], skills: ['/create-prd', '/convert-prd'], reason: 'planning' },
      { keywords: ['autonomous','loop','iterate','automate','ralph'], skills: ['/ralph', '/create-prd'], reason: 'autonomous loop' },
      { keywords: ['research','literature','survey'], skills: ['/literature-review', '/research-synthesis'], reason: 'research' },
    ];

    const seen = new Set<string>();
    for (const entry of taxonomy) {
      if (entry.keywords.some(k => text.includes(k))) {
        for (const skill of entry.skills) {
          if (!seen.has(skill)) {
            seen.add(skill);
            matches.push({ skill, reason: entry.reason });
          }
        }
      }
    }

    // Always include quality gates for any code-change task (build/implement/add/create/feature)
    const isCodeTask = ['build','implement','add','create','feature','fix','refactor','test'].some(k => text.includes(k));
    if (isCodeTask) {
      if (!seen.has('/test-gen')) matches.push({ skill: '/test-gen', reason: 'quality gate' });
      if (!seen.has('/review-pr')) matches.push({ skill: '/review-pr', reason: 'quality gate' });
      if (!seen.has('/commit')) matches.push({ skill: '/commit', reason: 'final step' });
    }

    return matches.slice(0, 8); // max 8 suggestions
  }, [plan]);

  // WSL / tmux
  const [wslStatus, setWslStatus] = useState<WslStatus | null>(null);
  const [isCheckingWsl, setIsCheckingWsl] = useState(false);
  const [isInstallingWsl, setIsInstallingWsl] = useState(false);
  const [isInstallingDistro, setIsInstallingDistro] = useState(false);
  const [isInstallingTmux, setIsInstallingTmux] = useState(false);
  const [wslOutput, setWslOutput] = useState('');
  const [isPollingDistro, setIsPollingDistro] = useState(false);

  // Skill Library
  const [packs, setPacks] = useState<SkillPack[]>([]);
  const [installingPack, setInstallingPack] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<Record<string, boolean>>({});
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);
  const [isInstallingAllPacks, setIsInstallingAllPacks] = useState(false);
  const [installAllPacksProgress, setInstallAllPacksProgress] = useState<{ done: number; total: number } | null>(null);

  const wslOutputRef = useRef<HTMLDivElement>(null);
  const pollDistroRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  useEffect(() => {
    if (wslOutputRef.current) wslOutputRef.current.scrollTop = wslOutputRef.current.scrollHeight;
  }, [wslOutput]);

  // Stop distro polling once detected; clean up on unmount
  useEffect(() => {
    if (wslStatus?.distroInstalled && pollDistroRef.current) {
      clearInterval(pollDistroRef.current);
      pollDistroRef.current = null;
      setIsPollingDistro(false);
    }
  }, [wslStatus?.distroInstalled]);

  useEffect(() => {
    return () => {
      if (pollDistroRef.current) clearInterval(pollDistroRef.current);
    };
  }, []);

  const chime = useAudioNotification();

  const flash = (msg: string) => {
    setSyncStatus(msg);
    // WorkspaceProvider.setSyncStatus auto-clears after 3s — no extra timer needed
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

  // Check WSL on mount so the Launch tab knows the mode immediately,
  // and re-check whenever the Setup tab opens (catches newly installed distros)
  useEffect(() => { checkWsl(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'setup') checkWsl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const handleInstallAllSkills = async () => {
    if (!projectPath) { flash('Set workspace first'); return; }
    setIsInstallingAll(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-all-skills', projectPath }),
      });
      const data = await res.json();
      if (res.ok) {
        flash(`Installed ${data.count} skills → .claude/commands/`);
        checkStatus();
      } else flash(`Error: ${data.error}`);
    } catch { flash('Failed to install skills'); }
    finally { setIsInstallingAll(false); }
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

  const handleInstallDistro = async () => {
    setIsInstallingDistro(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-distro' }),
      });
      const data = await res.json();
      if (res.ok) {
        flash(data.message);
        // Poll every 8 s for up to 30 attempts (~4 min) until distro is detected
        if (pollDistroRef.current) clearInterval(pollDistroRef.current);
        pollAttemptsRef.current = 0;
        setIsPollingDistro(true);
        pollDistroRef.current = setInterval(async () => {
          pollAttemptsRef.current += 1;
          if (pollAttemptsRef.current > 30) {
            clearInterval(pollDistroRef.current!);
            pollDistroRef.current = null;
            setIsPollingDistro(false);
            return;
          }
          await checkWsl();
        }, 8000);
      } else flash(`Error: ${data.error}`);
    } catch { flash('Ubuntu install failed'); }
    finally { setIsInstallingDistro(false); }
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

  const handleLaunchOpenClaude = async () => {
    if (!projectPath) return;
    setIsLaunchingOc(true);
    flash(`Launching OpenClaude (${openclaudeProvider})...`);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch-openclaude', projectPath, provider: openclaudeProvider }),
      });
      const data = await res.json();
      if (res.ok) {
        flash(`OpenClaude (${openclaudeProvider}) opened`);
        chime();
      } else {
        flash(data.error ?? 'Failed to launch OpenClaude');
      }
    } catch { flash('Failed to launch OpenClaude'); }
    finally { setIsLaunchingOc(false); }
  };

  const handleLaunch = async () => {
    if (!projectPath) return;
    const count = agentCount === 'auto' ? undefined : agentCount;
    flash('Launching agent team terminal...');
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch-terminal', projectPath, agentCount: count, plan: plan.trim() || undefined, terminalType }),
      });
      const data = await res.json();
      const modeMsg: Record<string, string> = {
        'wt-tmux': 'Windows Terminal opened -- split panes will appear as agents spawn',
        'wt-cmd':  'Windows Terminal opened -- teammates inline (Shift+Down to cycle)',
        'cmd':     'PowerShell opened -- teammates inline (Shift+Down to cycle)',
      };
      flash(modeMsg[data.mode] ?? 'Agent team terminal launched');
      chime();
    } catch { flash('Failed to launch terminal'); }
  };

  const loadPacks = useCallback(async () => {
    if (packs.length > 0) return; // already loaded
    setIsLoadingPacks(true);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-packs' }),
      });
      if (res.ok) {
        const data = await res.json();
        setPacks(data.packs || []);
      }
    } catch { /* silent */ }
    finally { setIsLoadingPacks(false); }
  }, [packs.length]);

  const handleInstallPack = async (packId: string) => {
    if (!projectPath) { flash('Set workspace first'); return; }
    setInstallingPack(packId);
    try {
      const res = await fetch('/api/agent-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install-pack', projectPath, packId }),
      });
      const data = await res.json();
      if (res.ok) {
        setInstalledPacks(prev => ({ ...prev, [packId]: true }));
        flash(`Installed ${data.count} skills from ${packId}`);
      } else flash(`Error: ${data.error}`);
    } catch { flash('Failed to install pack'); }
    finally { setInstallingPack(null); }
  };

  const handleInstallAllPacks = async () => {
    if (!projectPath) { flash('Set workspace first'); return; }
    const pending = packs.filter(p => !installedPacks[p.id]);
    if (pending.length === 0) { flash('All library packs already installed'); return; }
    setIsInstallingAllPacks(true);
    setInstallAllPacksProgress({ done: 0, total: pending.length });
    let done = 0;
    for (const pack of pending) {
      setInstallingPack(pack.id);
      try {
        const res = await fetch('/api/agent-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'install-pack', projectPath, packId: pack.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setInstalledPacks(prev => ({ ...prev, [pack.id]: true }));
        } else {
          flash(`Error installing ${pack.id}: ${data.error}`);
        }
      } catch { flash(`Failed to install ${pack.id}`); }
      done++;
      setInstallAllPacksProgress({ done, total: pending.length });
    }
    setInstallingPack(null);
    setIsInstallingAllPacks(false);
    setInstallAllPacksProgress(null);
    flash(`Installed all ${pending.length} library packs`);
    chime();
  };

  const allReady = wslStatus?.wslAvailable && wslStatus?.distroInstalled && wslStatus?.tmuxInstalled && wslStatus?.claudeInWsl;

  const TOTAL_SKILLS = 19;
  const installedSkillCount = Object.values(skillsInstalled).filter(v => v === 'current').length;
  const allSkillsInstalled = installedSkillCount === TOTAL_SKILLS;

  const InstallSkillsButton = () => (
    <button
      onClick={handleInstallAllSkills}
      disabled={isInstallingAll || allSkillsInstalled || !projectPath}
      aria-label={allSkillsInstalled ? 'All skills installed' : installedSkillCount > 0 ? `Install remaining skills, ${installedSkillCount} of ${TOTAL_SKILLS} installed` : 'Install all 19 slash command skills'}
      title="Install all 19 slash commands into .claude/commands/ of your project"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
        allSkillsInstalled
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'
      } disabled:opacity-60`}
    >
      {isInstallingAll
        ? <Loader2 size={12} className="animate-spin" />
        : allSkillsInstalled
          ? <CheckCircle2 size={12} />
          : <FileCode2 size={12} />}
      {isInstallingAll
        ? 'Installing…'
        : allSkillsInstalled
          ? 'All Skills Installed ✓'
          : installedSkillCount > 0
            ? `Install All Skills (${installedSkillCount}/${TOTAL_SKILLS})`
            : 'Install All Skills'}
    </button>
  );

  const TAB_KEYS = ['launch', 'setup', 'guide', 'preview', 'library'] as const;
  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const idx = TAB_KEYS.indexOf(activeTab);
    const next = e.key === 'ArrowRight'
      ? (idx + 1) % TAB_KEYS.length
      : (idx - 1 + TAB_KEYS.length) % TAB_KEYS.length;
    const nextTab = TAB_KEYS[next];
    setActiveTab(nextTab);
    if (nextTab === 'library') loadPacks();
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">

      {/* ── Header ── */}
      <button
        className="w-full h-12 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-4 hover:bg-[#161618] transition-colors"
        onClick={() => setIsExpanded(v => !v)}
        aria-expanded={isExpanded}
        aria-controls="agent-teams-content"
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
            id="agent-teams-content"
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* ── Tabs ── */}
            <div
              role="tablist"
              aria-label="Agent Teams sections"
              onKeyDown={handleTabKeyDown}
              className="flex border-b border-[#27272a] bg-[#0f0f11]"
            >
              {(['launch', 'setup', 'guide', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'text-orange-400 border-orange-500'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {tab === 'setup' ? 'Split-Pane Setup' : tab === 'guide' ? 'How It Works' : tab === 'preview' ? 'Preview' : 'Launch'}
                </button>
              ))}
              <button
                role="tab"
                id="tab-library"
                aria-selected={activeTab === 'library'}
                aria-controls="panel-library"
                tabIndex={activeTab === 'library' ? 0 : -1}
                onClick={() => { setActiveTab('library'); loadPacks(); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  activeTab === 'library'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >Library</button>
            </div>

            <div className="p-4 bg-[#09090b]">

              {/* ══════════════════════════════════════════════
                  LAUNCH TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'launch' && (
                <div role="tabpanel" id="panel-launch" aria-labelledby="tab-launch" tabIndex={0} className="flex flex-col gap-4">

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

                    {InstallSkillsButton()}

                    {!isEnabled && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <AlertCircle size={10} /> enable before launching
                      </span>
                    )}
                  </div>

                  {/* Agent count */}
                  <div className="flex flex-col gap-1.5">
                    <span id="agent-count-label" className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Agents</span>
                    <div role="group" aria-labelledby="agent-count-label" className="flex items-center gap-1">
                      {(['auto', 2, 3, 4, 6] as const).map(n => (
                        <button
                          key={n}
                          onClick={() => setAgentCount(n)}
                          aria-pressed={agentCount === n}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                            agentCount === n
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >{n === 'auto' ? 'Auto' : n}</button>
                      ))}
                    </div>
                  </div>

                  {/* Terminal type */}
                  <div className="flex flex-col gap-1.5">
                    <span id="terminal-type-label" className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Terminal</span>
                    <div role="group" aria-labelledby="terminal-type-label" className="flex items-center gap-1 flex-wrap">
                      {([
                        { value: 'auto',    label: 'Auto' },
                        { value: 'wt-tmux', label: 'Split-pane (tmux)' },
                        { value: 'wt-ps',   label: 'Windows Terminal' },
                        { value: 'cmd-ps',  label: 'PowerShell' },
                      ] as const).map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setTerminalType(value)}
                          aria-pressed={terminalType === value}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                            terminalType === value
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400'
                          }`}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Task description */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="task-plan" className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Task / Plan</label>
                      <span className="text-[9px] text-zinc-700 font-mono" title="Press Ctrl+Enter to launch">Ctrl+Enter to launch</span>
                    </div>
                    <textarea
                      id="task-plan"
                      value={plan}
                      onChange={e => setPlan(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && projectPath) {
                          e.preventDefault();
                          handleLaunch();
                        }
                      }}
                      rows={3}
                      placeholder="Describe what you want to build, fix, or improve… e.g. 'Add dark mode toggle to the settings page'"
                      className="w-full bg-[#121214] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
                    />
                  </div>

                  {/* Suggested Skills — only shown when plan has content */}
                  {suggestedSkills.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Auto-Selected Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedSkills.map(({ skill, reason }) => (
                          <span
                            key={skill}
                            title={`Selected for: ${reason}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-600 leading-relaxed">
                        These skills will be auto-injected into your agent prompts. The lead agent selects the final set at runtime.
                      </p>
                    </div>
                  )}

                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Opens Claude Code in PowerShell. Tell Claude your task and it spawns teammates inline. Use Shift+Down to cycle between them. Right-click and scroll work normally.
                    {wslStatus?.tmuxInstalled && wslStatus?.claudeInWsl && (
                      <> In split-pane mode: <strong className="text-zinc-400">right-click</strong> pastes from clipboard, <strong className="text-zinc-400">scroll</strong> works normally. To reference a file: in Explorer, <strong className="text-zinc-400">Shift+Right-click → Copy as path</strong>, then press <strong className="text-zinc-400">F5</strong> — the path is auto-converted to WSL format and pasted as an <strong className="text-zinc-400">@reference</strong>.</>

                    )}
                  </p>

                  {/* Launch mode indicator */}
                  {(() => {
                    const splitPane = wslStatus?.tmuxInstalled && wslStatus?.claudeInWsl;
                    const checking = isCheckingWsl && !wslStatus;
                    if (checking) return (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <Loader2 size={10} className="animate-spin" /> Detecting launch mode...
                      </div>
                    );
                    return (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-medium ${
                        splitPane
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                      }`}>
                        <Monitor size={12} className="shrink-0" />
                        {splitPane
                          ? 'Windows Terminal + tmux -- each agent gets its own split pane'
                          : 'PowerShell -- teammates inline (Shift+Down to cycle)'}
                      </div>
                    );
                  })()}

                  {/* Launch button */}
                  <button
                    onClick={handleLaunch}
                    disabled={!projectPath}
                    title="Launch agent team (Ctrl+Enter)"
                    className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10"
                  >
                    <Play size={15} />
                    {plan.trim() ? 'Launch Agent Team' : `Launch Agent Team (${agentCount === 'auto' ? 'Auto' : agentCount} agents)`}
                  </button>

                  {/* ── Multi-LLM via OpenClaude ── */}
                  <div className="border-t border-[#27272a] pt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Other LLMs via OpenClaude</span>
                      <span className="text-[9px] text-zinc-700 font-mono">@gitlawb/openclaude</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      OpenClaude brings Claude Code-style agentic workflows to any LLM provider. Launch a separate instance alongside your Claude team for cost optimisation, local models (Ollama), or provider redundancy.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <span id="oc-provider-label" className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Provider</span>
                      <div role="group" aria-labelledby="oc-provider-label" className="flex items-center gap-1 flex-wrap">
                        {([
                          { value: 'openai',   label: 'OpenAI' },
                          { value: 'gemini',   label: 'Gemini' },
                          { value: 'deepseek', label: 'DeepSeek' },
                          { value: 'ollama',   label: 'Ollama' },
                          { value: 'github',   label: 'GitHub Models' },
                        ] as const).map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setOpenclaudeProvider(value)}
                            aria-pressed={openclaudeProvider === value}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${
                              openclaudeProvider === value
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    {openclaudeProvider === 'ollama' && (
                      <p className="text-[10px] text-zinc-600 leading-relaxed">
                        Ollama must be running locally on port 11434. OpenClaude will connect to <code className="text-zinc-500">http://localhost:11434/v1</code> using the <code className="text-zinc-500">llama3</code> model by default. Use <code className="text-zinc-500">/provider</code> inside OpenClaude to change the model.
                      </p>
                    )}
                    <button
                      onClick={handleLaunchOpenClaude}
                      disabled={!projectPath || isLaunchingOc}
                      className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-500/10"
                    >
                      {isLaunchingOc ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      Launch OpenClaude ({openclaudeProvider})
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  SPLIT-PANE SETUP TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'setup' && (
                <div role="tabpanel" id="panel-setup" aria-labelledby="tab-setup" tabIndex={0} className="flex flex-col gap-5">

                  <div className="flex items-start gap-3 p-3 bg-[#121214] border border-[#27272a] rounded-lg">
                    <Monitor size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Agent Teams launches Claude in <strong className="text-zinc-200">PowerShell</strong> by default. Teammates appear inline and you cycle with <strong className="text-zinc-200">Shift+Down</strong>.
                      For visual split-pane mode (each agent in its own pane), install <strong className="text-zinc-200">Windows Terminal</strong> + <strong className="text-zinc-200">WSL</strong> + <strong className="text-zinc-200">tmux</strong> below.
                    </p>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge ok={!!wslStatus?.wslAvailable} label="WSL" />
                    <StatusBadge ok={!!wslStatus?.distroInstalled} label="Linux Distro" />
                    <StatusBadge ok={!!wslStatus?.tmuxInstalled} label="tmux" />
                    {allReady && <StatusBadge ok label="Split-pane ready" />}
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

                  {/* Restart required banner */}
                  {wslStatus?.needsRestart && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-300 leading-relaxed">
                        <strong>Restart required.</strong> WSL was installed but Windows needs a reboot before it activates. Save your work and restart, then come back here.
                      </p>
                    </div>
                  )}

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
                      <div className="ml-7 flex flex-col gap-2">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          WSL is installed but no Linux distro found. Install Ubuntu automatically — this opens a UAC prompt, approve it, then wait ~1 min for Ubuntu to download and set up.
                        </p>
                        {isPollingDistro ? (
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                            <Loader2 size={11} className="animate-spin text-orange-400" />
                            Waiting for Ubuntu to register… checking every 8 s
                          </div>
                        ) : (
                          <button
                            onClick={handleInstallDistro}
                            disabled={isInstallingDistro}
                            className="self-start flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                          >
                            {isInstallingDistro ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            Install Ubuntu
                          </button>
                        )}
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
                        <p className="text-[10px] text-amber-400/70 leading-relaxed">
                          If Ubuntu was just installed, open <strong className="text-amber-300">Ubuntu</strong> from the Start menu once to finish setup (create a username), then click Install tmux below.
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

                  {/* Step 3 — Node.js in WSL */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        wslStatus?.claudeInWsl ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>3</span>
                      <span className="text-xs font-semibold text-zinc-300">Install Node.js inside WSL</span>
                      {wslStatus?.claudeInWsl && <CheckCircle2 size={13} className="text-emerald-400" />}
                    </div>
                    {wslStatus?.tmuxInstalled && !wslStatus?.claudeInWsl && (
                      <div className="ml-7 flex flex-col gap-2">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Node.js must be available inside WSL so <code className="text-zinc-400">claude.exe</code> can launch correctly from a tmux pane. Run this in your Ubuntu terminal:
                        </p>
                        <code className="block text-[10px] font-mono bg-[#0c0c0e] border border-[#27272a] rounded px-3 py-2 text-zinc-400 leading-relaxed select-all">
                          curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs
                        </code>
                        <p className="text-[10px] text-zinc-600">
                          Then click <strong className="text-zinc-500">Refresh</strong> above to re-check status.
                        </p>
                      </div>
                    )}
                    {!wslStatus?.tmuxInstalled && (
                      <p className="ml-7 text-[10px] text-zinc-600">Complete Steps 1 &amp; 2 first.</p>
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
                        All dependencies ready for split-pane mode! Install <strong>Windows Terminal</strong> from the Microsoft Store and it will automatically use tmux split panes instead of inline mode.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════
                  HOW IT WORKS TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'guide' && (
                <div role="tabpanel" id="panel-guide" aria-labelledby="tab-guide" tabIndex={0} className="flex flex-col gap-5 text-xs text-zinc-400 leading-relaxed">

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
                          Then click <strong className="text-zinc-200">Install All Skills</strong> — this writes all 10 slash commands into <code className="text-zinc-300">.claude/commands/</code> of your project, including <strong className="text-zinc-200">/build</strong>, <strong className="text-zinc-200">/build-hybrid</strong>, <strong className="text-zinc-200">/build-smart-delegate</strong>, <strong className="text-zinc-200">/fact-check</strong>, <strong className="text-zinc-200">/checkpoint</strong>, <strong className="text-zinc-200">/commit</strong>, <strong className="text-zinc-200">/review-pr</strong>, <strong className="text-zinc-200">/debug</strong>, <strong className="text-zinc-200">/test-gen</strong>, and <strong className="text-zinc-200">/explain</strong>.
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

              {/* ══════════════════════════════════════════════
                  PREVIEW TAB
              ══════════════════════════════════════════════ */}
              {activeTab === 'preview' && (
                <div role="tabpanel" id="panel-preview" aria-labelledby="tab-preview" tabIndex={0}>
                  <SplitPanePreview onLaunch={handleLaunch} />
                </div>
              )}

              {activeTab === 'library' && (
                <div role="tabpanel" id="panel-library" aria-labelledby="tab-library" tabIndex={0} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] text-zinc-500">Community skill packs from popular GitHub repos. Install to your project&apos;s <code className="text-orange-300">.claude/commands/</code> folder.</p>
                    {packs.length > 0 && (
                      <button
                        onClick={handleInstallAllPacks}
                        disabled={isInstallingAllPacks || !projectPath || packs.every(p => installedPacks[p.id])}
                        title="Install all community skill packs into your project"
                        aria-label={
                          packs.every(p => installedPacks[p.id])
                            ? 'All library packs installed'
                            : isInstallingAllPacks && installAllPacksProgress
                              ? `Installing packs, ${installAllPacksProgress.done} of ${installAllPacksProgress.total} done`
                              : 'Install all library skill packs'
                        }
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          packs.every(p => installedPacks[p.id])
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        } disabled:opacity-60`}
                      >
                        {isInstallingAllPacks
                          ? <><Loader2 size={12} className="animate-spin" /> {installAllPacksProgress ? `${installAllPacksProgress.done}/${installAllPacksProgress.total}…` : 'Installing…'}</>
                          : packs.every(p => installedPacks[p.id])
                            ? <><CheckCircle2 size={12} /> All Installed</>
                            : <><Download size={12} /> Install All Packs</>}
                      </button>
                    )}
                  </div>

                  {isLoadingPacks && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Loader2 size={12} className="animate-spin" /> Loading packs…
                    </div>
                  )}

                  {!isLoadingPacks && packs.length === 0 && (
                    <p className="text-xs text-zinc-600">No packs loaded.</p>
                  )}

                  <div className="flex flex-col gap-3">
                    {packs.map(pack => {
                      const isInstalling = installingPack === pack.id;
                      const isInstalled = installedPacks[pack.id];
                      return (
                        <div key={pack.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-3">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-zinc-200">{pack.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">{pack.skillCount} skills</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">★ {pack.stars.toLocaleString()}</span>
                              </div>
                              <a
                                href={pack.repoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-zinc-600 hover:text-orange-400 transition-colors truncate"
                              >{pack.repo}</a>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">{pack.description}</p>
                            </div>
                            <button
                              onClick={() => handleInstallPack(pack.id)}
                              disabled={isInstalling || isInstalled || !projectPath}
                              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                isInstalled
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                              } disabled:opacity-60`}
                            >
                              {isInstalling
                                ? <><Loader2 size={12} className="animate-spin" /> Installing…</>
                                : isInstalled
                                  ? <><CheckCircle2 size={12} /> Installed</>
                                  : <><Download size={12} /> Install Pack</>}
                            </button>
                          </div>

                          {/* Skill chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {pack.skills.map(skill => (
                              <span key={skill.key} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700 font-mono">
                                {skill.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
