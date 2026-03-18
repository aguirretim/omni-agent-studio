import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let currentPath = body.path;

    // If no path provided, start at the user's home directory
    if (!currentPath) {
      currentPath = os.homedir();
    }

    // Ensure the path is absolute
    currentPath = path.resolve(currentPath);

    // Check if the directory exists
    if (!fs.existsSync(currentPath)) {
      return NextResponse.json({ error: 'Directory does not exist' }, { status: 404 });
    }

    // Read the directory contents
    let files: fs.Dirent[] = [];
    try {
      files = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (err: any) {
      return NextResponse.json({ error: 'Permission denied or unable to read directory' }, { status: 403 });
    }

    // Filter only directories and format the output
    const directories = files
      .filter((file) => file.isDirectory())
      .filter((file) => !file.name.startsWith('.')) // Optionally hide hidden folders
      .map((dir) => ({
        name: dir.name,
        path: path.join(currentPath, dir.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get the parent directory (unless we are at the root)
    const parentPath = path.dirname(currentPath);
    const hasParent = parentPath !== currentPath;

    return NextResponse.json({
      currentPath,
      parentPath: hasParent ? parentPath : null,
      directories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
