import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const SCRAPLING_PKG = 'scrapling[ai]==0.4.15';

/**
 * One-click servers — no secret needed. The command is built entirely server-side;
 * the client sends only an id. `__WORKSPACE__` → the validated connected workspace.
 */
const CONNECTORS: Record<string, string[]> = {
  context7:              ['npx', '-y', '@upstash/context7-mcp'],
  filesystem:            ['npx', '-y', '@modelcontextprotocol/server-filesystem', '__WORKSPACE__'],
  memory:                ['npx', '-y', '@modelcontextprotocol/server-memory'],
  'sequential-thinking': ['npx', '-y', '@modelcontextprotocol/server-sequential-thinking'],
  mobile:                ['npx', '-y', '@mobilenext/mobile-mcp@latest'],
  'youtube-transcript':  ['npx', '-y', '@kimtaeyoon83/mcp-server-youtube-transcript'],
  playwright:            ['npx', '-y', '@playwright/mcp@latest'],
  'chrome-devtools':     ['npx', '-y', 'chrome-devtools-mcp@latest'],
  // Pinned on purpose: the version that was tested. Needs uv (uvx) on PATH.
  scrapling:             ['uvx', '--from', SCRAPLING_PKG, 'scrapling-mcp'],
};

/** One-time setup run before a connector is added (fixed strings, no user input). */
const PREPARE: Record<string, { needs: string; needsHint: string; command: string }> = {
  scrapling: {
    needs: 'uvx --version',
    needsHint: 'Scrapling needs uv. Install it from https://docs.astral.sh/uv/ and try again.',
    // Downloads the browser Scrapling drives for its stealth and dynamic fetches.
    command: `uvx --from "${SCRAPLING_PKG}" scrapling install`,
  },
};

/** Hosted servers reached over HTTP — no local process, no key. */
const HTTP_CONNECTORS: Record<string, string> = {
  exa: 'https://mcp.exa.ai/mcp',
};

/**
 * Keyed servers — need a secret. SECURITY MODEL:
 *  - `command` never contains the secret; it references a `%ENV%` placeholder.
 *  - The secret is injected only via the child process env, so it is never part of
 *    the string we build/could log, and never appears in an error message.
 *  - Every secret is validated against SECRET_RE before use → no shell injection.
 */
type KeyedConnector = {
  removeId?: string;                       // remove any existing server first (idempotent re-add)
  env: Record<string, string>;             // fieldName -> ENV VAR name used inside `command`
  kind?: Record<string, 'secret' | 'url'>; // per-field validation; default 'secret'
  command: string;                         // uses %ENV VAR% placeholders (cmd.exe expands them)
};
const KEYED: Record<string, KeyedConnector> = {
  github: {
    removeId: 'github',
    env: { token: 'OMNI_GH_TOKEN' },
    command:
      'claude mcp add --transport http github https://api.githubcopilot.com/mcp/ ' +
      '-H "Authorization: Bearer %OMNI_GH_TOKEN%" --scope user',
  },
  firecrawl: {
    removeId: 'firecrawl',
    env: { apiKey: 'OMNI_FC_KEY' },
    command:
      'claude mcp add --scope user firecrawl -e FIRECRAWL_API_KEY=%OMNI_FC_KEY% -- npx -y firecrawl-mcp',
  },
  tavily: {
    removeId: 'tavily',
    env: { apiKey: 'OMNI_TAVILY_KEY' },
    command:
      'claude mcp add --scope user tavily -e TAVILY_API_KEY=%OMNI_TAVILY_KEY% -- npx -y tavily-mcp',
  },
  apify: {
    removeId: 'apify',
    env: { token: 'OMNI_APIFY_TOKEN' },
    command:
      'claude mcp add --scope user apify -e APIFY_TOKEN=%OMNI_APIFY_TOKEN% -- npx -y @apify/actors-mcp-server',
  },
  searxng: {
    removeId: 'searxng',
    env: { url: 'OMNI_SEARXNG_URL' },
    kind: { url: 'url' },
    command:
      'claude mcp add --scope user searxng -e "SEARXNG_URL=%OMNI_SEARXNG_URL%" -- npx -y mcp-searxng',
  },
};

