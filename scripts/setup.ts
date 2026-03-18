import { execSync } from 'child_process';
import os from 'os';

console.log('--- OmniAgent Studio First-Boot Setup ---');

function checkAndInstallGlobal(command: string, pkgName: string) {
  try {
    const checkCmd = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    console.log(`[OK] ${command} is already installed.`);
  } catch (e) {
    console.log(`[INSTALLING] ${command} is missing. Installing ${pkgName} globally...`);
    try {
      execSync(`npm install -g ${pkgName}`, { stdio: 'inherit' });
      console.log(`[SUCCESS] Installed ${pkgName}`);
    } catch (err) {
      console.error(`[ERROR] Failed to install ${pkgName}. You may need to run this as Administrator/sudo.`);
    }
  }
}

console.log('\nChecking AI Agent CLI Dependencies...');
checkAndInstallGlobal('claude', '@anthropic-ai/claude-code');
checkAndInstallGlobal('gemini', '@google/gemini-cli');
checkAndInstallGlobal('opencode', 'opencode-ai');
checkAndInstallGlobal('codex', '@openai/codex');

console.log('\n--- Setup Complete. Starting OmniAgent Studio... ---\n');
