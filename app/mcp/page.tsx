'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plug, Check, Loader2, KeyRound, ExternalLink, ShieldAlert, RefreshCw, X, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/components/layout/WorkspaceProvider';

type Tier = 'must' | 'strong' | 'situational';
type Status = 'connected' | 'failed' | undefined;

interface Field {
  name: string;         // key sent to the API in `secrets`
  label: string;        // input label
  placeholder: string;
  help?: string;        // small hint under the label
  helpUrl?: string;     // "get one here" link
  helpUrlText?: string;
  type?: 'password' | 'text';  // password (default) masks a secret; text for non-secret (e.g. a URL)
}

interface McpServer {
  id: string;
  name: string;
  publisher: string;
  tier: Tier;
  category: string;
  detail: string;
  docsUrl: string;
  fields?: Field[];     // present → keyed Connect (token form)
  requires?: string;    // present, no fields → guide-only chip
  setupHint?: string;
}

// ── Group 1: one-click, no secret ───────────────────────────────────────────
const ONE_CLICK: McpServer[] = [
  {
    id: 'context7', name: 'Context7', publisher: 'Upstash', tier: 'must',
    category: 'Up-to-date library docs',
    detail: 'Injects current, version-specific docs for fast-moving libraries (Next.js, Spring, Gradle, Node) right when an agent writes code — kills the #1 failure mode of AI codegen: stale APIs.',
    docsUrl: 'https://github.com/upstash/context7',
  },
  {
    id: 'filesystem', name: 'Filesystem', publisher: 'modelcontextprotocol · official', tier: 'must',
    category: 'Sandboxed file access',
    detail: 'Structured read/write file tools for the non-Claude agents (Gemini, OpenClaude) that lack built-in file access. Scoped to your connected workspace folder only — never your whole drive.',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
  },
  {
    id: 'memory', name: 'Memory', publisher: 'modelcontextprotocol · official', tier: 'strong',
    category: 'Persistent knowledge graph',
    detail: 'A local knowledge graph so agents remember project facts, decisions, and conventions across sessions — a natural backbone for OmniAgent’s shared-context goal.',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
  },
  {
    id: 'sequential-thinking', name: 'Sequential Thinking', publisher: 'modelcontextprotocol · official', tier: 'situational',
    category: 'Structured reasoning',
    detail: 'A step-by-step reasoning tool (revise / branch thoughts). Most useful for lighter models in a hybrid team when planning complex, multi-step refactors.',
    docsUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
  },
  {
    id: 'mobile', name: 'Mobile (Android)', publisher: 'mobile-next · community', tier: 'must',
    category: 'Device & emulator control',
    detail: 'Lets an agent install an APK, launch it, tap through the UI and verify — automated on-device testing. Needs Android Platform Tools (adb) on your PATH.',
    docsUrl: 'https://github.com/mobile-next/mobile-mcp',
  },
  {
    id: 'youtube-transcript', name: 'YouTube Transcript', publisher: 'kimtaeyoon83 · community', tier: 'strong',
    category: 'Video captions → text',
    detail: 'Pulls a YouTube video’s transcript directly so an agent can read and analyze it — ideal for channel-growth research: ingest competitor videos as text, no copy-paste. No API key.',
    docsUrl: 'https://github.com/kimtaeyoon83/mcp-server-youtube-transcript',
  },
  {
    id: 'playwright', name: 'Playwright', publisher: 'Microsoft · official', tier: 'strong',
    category: 'Headless E2E browser testing',
    detail: 'Drives a real browser via fast accessibility snapshots — navigate, fill forms, assert — for repeatable end-to-end tests of your Next.js apps (OmniAgent itself, portfolio, scoreboard). Complements Claude-in-Chrome: that runs your live session, this spins up clean scripted runs.',
    docsUrl: 'https://github.com/microsoft/playwright-mcp',
  },
  {
    id: 'chrome-devtools', name: 'Chrome DevTools', publisher: 'Google · official', tier: 'situational',
    category: 'Web perf / network debugging',
    detail: 'Where Playwright drives the browser, this debugs it — performance profiling, network inspection, console, and Lighthouse audits. Pull it out when chasing a specific web perf or network bug.',
    docsUrl: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  },
  {
    id: 'scrapling', name: 'Scrapling', publisher: 'D4Vinci · community · BSD-3', tier: 'strong',
    category: 'Free local scraping past bot walls',
    detail: 'Fetches pages on your own PC with real-browser fingerprints and a stealth browser, then returns clean markdown — no key, no credits. Reads sites that block ordinary fetches. Needs uv; the first connect downloads a browser (a few hundred MB, can take minutes). Pinned to the tested version 0.4.15. Use it on sites whose terms allow it.',
    docsUrl: 'https://github.com/D4Vinci/Scrapling',
  },
  {
    id: 'exa', name: 'Exa Search', publisher: 'Exa · official · hosted', tier: 'strong',
    category: 'Web search + page fetch · no key',
    detail: 'Exa’s hosted search server: two tools (search and fetch), no account and no key for normal use. A solid second search engine for when a keyed one runs out of quota. Your queries go to Exa.',
    docsUrl: 'https://github.com/exa-labs/exa-mcp-server',
  },
];

