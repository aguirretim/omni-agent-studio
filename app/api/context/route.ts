import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// AGENTS.md is the source (the short map). The other two are copies for tools
// that look for their own file name. Read order = this order.
const PRIMARY_FILE = 'AGENTS.md';
const COPY_FILES = ['.claude.md', '.gemini.md'];
const READ_ORDER = [PRIMARY_FILE, ...COPY_FILES];

// The map loads into every session, so it must stay short. History belongs in
// _agent-tasks/SESSION_LOG.md, not in the map.
const MAX_MAP_BYTES = 40_000;

// Created next to the map for a new project; never overwritten.
const LOG_DIR = '_agent-tasks';
const STARTER_FILES: Record<string, string> = {
  'SESSION_LOG.md':
    '# Session log\n\n' +
    'One line per finished task, newest at the bottom. Append only; grep it, never read it whole.\n' +
    'Format: `YYYY-MM-DD · [how: manual | /skill] · [what was done] · [main file or decision]`\n\n',
  'ACTIVE_GOALS.md':
    '# Active goals\n\n' +
    'Open work only. Mark a goal `[x]` when done (or move it to SESSION_LOG.md).\n\n' +
    '- [ ] Read AGENTS.md and confirm you understand the project and its rules.\n' +
    '- [ ] [Add your first real goal here]\n',
  'LESSONS_FULL.md':
    '# Lessons, full text\n\n' +
    'The long story behind each one-line lesson in AGENTS.md: what went wrong, how it was found, the rule.\n\n',
};

function createStarterFiles(projectDir: string) {
  const created: string[] = [];
  const dir = path.join(projectDir, LOG_DIR);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(STARTER_FILES)) {
    try {
      // 'wx' fails if the file exists, so an existing log is never touched.
      fs.writeFileSync(path.join(dir, name), text, { encoding: 'utf-8', flag: 'wx' });
      created.push(`${LOG_DIR}/${name}`);
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectPath, content, initProject } = body;

    // CSRF check (S-H3)
    const origin = req.headers.get('origin');
    if (origin && origin !== 'http://localhost:3000') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!projectPath) {
      return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
    }

    // Path boundary check (S-H2)
    const resolvedPath = path.resolve(projectPath);
    const homeDir = os.homedir();
    if (!resolvedPath.startsWith(homeDir + path.sep) && resolvedPath !== homeDir) {
      return NextResponse.json({ error: 'Forbidden: path outside home directory' }, { status: 403 });
    }

    // Ensure directory exists (basic validation)
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Project path does not exist' }, { status: 400 });
    }

    // 1MB size limit on sync content (S-M4)
    if (action === 'sync' && content && content.length > 1_000_000) {
      return NextResponse.json({ error: 'Content too large' }, { status: 413 });
    }

    if (action === 'read') {
      // AGENTS.md first; fall back to an older project's .claude.md / .gemini.md
      let currentContent = '';
      let sourceFile: string | null = null;
      for (const file of READ_ORDER) {
        const filePath = path.join(resolvedPath, file);
        if (fs.existsSync(filePath)) {
          currentContent = fs.readFileSync(filePath, 'utf-8');
          sourceFile = file;
          break;
        }
      }
      // Empty content tells the client to generate the template
      return NextResponse.json({
        content: currentContent,
        sourceFile,
        bytes: Buffer.byteLength(currentContent, 'utf-8'),
        maxBytes: MAX_MAP_BYTES,
      });
    }

    if (action === 'sync') {
      if (typeof content !== 'string') {
        return NextResponse.json({ error: 'content is required for sync' }, { status: 400 });
      }

      const bytes = Buffer.byteLength(content, 'utf-8');
      if (bytes > MAX_MAP_BYTES) {
        return NextResponse.json({
          error:
            `AGENTS.md would be ${Math.round(bytes / 1000)} KB; the limit is ${Math.round(MAX_MAP_BYTES / 1000)} KB. ` +
            'The map loads into every session, so keep it to rules and where things are. ' +
            `Move history to ${LOG_DIR}/SESSION_LOG.md and long lessons to ${LOG_DIR}/LESSONS_FULL.md, then save again.`,
          bytes,
          maxBytes: MAX_MAP_BYTES,
        }, { status: 413 });
      }

      // Write AGENTS.md first, then copy it over the other tools' files
      const writeResults = [];
      const primaryPath = path.join(resolvedPath, PRIMARY_FILE);
      let primaryOk = false;
      try {
        fs.writeFileSync(primaryPath, content, 'utf-8');
        writeResults.push({ file: PRIMARY_FILE, status: 'success' });
        primaryOk = true;
      } catch (err: any) {
        writeResults.push({ file: PRIMARY_FILE, status: 'error', message: err.message });
      }
      if (primaryOk) {
        for (const file of COPY_FILES) {
          try {
            fs.copyFileSync(primaryPath, path.join(resolvedPath, file));
            writeResults.push({ file, status: 'success' });
          } catch (err: any) {
            writeResults.push({ file, status: 'error', message: err.message });
          }
        }
      }

      // New project: also create the log, goals and lessons files (never overwrites)
      let created: string[] = [];
      if (initProject === true && primaryOk) {
        try {
          created = createStarterFiles(resolvedPath);
        } catch (err: any) {
          writeResults.push({ file: LOG_DIR, status: 'error', message: err.message });
        }
      }

      return NextResponse.json(
        { success: primaryOk, results: writeResults, created },
        { status: primaryOk ? 200 : 500 },
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
