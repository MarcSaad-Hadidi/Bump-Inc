import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SCANNER_IMAGES } from '../apps/worker/dist/cyber/registry.js';

if (process.env.NODE_ENV === 'production')
  throw new Error('Tool preparation is a local operator action');
async function docker(args) {
  await new Promise((res, rej) => {
    const child = spawn('docker', ['--host=unix:///var/run/docker.sock', ...args], {
      shell: false,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('error', () => rej(new Error('Docker unavailable')));
    child.on('close', (code) => (code === 0 ? res() : rej(new Error('Tool preparation failed'))));
  });
}
for (const image of Object.values(SCANNER_IMAGES)) await docker(['pull', image]);
const cache = resolve(process.env.CYBER_TRIVY_CACHE_DIR ?? '.artifacts/trivy-cache');
if (/[\r\n,]/.test(cache)) throw new Error('Unsafe cache path');
await mkdir(cache, { recursive: true, mode: 0o755 });
const args = ['run', '--rm', '--mount', `type=bind,src=${cache},dst=/cache`];
// Optional managed-environment CA; never disable TLS verification.
if (process.env.CODEX_PROXY_CERT) {
  args.push(
    '--mount',
    `type=bind,src=/etc/ssl/certs/ca-certificates.crt,dst=/run/operator-ca.pem,readonly`,
    '--env',
    'SSL_CERT_FILE=/run/operator-ca.pem',
  );
}
args.push(
  SCANNER_IMAGES.trivy,
  'image',
  '--cache-dir',
  '/cache',
  '--download-db-only',
  '--no-progress',
);
await docker(args);
console.log(
  'Pinned images and Trivy vulnerability database prepared. No audit target was scanned.',
);