// ── Claude Code plugins: skills that install with one click ────────────────
// Each was fact-checked (what it installs, what it runs, what it costs in context).
interface PluginItem {
  id: string; name: string; publisher: string; tier: Tier;
  category: string; detail: string; docsUrl: string;
}
const PLUGINS: PluginItem[] = [
  {
    id: 'frontend-design', name: 'Frontend Design', publisher: 'Anthropic · official', tier: 'must',
    category: 'Better-looking UI from Claude',
    detail: 'Anthropic’s own design skill. It steers Claude away from generic layouts toward deliberate type, colour and spacing. One text file: no scripts, no hooks, about 80 tokens until it is used.',
    docsUrl: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design',
  },
  {
    id: 'modern-web-guidance', name: 'Modern Web Guidance', publisher: 'Google Chrome · official marketplace', tier: 'strong',
    category: 'Current web + Chrome extension practice',
    detail: 'Two skills from the Chrome team: up-to-date web platform advice and a Chrome extensions guide. No hooks. When used it runs an npm package to fetch the latest guidance, so it needs the network.',
    docsUrl: 'https://github.com/GoogleChrome/modern-web-guidance',
  },
  {
    id: 'session-report', name: 'Session Report', publisher: 'Anthropic · official', tier: 'strong',
    category: 'See where your tokens went',
    detail: 'Builds a local HTML report of your Claude Code usage — tokens, cache hits, subagents and your most expensive prompts — from the transcripts already on your PC. Nothing is uploaded.',
    docsUrl: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/session-report',
  },
  {
    id: 'claude-md-management', name: 'CLAUDE.md Management', publisher: 'Anthropic · official', tier: 'situational',
    category: 'Keep project memory tidy',
    detail: 'Audits CLAUDE.md files and proposes cleanups when you ask. Useful once a context file has grown long. It only runs on request.',
    docsUrl: 'https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management',
  },
];

// ── Popular tools that were checked and left out, with the reason ──────────
const LEFT_OUT: { name: string; why: string }[] = [
  { name: 'SuperClaude Framework', why: 'Not a plugin: copies 30 commands and 20 agents into your Claude folder.' },
  { name: 'oh-my-claudecode', why: 'Setup overwrites your global CLAUDE.md by default and adds hooks on every tool call, one of which can answer permission prompts.' },
  { name: 'Everything Claude Code (ECC)', why: '311 skills add about 33k tokens to every session; a hook blocks first edits. A malware repo imitates its old name.' },
  { name: 'Anthropic-Cybersecurity-Skills', why: 'Not from Anthropic. 818 skills, about 91k tokens; Windows Defender quarantines one file.' },
  { name: 'UI UX Pro Max', why: 'Works, but Frontend Design covers the need; it had a critical code-injection bug fixed in June 2026.' },
  { name: 'Agent Reach', why: 'An installer for other tools. The useful part is Exa (above); the social channels need your login cookies.' },
  { name: 'Memvid / claude-brain', why: 'No update since January 2026; freezes Claude Code on Windows and breaks on Node 24.' },
  { name: 'Lightpanda, auto-browser', why: 'No native Windows build / needs Docker. Playwright already covers browser control.' },
  { name: 'OpenClaude, claw-code', why: 'OpenClaude’s own licence says it has no right to distribute the source; claw-code’s authors call it a museum exhibit.' },
];

