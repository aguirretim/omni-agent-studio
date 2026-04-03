import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    // CSRF check
    const origin = req.headers.get('origin');
    if (origin && origin !== 'http://localhost:3000') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { projectPath, volume, enabled } = body;

    if (!projectPath || typeof projectPath !== 'string') {
      return NextResponse.json({ error: 'projectPath required' }, { status: 400 });
    }

    // Path boundary check
    const resolved = path.resolve(projectPath);
    if (!resolved.startsWith(os.homedir())) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const claudeDir = path.join(resolved, '.claude');

    // Write volume (0-100) when provided
    if (volume !== undefined) {
      if (typeof volume !== 'number' || !Number.isInteger(volume) || volume < 0 || volume > 100) {
        return NextResponse.json({ error: 'volume must be integer 0-100' }, { status: 400 });
      }
      fs.writeFileSync(path.join(claudeDir, 'audio-volume.txt'), String(volume), 'utf8');
    }

    // Write enabled state (0 or 1) when provided so chime.ps1 can check mute
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
      }
      fs.writeFileSync(path.join(claudeDir, 'audio-enabled.txt'), enabled ? '1' : '0', 'utf8');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
