const { exec } = require('child_process');

const model = 'gemini';
const prompt = 'hello world';
const projectPath = 'c:\\Users\\aguir\\OneDrive\\Documents\\omni-agent-studio';

const installCmd = 'npm install -g @google/gemini-cli';
const bin = 'gemini';
const baseCheck = `where ${bin} >nul 2>nul || (echo ${model} is not installed. Auto-installing... && ${installCmd})`;
const cmdToExecute = `${baseCheck} && ${bin} -p "${prompt.replace(/"/g, '\\"')}"`;

console.log('Execing ->', cmdToExecute);

const child = exec(cmdToExecute, {
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