// ── Group 2: keyed — click Connect, paste a token, done ─────────────────────
const KEYED: McpServer[] = [
  {
    id: 'github', name: 'GitHub', publisher: 'GitHub · official', tier: 'must',
    category: 'Repos, PRs, CI, code search',
    detail: 'First-class GitHub for your agents — open PRs, read CI status, search across every repo. Pairs directly with the git-worktree flow.',
    docsUrl: 'https://github.com/github/github-mcp-server',
    fields: [{
      name: 'token', label: 'GitHub access token',
      placeholder: 'github_pat_… or ghp_…',
      help: 'Fine-grained token with Contents (read), Pull requests + Issues (read/write), Actions (read).',
      helpUrl: 'https://github.com/settings/personal-access-tokens/new',
      helpUrlText: 'Create a token ↗',
    }],
  },
  {
    id: 'firecrawl', name: 'Firecrawl', publisher: 'Firecrawl · official', tier: 'must',
    category: 'Scrape / crawl → clean markdown',
    detail: 'Turns any site into clean, LLM-ready markdown or structured JSON. The biggest upgrade to research workflows — its extract endpoint pulls specific fields by schema.',
    docsUrl: 'https://github.com/firecrawl/firecrawl-mcp-server',
    fields: [{
      name: 'apiKey', label: 'Firecrawl API key',
      placeholder: 'fc-…',
      help: 'Free tier, no card required.',
      helpUrl: 'https://www.firecrawl.dev/app/api-keys',
      helpUrlText: 'Get a free key ↗',
    }],
  },
  {
    id: 'tavily', name: 'Tavily', publisher: 'Tavily · official', tier: 'strong',
    category: 'LLM-tuned web search',
    detail: 'Web search built for agents — returns cited, extract-ready results. Gives your non-Claude agents (Gemini, OpenClaude) real-time search they don’t have built in.',
    docsUrl: 'https://github.com/tavily-ai/tavily-mcp',
    fields: [{
      name: 'apiKey', label: 'Tavily API key', placeholder: 'tvly-…',
      help: '1,000 free credits/month.',
      helpUrl: 'https://app.tavily.com/home', helpUrlText: 'Get a free key ↗',
    }],
  },
  {
    id: 'apify', name: 'Apify', publisher: 'Apify · official', tier: 'strong',
    category: '5,000+ pre-built scrapers',
    detail: 'Access ready-made scrapers (“Actors”) for YouTube, Amazon, Maps, X and more — the fastest way to pull structured data from a mainstream site without building extraction logic.',
    docsUrl: 'https://github.com/apify/actors-mcp-server',
    fields: [{
      name: 'token', label: 'Apify API token', placeholder: 'apify_api_…',
      help: 'Free tier available.',
      helpUrl: 'https://console.apify.com/account/integrations', helpUrlText: 'Get a token ↗',
    }],
  },
  {
    id: 'searxng', name: 'SearXNG', publisher: 'community · self-hostable', tier: 'strong',
    category: 'Free web search · no API key',
    detail: 'Free, private metasearch — no API key and no per-query cost. Point it at a public SearXNG instance now, or your own self-hosted one later (via Docker). The ideal free fallback when a paid search hits its limit.',
    docsUrl: 'https://github.com/ihor-sokoliuk/mcp-searxng',
    fields: [{
      name: 'url', label: 'SearXNG instance URL', placeholder: 'https://searx.be', type: 'text',
      help: 'A public instance to start (or your self-hosted URL). No key needed.',
      helpUrl: 'https://searx.space', helpUrlText: 'Pick a public instance ↗',
    }],
  },
];

