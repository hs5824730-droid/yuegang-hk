import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Bind only the website to the LAN; API requests go through Vite's existing proxy.
const addresses = Object.values(networkInterfaces()).flat().filter((a) =>
  a && a.family === 'IPv4' && !a.internal &&
  (/^192\.168\./.test(a.address) || /^10\./.test(a.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)));
const address = process.argv[2] || addresses[0]?.address;
if (!address || !addresses.some((a) => a.address === address)) {
  console.error('No matching LAN IPv4 address. Use: npm run dev:lan -- <local IPv4>');
  process.exit(1);
}
const origin = `http://${address}:5173`;
const runner = fileURLToPath(new URL('../node_modules/concurrently/dist/bin/concurrently.js', import.meta.url));
const child = spawn(process.execPath, [runner, '-k', 'npm:dev:server', 'vite --host 0.0.0.0 --port 5173 --strictPort'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, APP_URL: origin, HOST: '127.0.0.1' },
  stdio: 'inherit',
});
console.log(`LAN preview: ${origin}`);
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