/**
 * Claude Code plugins — installed with `claude plugin install`, not `claude mcp add`.
 * The client sends only an id; the plugin name and marketplace are fixed here.
 * `marketplaceSource` is set only for a marketplace that is not built in, and is
 * added first. Every entry was fact-checked before it was listed (see the /mcp page).
 */
type PluginDef = { plugin: string; marketplace: string; marketplaceSource?: string };
const PLUGINS: Record<string, PluginDef> = {
  'frontend-design':      { plugin: 'frontend-design',      marketplace: 'claude-plugins-official' },
  'modern-web-guidance':  { plugin: 'modern-web-guidance',  marketplace: 'claude-plugins-official' },
  'session-report':       { plugin: 'session-report',       marketplace: 'claude-plugins-official' },
  'claude-md-management': { plugin: 'claude-md-management', marketplace: 'claude-plugins-official' },
};

// Tokens/keys are alphanumeric with _ . - only. Rejects quotes, %, spaces, ; & | etc.
const SECRET_RE = /^[A-Za-z0-9_.\-]+$/;
// A plain http(s) base URL — no query string, no shell metacharacters.
const URL_RE = /^https?:\/\/[A-Za-z0-9.\-]+(:\d+)?(\/[A-Za-z0-9._\-\/]*)?$/;

const KNOWN_IDS = [
  'context7', 'filesystem', 'memory', 'sequential-thinking', 'mobile',
  'youtube-transcript', 'playwright', 'chrome-devtools', 'scrapling', 'exa',
  'github', 'firecrawl', 'tavily', 'apify', 'searxng',
  'postgres', 'notion', 'n8n', 'discord',
];

function csrfBlocked(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  return !!origin && origin !== 'http://localhost:3000';
}

const quoteArg = (a: string) => `"${a}"`;

// ─── GET: connection status for every known server ──────────────────────────
export async function GET() {
  try {
    const { stdout } = await execAsync('claude mcp list', { timeout: 90_000 });
    const status: Record<string, 'connected' | 'failed'> = {};
    for (const line of stdout.split('\n')) {
      for (const id of KNOWN_IDS) {
        if (new RegExp(`(^|\\s)${id}:`).test(line)) {
          status[id] = /✔|Connected/i.test(line) && !/✘|Failed/i.test(line) ? 'connected' : 'failed';
        }
      }
    }
    // Installed plugins, keyed by the same ids the page uses.
    const plugins: Record<string, 'installed'> = {};
    try {
      const { stdout: pj } = await execAsync('claude plugin list --json', { timeout: 60_000 });
      const installed: { id?: string; enabled?: boolean }[] = JSON.parse(pj.slice(pj.indexOf('[')));
      for (const [id, def] of Object.entries(PLUGINS)) {
        if (installed.some(p => p.id === `${def.plugin}@${def.marketplace}` && p.enabled !== false)) {
          plugins[id] = 'installed';
        }
      }
    } catch { /* older Claude Code without `plugin list --json`: report none */ }
    return NextResponse.json({ status, plugins });
  } catch (err: any) {
    return NextResponse.json({ status: {}, warning: err?.message ?? 'could not run claude mcp list' });
  }
}

