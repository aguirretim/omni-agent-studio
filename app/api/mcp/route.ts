import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';

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
  // Pinned on purpose. Accounts and passwords are added in its own local UI, never here.
  'mcp-email-server':    ['uvx', 'mcp-email-server==1.13.1', 'stdio'],
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
  // Dice's official job-search server (DHI Group). Search only, no sign-in.
  dice: 'https://mcp.dice.com/mcp',
};

/**
 * openings-mcp: a pinned release binary, downloaded once and checked against the
 * SHA-256 published on its GitHub release before it is unpacked.
 * Its LinkedIn and Indeed tools scrape sites whose terms forbid it, so they are
 * added to Claude Code's permission deny list; the company/ATS tools stay usable.
 */
const OPENINGS = {
  url: 'https://github.com/amikai/openings-mcp/releases/download/v0.16.2/openings-mcp_windows_amd64.zip',
  sha256: '88afcced5d3d8009d5ab1f8867ac92c3d87dd0974f8f31f86416c6d3cd0bbb6c',
  dir: path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'openings-mcp'),
  deny: [
    'mcp__openings-mcp__linkedin_search_jobs',
    'mcp__openings-mcp__linkedin_get_job_detail',
    'mcp__openings-mcp__indeed_search_jobs',
    'mcp__openings-mcp__indeed_get_job_detail',
  ],
};

async function installOpenings(): Promise<string> {
  if (process.platform !== 'win32') throw new Error('This one-click install is for Windows. See the project README for other systems.');
  const exe = path.join(OPENINGS.dir, 'openings-mcp.exe');
  if (!fs.existsSync(exe)) {
    const res = await fetch(OPENINGS.url);
    if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
    const buf = Buffer.from(await res.arrayBuffer());
    const got = crypto.createHash('sha256').update(buf).digest('hex');
    if (got !== OPENINGS.sha256) throw new Error('Download did not match the published checksum, so it was not installed.');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openings-'));
    const zip = path.join(tmp, 'openings-mcp.zip');
    fs.writeFileSync(zip, buf);
    fs.mkdirSync(OPENINGS.dir, { recursive: true });
    await execAsync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${OPENINGS.dir}' -Force"`,
      { timeout: 120_000 },
    );
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!fs.existsSync(exe)) throw new Error('Unpacked, but openings-mcp.exe was not found.');
  }
  return exe;
}

/** Adds rules to ~/.claude/settings.json permissions.deny. Never overwrites a file it cannot parse. */
function addDenyRules(rules: string[]): void {
  const file = path.join(os.homedir(), '.claude', 'settings.json');
  let settings: any = {};
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    try { settings = text.trim() ? JSON.parse(text) : {}; }
    catch { throw new Error(`Could not read ${file}, so the LinkedIn/Indeed tools were not blocked. Fix the file and connect again.`); }
  }
  settings.permissions ??= {};
  const deny: string[] = Array.isArray(settings.permissions.deny) ? settings.permissions.deny : [];
  const missing = rules.filter(r => !deny.includes(r));
  if (!missing.length) return;
  settings.permissions.deny = [...deny, ...missing];
  const tmp = `${file}.omni-tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, file);
}

/** Claude.ai directory connectors: added on claude.ai, detected here from `claude mcp list`. */
const CLAUDE_AI_CONNECTORS: Record<string, RegExp> = {
  indeed: /claude\.ai Indeed:/i,
  ziprecruiter: /claude\.ai ZipRecruiter:/i,
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
  'youtube-transcript', 'playwright', 'chrome-devtools', 'scrapling', 'exa', 'mcp-email-server',
  'openings-mcp', 'dice',
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
      for (const [id, re] of Object.entries(CLAUDE_AI_CONNECTORS)) {
        if (re.test(line)) {
          status[id] = /✔|√|Connected/i.test(line) && !/✘|Failed|Needs auth/i.test(line) ? 'connected' : 'failed';
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

    // ---- openings-mcp (pinned, checksum-verified binary) ----
    if (id === 'openings-mcp') {
      const exe = await installOpenings();
      addDenyRules(OPENINGS.deny);
      try { await execAsync('claude mcp remove openings-mcp -s user', { timeout: 30_000 }); } catch { /* ok if absent */ }
      await execAsync(`claude mcp add --scope user openings-mcp -- ${quoteArg(exe)} --log-level warn`, { timeout: 60_000 });
      return NextResponse.json({
        success: true,
        message: 'Connected openings-mcp (LinkedIn and Indeed tools blocked). Restart Claude Code to load it.',
      });
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
