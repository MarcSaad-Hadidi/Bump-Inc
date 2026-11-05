import { randomBytes } from 'node:crypto';
import { chmod, lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

if (process.env.NODE_ENV === 'production')
  throw new Error('Local initialization is forbidden in production');
const root = resolve('.artifacts/cyber-keys');
await mkdir(root, { recursive: true, mode: 0o700 });
await chmod(root, 0o700);
for (const [name, envFile] of [
  ['local', '.env'],
  ['test', '.env.test'],
]) {
  const key = join(root, `${name}.key`);
  try {
    await writeFile(key, randomBytes(32), { flag: 'wx', mode: 0o600 });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const s = await lstat(key);
    if (!s.isFile() || s.isSymbolicLink() || s.size !== 32)
      throw new Error('Existing key is invalid; refusing to overwrite');
  }
  try {
    const text = await readFile(envFile, 'utf8');
    if (/^NODE_ENV=production$/m.test(text)) throw new Error('Production environment file refused');
    if (!/^CYBER_EVIDENCE_KEY_FILE=/m.test(text))
      await writeFile(
        envFile,
        `${text}\nCYBER_EVIDENCE_KEY_FILE=${key}\nCYBER_TRIVY_CACHE_DIR=${resolve('.artifacts/trivy-cache')}\n`,
        { mode: 0o600 },
      );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
console.log(
  'Private local/test Cyber keys created or preserved. Existing .env files configured; no key value was printed.',
);
