import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

/** Validate that a folder name is safe (no path separators or shell-special chars). */
function isSafeName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !/[/\\:*?"<>|]/.test(name);
}

/** Check if a resolved path is within allowed boundaries. */
function isAllowed(p: string): boolean {
  const homeDir = os.homedir();
  const inHome = p === homeDir || p.startsWith(homeDir + path.sep);
  const isWslMount = process.platform === 'linux' && p.startsWith('/mnt/');
  return inHome || isWslMount;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action: string = body.action ?? 'list';

    // ── MKDIR ────────────────────────────────────────────────────────────────
    if (action === 'mkdir') {
      const parent = path.resolve(body.path ?? '');
      const name: string = body.name ?? '';
      if (!isSafeName(name)) return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 });
      if (!isAllowed(parent)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const newDir = path.join(parent, name);
      if (fs.existsSync(newDir)) return NextResponse.json({ error: 'Folder already exists' }, { status: 409 });
      fs.mkdirSync(newDir);
      return NextResponse.json({ ok: true, path: newDir });
    }

    // ── RENAME ───────────────────────────────────────────────────────────────
    if (action === 'rename') {
      const oldPath = path.resolve(body.path ?? '');
      const name: string = body.name ?? '';
      if (!isSafeName(name)) return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 });
      if (!isAllowed(oldPath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (!fs.existsSync(oldPath)) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      const newPath = path.join(path.dirname(oldPath), name);
      if (!isAllowed(newPath)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (fs.existsSync(newPath)) return NextResponse.json({ error: 'Name already in use' }, { status: 409 });
      fs.renameSync(oldPath, newPath);
      return NextResponse.json({ ok: true, path: newPath });
    }

    // ── LIST (default) ───────────────────────────────────────────────────────
    let currentPath = body.path;

    if (!currentPath) {
      const home = os.homedir();
      if (process.platform === 'linux') {
        const linuxUser = home.split('/').filter(Boolean).pop() ?? '';
        const winHome = linuxUser ? `/mnt/c/Users/${linuxUser}` : '';
        currentPath = (winHome && fs.existsSync(winHome)) ? winHome : home;
      } else {
        currentPath = home;
      }
    }

    currentPath = path.resolve(currentPath);

    if (!isAllowed(currentPath)) {
      return NextResponse.json({ error: 'Forbidden: path outside allowed directories' }, { status: 403 });
    }

    if (!fs.existsSync(currentPath)) {
      return NextResponse.json({ error: 'Directory does not exist' }, { status: 404 });
    }

    let files: fs.Dirent[] = [];
    try {
      files = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return NextResponse.json({ error: 'Permission denied or unable to read directory' }, { status: 403 });
    }

    const directories = files
      .filter((file) => file.isDirectory())
      .filter((file) => !file.name.startsWith('.'))
      .map((dir) => ({ name: dir.name, path: path.join(currentPath, dir.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = path.dirname(currentPath);
    const hasParent = parentPath !== currentPath;

    return NextResponse.json({ currentPath, parentPath: hasParent ? parentPath : null, directories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
