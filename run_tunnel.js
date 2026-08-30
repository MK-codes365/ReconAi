const { spawn } = require('child_process');
const fs = require('fs');

const logFile = 'e:/ReconAi/tunnel_output.log';
fs.writeFileSync(logFile, 'Starting untun tunnel...\n', 'utf8');

const child = spawn('npx', ['-y', 'untun', '--port', '4000'], {
  shell: true
});

child.stdout.on('data', (data) => {
  const str = data.toString();
  console.log('STDOUT:', str);
  fs.appendFileSync(logFile, str, 'utf8');
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  console.error('STDERR:', str);
  fs.appendFileSync(logFile, '[ERROR] ' + str, 'utf8');
});

child.on('close', (code) => {
  fs.appendFileSync(logFile, `Tunnel exited with code ${code}\n`, 'utf8');
});
