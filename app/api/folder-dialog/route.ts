import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// Opens the native Windows FolderBrowserDialog via PowerShell and returns the selected path.
// Works on Windows (direct powershell) and WSL (powershell.exe).
export async function POST(req: NextRequest) {
  const ps = process.platform === 'win32' ? 'powershell' : 'powershell.exe';

  // Use a hidden TopMost owner form so the dialog always appears in front.
  const script = `
Add-Type -AssemblyName System.Windows.Forms;
[System.Windows.Forms.Application]::EnableVisualStyles();
$owner = New-Object System.Windows.Forms.Form;
$owner.TopMost = $true;
$owner.ShowInTaskbar = $false;
$owner.WindowState = 'Minimized';
$owner.Show();
$d = New-Object System.Windows.Forms.FolderBrowserDialog;
$d.Description = 'Select workspace folder';
$d.ShowNewFolderButton = $true;
$r = $d.ShowDialog($owner);
$owner.Dispose();
if ($r -eq 'OK') { Write-Output $d.SelectedPath }
`.trim();

  return new Promise<NextResponse>((resolve) => {
    let output = '';
    let error = '';

    const proc = spawn(ps, ['-NoProfile', '-Sta', '-Command', script], {
      shell: false,
      windowsHide: false,
    });

    proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { error += chunk.toString(); });

    proc.on('close', (code) => {
      const selectedPath = output.trim();
      if (selectedPath) {
        resolve(NextResponse.json({ path: selectedPath }));
      } else {
        // User cancelled or error — not a server error, just no selection
        resolve(NextResponse.json({ path: null, error: error.trim() || 'No folder selected' }));
      }
    });

    proc.on('error', (err) => {
      resolve(NextResponse.json({ path: null, error: err.message }, { status: 500 }));
    });
  });
}
