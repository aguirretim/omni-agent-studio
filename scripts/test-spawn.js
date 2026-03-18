const { spawn } = require('child_process');

const model = 'gemini';
const prompt = 'hello world';
const projectPath = 'c:\\Users\\aguir\\OneDrive\\Documents\\omni-agent-studio';

const installCmd = 'npm install -g @google/gemini-cli';
const bin = 'gemini';
const baseCheck = `where ${bin} >nul 2>nul || (echo ${model} is not installed. Auto-installing... && ${installCmd})`;
// Using 'call bin' is CRITICAL on Windows for .cmd files!
const cmdToExecute = `${baseCheck} && call ${bin} -p "${prompt.replace(/"/g, '\\"')}"`;

console.log('Spawning with call prefix ->', cmdToExecute);

const child = spawn('cmd.exe', ['/c', cmdToExecute], {
  cwd: projectPath
});

child.stdout.on('data', (data) => {
  console.log(`STDOUT: ${data.toString()}`);
});

child.stderr.on('data', (data) => {
  console.log(`STDERR: ${data.toString()}`);
});

child.on('close', (code) => {
  console.log(`Close code: ${code}`);
});

child.on('error', (error) => {
  console.error(`Spawn error: ${error}`);
});
