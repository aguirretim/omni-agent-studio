const { exec } = require('child_process');

const command = 'codex';
const projectPath = 'c:\\Users\\aguir\\OneDrive\\Documents\\omni-agent-studio';
const installCmd = 'npm install -g @openai/codex';
const bin = 'codex';

const winCmd = `start "OmniAgent - ${command}" cmd.exe /K "cd /d ${projectPath} && (where ${bin} >nul 2>nul || (echo ${command} is not installed. Auto-installing... && ${installCmd})) && ${bin}"`;

console.log('Executing:', winCmd);

exec(winCmd, (error) => {
  if (error) {
    console.error('Exec error:', error);
  } else {
    console.log('Success');
  }
});
