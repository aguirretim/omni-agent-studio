import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Pricing per million tokens (MTok) — 2026 ────────────────────────────────
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-opus-4-6':           { input: 15,   output: 75,  cacheWrite: 18.75, cacheRead: 1.50 },
  'claude-sonnet-4-6':         { input: 3,    output: 15,  cacheWrite: 3.75,  cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4,   cacheWrite: 1.00,  cacheRead: 0.08 },
};
const DEFAULT_PRICE = { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 };

// Claude Code stores projects under ~/.claude/projects/<hash>
// Hash = absolute path with : and \ replaced by -
function pathToHash(p: string): string {
  return path.resolve(p).replace(/\\/g, '-').replace(/:/g, '-').replace(/\//g, '-');
}

interface TokenTotals { input: number; output: number; cacheRead: number; cacheWrite: number }

function calcCost(usage: Record<string, number>, model: string): number {
  const price = PRICING[model] ?? DEFAULT_PRICE;
  return (
    (usage.input_tokens ?? 0) * price.input +
    (usage.output_tokens ?? 0) * price.output +
    (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * price.cacheRead
  ) / 1_000_000;
}

export async function GET(req: NextRequest) {
  try {
    // CSRF check
    const origin = req.headers.get('origin');
    if (origin && origin !== 'http://localhost:3000') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectPath = searchParams.get('projectPath');
    if (!projectPath) return NextResponse.json({ error: 'projectPath required' }, { status: 400 });

    // Path boundary check
    const resolvedPath = path.resolve(projectPath);
    const homeDir = os.homedir();
    if (!resolvedPath.startsWith(homeDir + path.sep) && resolvedPath !== homeDir) {
      return NextResponse.json({ error: 'Forbidden: path outside home directory' }, { status: 403 });
    }

    const hash = pathToHash(resolvedPath);
    const claudeDir = path.join(homeDir, '.claude', 'projects', hash);

    const empty = { totalCost: 0, todayCost: 0, sessions: [], totalTokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
    if (!fs.existsSync(claudeDir)) return NextResponse.json(empty);

    const jsonlFiles = fs.readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'));
    if (jsonlFiles.length === 0) return NextResponse.json(empty);

    const today = new Date().toISOString().slice(0, 10);
    let totalCost = 0;
    let todayCost = 0;
    const totalTokens: TokenTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

    // sessionId → aggregated stats
    const sessionMap = new Map<string, {
      date: string; cost: number; model: string; tokens: TokenTotals;
    }>();

    for (const file of jsonlFiles) {
      let content: string;
      try { content = fs.readFileSync(path.join(claudeDir, file), 'utf8'); } catch { continue; }

      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as Record<string, unknown>;
          if (entry.type !== 'assistant') continue;

          const msg = entry.message as Record<string, unknown> | undefined;
          if (!msg?.usage) continue;

          const usage = msg.usage as Record<string, number>;
          const model = (msg.model as string) ?? 'claude-sonnet-4-6';
          const ts = (entry.timestamp as string) ?? '';
          const date = ts ? ts.slice(0, 10) : today;
          const sessionId = (entry.sessionId as string) ?? file.replace('.jsonl', '');
          const cost = calcCost(usage, model);

          totalCost += cost;
          if (date === today) todayCost += cost;

          totalTokens.input     += usage.input_tokens ?? 0;
          totalTokens.output    += usage.output_tokens ?? 0;
          totalTokens.cacheRead += usage.cache_read_input_tokens ?? 0;
          totalTokens.cacheWrite+= usage.cache_creation_input_tokens ?? 0;

          const prev = sessionMap.get(sessionId);
          if (prev) {
            prev.cost += cost;
            prev.tokens.input      += usage.input_tokens ?? 0;
            prev.tokens.output     += usage.output_tokens ?? 0;
            prev.tokens.cacheRead  += usage.cache_read_input_tokens ?? 0;
            prev.tokens.cacheWrite += usage.cache_creation_input_tokens ?? 0;
          } else {
            sessionMap.set(sessionId, {
              date,
              cost,
              model,
              tokens: {
                input:      usage.input_tokens ?? 0,
                output:     usage.output_tokens ?? 0,
                cacheRead:  usage.cache_read_input_tokens ?? 0,
                cacheWrite: usage.cache_creation_input_tokens ?? 0,
              },
            });
          }
        } catch { continue; }
      }
    }

    const sessions = Array.from(sessionMap.entries())
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);

    return NextResponse.json({ totalCost, todayCost, sessions, totalTokens });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
