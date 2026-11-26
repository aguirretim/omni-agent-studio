import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ACTIVE_GOALS_FILE = path.join('_agent-tasks', 'ACTIVE_GOALS.md');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectPath } = body;

    // CSRF check — block cross-origin mutations (S-H3)
    const origin = req.headers.get('origin');
    if (origin && origin !== 'http://localhost:3000') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
    }

    // Path boundary check — prevent path traversal (S-H2)
    const resolvedPath = path.resolve(projectPath);
    const homeDir = os.homedir();
    if (!resolvedPath.startsWith(homeDir + path.sep) && resolvedPath !== homeDir) {
      return NextResponse.json({ error: 'Forbidden: path outside home directory' }, { status: 403 });
    }

    // Ensure project directory exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Project path does not exist' }, { status: 400 });
    }

    switch (action) {
      case 'read-progress': {
        const progressPath = path.join(resolvedPath, 'progress.txt');
        if (!fs.existsSync(progressPath)) {
          return NextResponse.json({ content: null });
        }
        const content = fs.readFileSync(progressPath, 'utf-8');
        return NextResponse.json({ content });
      }

      case 'parse-goals': {
        // Short-map format: the whole goal list lives in _agent-tasks/ACTIVE_GOALS.md.
        // Older projects keep a "## Active Goals" section inside the shared context file.
        let section: string | null = null;
        let contextFile: string | null = null;
        const goalsPath = path.join(resolvedPath, ACTIVE_GOALS_FILE);
        if (fs.existsSync(goalsPath)) {
          section = fs.readFileSync(goalsPath, 'utf-8').replace(/\r\n/g, '\n');
          contextFile = '_agent-tasks/ACTIVE_GOALS.md';
        } else {
          for (const candidate of ['AGENTS.md', '.claude.md', '.gemini.md']) {
            const p = path.join(resolvedPath, candidate);
            if (fs.existsSync(p)) {
              const contextContent = fs.readFileSync(p, 'utf-8').replace(/\r\n/g, '\n');
              contextFile = candidate;
              const goalsMatch = contextContent.match(/## Active Goals\n([\s\S]*?)(?:\n##\s|\n---\s*$|$)/);
              if (goalsMatch) section = goalsMatch[1];
              break;
            }
          }
        }
        if (section === null) {
          return NextResponse.json({ goals: [], contextFile });
        }
        const lines = section.split('\n');
        const goals: Array<{ text: string; done: boolean }> = [];
        for (const line of lines) {
          const done = line.match(/^- \[x\] (.+)/i);
          const todo = line.match(/^- \[ \] (.+)/);
          if (done) goals.push({ text: done[1].trim(), done: true });
          else if (todo) goals.push({ text: todo[1].trim(), done: false });
        }
        return NextResponse.json({ goals, contextFile });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
