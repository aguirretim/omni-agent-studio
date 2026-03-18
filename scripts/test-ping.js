const { spawn } = require('child_process');

console.log('Spawning ping...');

const child = spawn('cmd.exe', ['/c', 'ping 8.8.8.8'], {
  cwd: __dirname
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