// ── Group 3: needs an external install first (guide only) ───────────────────
const GUIDE: McpServer[] = [
  {
    id: 'gateway', name: 'Docker MCP Gateway', publisher: 'Docker · official', tier: 'must',
    category: 'Secrets vault + isolation',
    detail: 'Runs credential-holding servers as isolated containers behind one secrets vault — the recommended home for any keyed server (GitHub token, Firecrawl, Alpaca) instead of plaintext configs.',
    docsUrl: 'https://github.com/docker/mcp-gateway',
    requires: 'Docker Desktop',
    setupHint: 'Install Docker Desktop, then use the  docker mcp  CLI plugin to add servers and store their keys in the vault. Point OmniAgent at the gateway, not loose servers.',
  },
  {
    id: 'graphify', name: 'Graphify', publisher: 'Graphify-Labs · community · Apache-2.0', tier: 'situational',
    category: 'Code knowledge graph',
    detail: 'Maps a codebase into a graph Claude can query. Real and active, but the “71x fewer tokens” figure is the author’s own; the one independent test found slightly more tokens than careful grep. Try it on one large repo before trusting it.',
    docsUrl: 'https://github.com/Graphify-Labs/graphify',
    requires: 'uv + per-project setup',
    setupHint: 'uv tool install graphifyy   (two y’s)  then, inside one repo:  graphify install --project . Skip  graphify hook install  — its hook can block tool calls on Windows.',
  },
  {
    id: 'rea', name: 'REA (Reverse Engineer Anything)', publisher: 'morluto · community', tier: 'situational',
    category: 'App reverse engineering',
    detail: 'Analysis tools for JavaScript, Electron, .NET and Android apps. Releases land almost daily and native-binary analysis is broken on Windows right now, so pin a version and add it only while you need it.',
    docsUrl: 'https://github.com/morluto/rea',
    requires: 'Node 22.19+ · pin a version',
    setupHint: 'claude mcp add --scope user rea -- cmd /c npx -y rea-agents@6.4.0 mcp   Remove it when done: it adds dozens of tools to every session.',
  },
  {
    id: 'robinhood', name: 'Robinhood Trading', publisher: 'Robinhood · official', tier: 'situational',
    category: 'Real-money trading',
    detail: 'Robinhood’s own server. It places real stock, option and crypto orders in a separate Agentic account and can read all your accounts. Listed so you know it exists; not something to connect casually.',
    docsUrl: 'https://robinhood.com',
    requires: 'Robinhood account · real money',
    setupHint: 'Only with money you can afford to lose, and never with permission prompts turned off.',
  },
  {
    id: 'postgres', name: 'Postgres MCP Pro', publisher: 'crystaldba · community', tier: 'situational',
    category: 'Database query + tuning',
    detail: 'Query debugging, index tuning, and EXPLAIN analysis over a Postgres DB. (Use DBHub instead if you need SQLite/MySQL.)',
    docsUrl: 'https://github.com/crystaldba/postgres-mcp',
    requires: 'Python (uvx) + DB URL',
    setupHint: 'Needs Python (uvx) and a DATABASE_URI. Run in --access-mode=restricted (read-only) by default; never point an agent at production creds.',
  },
  {
    id: 'n8n', name: 'n8n', publisher: 'czlonkowski · community', tier: 'situational',
    category: 'Workflow automation',
    detail: 'Teaches Claude n8n’s 2,000+ nodes so it can build automation workflows for you — glue between your Discord bot, GitHub, and data flows.',
    docsUrl: 'https://github.com/czlonkowski/n8n-mcp',
    requires: 'Self-hosted n8n',
    setupHint: 'Best with a self-hosted n8n instance (cheap via Docker). Then add the n8n-mcp server pointed at it.',
  },
  {
    id: 'notion', name: 'Notion', publisher: 'Notion · official', tier: 'situational',
    category: 'Notes & docs',
    detail: 'Read/write your Notion workspace from an agent. Only worth it if your notes actually live in Notion (else Memory/Basic Memory stays local and private).',
    docsUrl: 'https://github.com/makenotion/notion-mcp-server',
    requires: 'Notion OAuth',
    setupHint: 'Uses Notion’s remote hosted MCP with OAuth. Connect via  /mcp  once added, then authorize your workspace in the browser.',
  },
  {
    id: 'discord', name: 'Discord', publisher: 'community', tier: 'situational',
    category: 'Bot / channel control',
    detail: 'Lets an agent post and manage messages/channels — ties directly to your PalworldTCGPad Discord bot community.',
    docsUrl: 'https://github.com/v-3/discordmcp',
    requires: 'Discord bot token',
    setupHint: 'Needs a Discord bot token with tightly-scoped permissions. Keep the token out of any repo.',
  },
];