// ─── POST: connect a server. Body: { id, projectPath?, secrets? } ───────────
export async function POST(req: NextRequest) {
  try {
    if (csrfBlocked(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id, projectPath, secrets } = await req.json();
    if (typeof id !== 'string') return NextResponse.json({ error: 'Unknown server' }, { status: 400 });

    // ---- Claude Code plugins ----
    const plugin = Object.prototype.hasOwnProperty.call(PLUGINS, id) ? PLUGINS[id] : undefined;
    if (plugin) {
      if (plugin.marketplaceSource) {
        // Fails harmlessly when the marketplace is already added.
        try { await execAsync(`claude plugin marketplace add ${plugin.marketplaceSource}`, { timeout: 120_000 }); } catch { /* ok */ }
      }
      await execAsync(`claude plugin install ${plugin.plugin}@${plugin.marketplace} --scope user`, { timeout: 180_000 });
      return NextResponse.json({ success: true, message: `Installed ${id}. Restart Claude Code to load it.` });
    }

    // ---- keyed servers (github, firecrawl) ----
    const own = (o: object) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(o, id);
    const keyed = own(KEYED) ? KEYED[id] : undefined;
    if (keyed) {
      const childEnv: NodeJS.ProcessEnv = { ...process.env };
      for (const [field, envVar] of Object.entries(keyed.env)) {
        const val = secrets?.[field];
        if (!val || typeof val !== 'string') {
          return NextResponse.json({ error: `Missing value for ${field}.` }, { status: 400 });
        }
        const isUrl = keyed.kind?.[field] === 'url';
        if (isUrl ? !URL_RE.test(val) : !SECRET_RE.test(val)) {
          return NextResponse.json(
            {
              error: isUrl
                ? 'Enter a plain http(s) URL, e.g. https://searx.be (no trailing path/query, no spaces).'
                : 'That value has unexpected characters — paste the token/key exactly, no quotes or spaces.',
            },
            { status: 400 },
          );
        }
        childEnv[envVar] = val;
      }
      // Remove any existing definition so a re-connect replaces it cleanly.
      if (keyed.removeId) {
        try { await execAsync(`claude mcp remove ${keyed.removeId} -s user`, { timeout: 30_000 }); } catch { /* ok if absent */ }
      }
      try {
        await execAsync(keyed.command, { timeout: 60_000, env: childEnv });
      } catch (e: any) {
        // Scrub any secret from the error text as defense-in-depth.
        let msg = e?.message ?? 'Failed to connect server';
        for (const field of Object.keys(keyed.env)) {
          const v = secrets?.[field];
          if (v) msg = msg.split(v).join('***');
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Connected ${id}. Restart Claude Code to load its tools.` });
    }

    // ---- hosted HTTP servers ----
    const httpUrl = Object.prototype.hasOwnProperty.call(HTTP_CONNECTORS, id) ? HTTP_CONNECTORS[id] : undefined;
    if (httpUrl) {
      await execAsync(`claude mcp add --scope user --transport http ${id} ${httpUrl}`, { timeout: 60_000 });
      return NextResponse.json({ success: true, message: `Connected ${id}. Restart your agent to load its tools.` });
    }

    // ---- one-click servers ----
    const argsTemplate = Object.prototype.hasOwnProperty.call(CONNECTORS, id) ? CONNECTORS[id] : undefined;
    if (!argsTemplate) return NextResponse.json({ error: 'Unknown server' }, { status: 400 });

    const args = [...argsTemplate];
    const wsIndex = args.indexOf('__WORKSPACE__');
    if (wsIndex !== -1) {
      if (!projectPath) {
        return NextResponse.json(
          { error: 'Connect a workspace on the Home page first — Filesystem is scoped to it.' },
          { status: 400 },
        );
      }
      const resolved = path.resolve(projectPath);
      const home = os.homedir();
      if (!resolved.startsWith(home + path.sep) && resolved !== home) {
        return NextResponse.json({ error: 'Forbidden: path outside home directory' }, { status: 403 });
      }
      if (/["'`$&|;<>]/.test(resolved)) {
        return NextResponse.json({ error: 'Path contains unsafe characters' }, { status: 400 });
      }
      args[wsIndex] = resolved;
    }

    const prepare = own(PREPARE) ? PREPARE[id] : undefined;
    if (prepare) {
      try { await execAsync(prepare.needs, { timeout: 30_000 }); }
      catch { return NextResponse.json({ error: prepare.needsHint }, { status: 400 }); }
      await execAsync(prepare.command, { timeout: 900_000 });
    }

    const cmd = `claude mcp add --scope user ${id} -- ${args.map(quoteArg).join(' ')}`;
    await execAsync(cmd, { timeout: 60_000 });
    return NextResponse.json({ success: true, message: `Connected ${id}. Restart your agent to load its tools.` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed to connect server' }, { status: 500 });
  }
}
