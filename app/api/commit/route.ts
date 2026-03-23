import { NextRequest, NextResponse } from 'next/server';
import { exec, execFile } from 'child_process';
import util from 'util';
import path from 'path';
import os from 'os';

const execPromise = util.promisify(exec);
const execFilePromise = util.promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectPath, message } = body;

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

    const commitMsg = message || `Session close: ${new Date().toISOString()}`;

    // 1. Check if it's a git repository
    try {
      await execPromise('git status', { cwd: resolvedPath });
    } catch {
      // Not a git repo, initialize it
      await execPromise('git init', { cwd: resolvedPath });
    }

    // 2. Add all
    await execPromise('git add .', { cwd: resolvedPath });

    // 3. Commit — commitMsg passed as argument array, never interpolated into shell string (C1)
    try {
      const { stdout } = await execFilePromise('git', ['commit', '-m', commitMsg], { cwd: resolvedPath });
      return NextResponse.json({ success: true, message: stdout });
    } catch (commitErr: any) {
      if (commitErr.stdout && commitErr.stdout.includes('nothing to commit')) {
        return NextResponse.json({ success: true, message: 'Working directory clean, nothing to commit.' });
      }
      throw commitErr;
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
