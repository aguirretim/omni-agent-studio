import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectPath, message } = body;

    if (!projectPath) {
      return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
    }

    const commitMsg = message || `Session close: ${new Date().toISOString()}`;

    // 1. Check if it's a git repository
    try {
      await execPromise('git status', { cwd: projectPath });
    } catch {
      // Not a git repo, initialize it
      await execPromise('git init', { cwd: projectPath });
    }

    // 2. Add all
    await execPromise('git add .', { cwd: projectPath });

    // 3. Commit
    // Using a try-catch here because if there's nothing to commit, `git commit` exits with an error code
    try {
      const { stdout } = await execPromise(`git commit -m "${commitMsg}"`, { cwd: projectPath });
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
