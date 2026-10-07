import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], { stdio: 'inherit' }),
  spawn(process.execPath, ['./node_modules/vite/bin/vite.js'], { stdio: 'inherit' }),
];

function stop() {
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

for (const child of children) {
  child.on('exit', (code) => {
    stop();
    process.exit(code ?? 0);
  });
}