const TIER_BADGE: Record<Tier, string> = {
  must:        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  strong:      'bg-blue-500/10 border-blue-500/30 text-blue-400',
  situational: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};
const TIER_LABEL: Record<Tier, string> = { must: 'Must-have', strong: 'Strong', situational: 'Situational' };

export default function McpPage() {
  const { projectPath, setSyncStatus } = useWorkspace();
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [plugins, setPlugins] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp');
      const data = await res.json();
      setStatus(data.status ?? {});
      setPlugins(data.plugins ?? {});
    } catch {
      setStatus({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // One-click connect (no secret)
  const connect = async (server: McpServer) => {
    if (server.id === 'filesystem' && !projectPath) {
      setSyncStatus('Connect a workspace on Home first');
      return;
    }
    setBusy(server.id);
    setSyncStatus(`Connecting ${server.name}...`);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: server.id, projectPath }),
      });
      const data = await res.json();
      if (!res.ok) setSyncStatus(`Failed: ${data.error ?? res.statusText}`);
      else {
        setStatus(prev => ({ ...prev, [server.id]: 'connected' }));
        setSyncStatus(`${server.name} connected`);
      }
    } catch {
      setSyncStatus(`Failed connecting ${server.name}`);
    } finally {
      setBusy(null);
      refresh();
    }
  };

  // Plugin install (Claude Code skills) — fixed id only, no input
  const installPlugin = async (item: PluginItem) => {
    setBusy(item.id);
    setSyncStatus(`Installing ${item.name}...`);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) setSyncStatus(`Failed: ${data.error ?? res.statusText}`);
      else {
        setPlugins(prev => ({ ...prev, [item.id]: 'installed' }));
        setSyncStatus(`${item.name} installed · restart Claude Code to load it`);
      }
    } catch {
      setSyncStatus(`Failed installing ${item.name}`);
    } finally {
      setBusy(null);
    }
  };

  // Keyed connect (token form) — verifies real status via refresh before finishing
  const connectKeyed = async (server: McpServer) => {
    const secrets: Record<string, string> = {};
    for (const f of server.fields ?? []) {
      const v = (formValues[`${server.id}.${f.name}`] ?? '').trim();
      if (!v) { setSyncStatus(`Enter your ${f.label}`); return; }
      secrets[f.name] = v;
    }
    setBusy(server.id);
    setSyncStatus(`Connecting ${server.name}...`);
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: server.id, secrets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatus(`Failed: ${data.error ?? res.statusText}`);
        return;
      }
      // Clear the secret from memory immediately, close the form, then verify.
      setFormValues(prev => {
        const n = { ...prev };
        for (const f of server.fields ?? []) delete n[`${server.id}.${f.name}`];
        return n;
      });
      setOpenForm(null);
      setSyncStatus(`${server.name} added — verifying token...`);
      await refresh();
      setSyncStatus(`${server.name} set up · restart Claude Code to load it`);
    } catch {
      setSyncStatus(`Failed connecting ${server.name}`);
    } finally {
      setBusy(null);
    }
  };

  const setField = (key: string, val: string) => setFormValues(prev => ({ ...prev, [key]: val }));

  const TierBadge = ({ tier }: { tier: Tier }) => (
    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TIER_BADGE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  );

  const ConnectedPill = () => (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
      <Check size={13} /> Connected
    </span>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-6 flex flex-col gap-6 max-w-[900px] mx-auto w-full">
        {/* Heading */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Plug size={18} className="text-zinc-400" />
              MCP Servers
            </h2>
            <p className="text-sm text-zinc-500 mt-1 max-w-[640px]">
              MCP servers are power-ups you plug into your AI tools — they give agents new abilities like
              reading your GitHub, scraping the web, or driving an Android device. Connect the simple ones
              with one click; for the rest, click Connect and paste a key. Claude Code skills are further down.
            </p>
          </div>
          <button
            onClick={refresh}
            className="shrink-0 flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-[var(--c-border)] hover:border-zinc-600 rounded-md px-2.5 py-1.5 transition-colors"
            title="Re-check which servers are connected"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Info note */}
        <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-4 text-[13px] text-zinc-400 leading-relaxed">
          Connecting adds the server to your <span className="text-zinc-200 font-medium">user config</span> (available in every
          project). <span className="text-zinc-300">Restart your AI tool</span> after connecting so it loads the new abilities.
        </div>

        {/* One-click group */}
        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase">
            One-click connect · no key needed
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ONE_CLICK.map(server => {
              const isConnected = status[server.id] === 'connected';
              const isBusy = busy === server.id;
              return (
                <div key={server.id} className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--c-inset)] border border-[var(--c-border)] shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-zinc-200">{server.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{server.category}</div>
                    </div>
                    <TierBadge tier={server.tier} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">{server.detail}</p>
                  <div className="flex items-center justify-between gap-2">
                    <a href={server.docsUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      {server.publisher} <ExternalLink size={9} />
                    </a>
                    {isConnected ? <ConnectedPill /> : (
                      <button
                        onClick={() => connect(server)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 hover:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        {isBusy ? <><Loader2 size={13} className="animate-spin" /> Connecting</> : <><Plug size={13} /> Connect</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Claude Code plugins — one-click skills */}
        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
            <Sparkles size={12} /> Claude Code skills · one click · fact-checked
          </div>
          <p className="text-[12px] text-zinc-500 leading-relaxed -mt-1">
            Skills teach Claude Code how to do a job well. These come from the official plugin marketplace and were
            checked for what they install and run. They work in Claude Code only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLUGINS.map(item => {
              const isInstalled = plugins[item.id] === 'installed';
              const isBusy = busy === item.id;
              return (
                <div key={item.id} className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--c-inset)] border border-[var(--c-border)] shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-zinc-200">{item.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{item.category}</div>
                    </div>
                    <TierBadge tier={item.tier} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">{item.detail}</p>
                  <div className="flex items-center justify-between gap-2">
                    <a href={item.docsUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      {item.publisher} <ExternalLink size={9} />
                    </a>
                    {isInstalled ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <Check size={13} /> Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => installPlugin(item)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 hover:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
                      >
                        {isBusy ? <><Loader2 size={13} className="animate-spin" /> Installing</> : <><Sparkles size={13} /> Install</>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Keyed group — Connect opens a token form */}
        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
            <KeyRound size={12} /> Connect with a key
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {KEYED.map(server => {
              const isConnected = status[server.id] === 'connected';
              const isBusy = busy === server.id;
              const isOpen = openForm === server.id;
              return (
                <div key={server.id} className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--c-inset)] border border-[var(--c-border)] shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-zinc-200">{server.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{server.category}</div>
                    </div>
                    <TierBadge tier={server.tier} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed flex-1">{server.detail}</p>

                  {/* Token form (revealed on Connect) */}
                  {isOpen && !isConnected && (
                    <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-zinc-900/40 border border-[var(--c-border)]">
                      {(server.fields ?? []).map(f => {
                        const key = `${server.id}.${f.name}`;
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <label htmlFor={key} className="text-[11px] font-medium text-zinc-300">{f.label}</label>
                              {f.helpUrl && (
                                <a href={f.helpUrl} target="_blank" rel="noopener noreferrer"
                                   className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
                                  {f.helpUrlText ?? 'Get one ↗'}
                                </a>
                              )}
                            </div>
                            <input
                              id={key}
                              type={f.type ?? 'password'}
                              autoComplete="off"
                              spellCheck={false}
                              placeholder={f.placeholder}
                              value={formValues[key] ?? ''}
                              onChange={e => setField(key, e.target.value)}
                              className="w-full bg-zinc-950/60 border border-zinc-700 focus:border-zinc-500 rounded-md px-2.5 py-1.5 text-[12px] text-zinc-200 font-mono outline-none transition-colors"
                            />
                            {f.help && <p className="text-[10px] text-zinc-600 leading-snug">{f.help}</p>}
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={() => connectKeyed(server)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
                        >
                          {isBusy ? <><Loader2 size={13} className="animate-spin" /> Setting up</> : <><Check size={13} /> Set up</>}
                        </button>
                        <button
                          onClick={() => setOpenForm(null)}
                          disabled={isBusy}
                          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1.5 transition-colors"
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-600 leading-snug">
                        Stored in your local config. For stronger hygiene, move keys into the Docker MCP Gateway vault later.
                      </p>
                    </div>
                  )}

                  {!isOpen && (
                    <div className="flex items-center justify-between gap-2">
                      <a href={server.docsUrl} target="_blank" rel="noopener noreferrer"
                         className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                        {server.publisher} <ExternalLink size={9} />
                      </a>
                      {isConnected ? <ConnectedPill /> : (
                        <button
                          onClick={() => setOpenForm(server.id)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 hover:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-wait"
                        >
                          {isBusy ? <><Loader2 size={13} className="animate-spin" /> Verifying</> : <><KeyRound size={13} /> Connect</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Guide group — needs an external install first */}
        <section className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase flex items-center gap-2">
            <ShieldAlert size={12} /> Needs a tool installed first
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GUIDE.map(server => {
              const isConnected = status[server.id] === 'connected';
              return (
                <div key={server.id} className="flex flex-col gap-3 p-4 rounded-xl bg-[var(--c-inset)] border border-[var(--c-border)] shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <div className="text-sm font-semibold text-zinc-200">{server.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{server.category}</div>
                    </div>
                    <TierBadge tier={server.tier} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{server.detail}</p>
                  {server.setupHint && (
                    <p className="text-[10px] text-zinc-500 leading-relaxed bg-zinc-800/40 border border-[var(--c-border)] rounded-md p-2 font-mono">
                      {server.setupHint}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <a href={server.docsUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      {server.publisher} <ExternalLink size={9} />
                    </a>
                    {isConnected ? <ConnectedPill /> : (
                      <span className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400/90 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <ShieldAlert size={12} /> {server.requires}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Checked and left out */}
        <details className="rounded-xl bg-[var(--c-inset)] border border-[var(--c-border)] p-4">
          <summary className="text-[12px] font-semibold text-zinc-300 cursor-pointer">
            Popular add-ons we checked and left out ({LEFT_OUT.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {LEFT_OUT.map(x => (
              <li key={x.name} className="text-[11px] text-zinc-500 leading-relaxed">
                <span className="text-zinc-300 font-medium">{x.name}:</span> {x.why}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-zinc-600">Checked 11 Oct 2026. These projects change; a reason here may be fixed later.</p>
        </details>

        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Security: keyed servers hold live secrets — they’re saved in your local config. Scope tokens tightly, and move
          them into the Docker MCP Gateway vault when you set it up. Finance servers that can execute trades should stay in paper mode.
        </p>
      </div>
    </div>
  );
}
