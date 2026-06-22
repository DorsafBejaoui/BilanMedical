// Lance simultanément l'API (port 3001) et le frontend Vite (port 5173)
import { spawn } from 'child_process';

// Sur Windows, npm est npm.cmd ; sur Unix c'est npm
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const procs = [
  { name: 'API   ', cmd: npm, args: ['--prefix', 'server', 'start'], color: '\x1b[36m' },
  { name: 'CLIENT', cmd: npm, args: ['--prefix', 'client', 'run', 'dev'], color: '\x1b[35m' },
];

const children = procs.map(({ name, cmd, args, color }) => {
  const child = spawn(cmd, args, { shell: false });
  const tag = `${color}[${name}]\x1b[0m `;
  child.stdout.on('data', (d) => process.stdout.write(d.toString().replace(/^/gm, tag)));
  child.stderr.on('data', (d) => process.stderr.write(d.toString().replace(/^/gm, tag)));
  return child;
});

const shutdown = () => { children.forEach((c) => c.kill()); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
