import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// A disposable key for the synthetic browser lab, never a production key.
const testDatabase = process.env['DATABASE_URL'];
if (!testDatabase || !new URL(testDatabase).pathname.endsWith('_test'))
  throw new Error('Playwright requires an isolated _test database');
mkdirSync('.artifacts', { recursive: true, mode: 0o700 });
const cyberKey = resolve('.artifacts/e2e-cyber.key');
if (!existsSync(cyberKey)) writeFileSync(cyberKey, randomBytes(32), { mode: 0o600, flag: 'wx' });
const keyStat = lstatSync(cyberKey);
if (!keyStat.isFile() || keyStat.isSymbolicLink() || keyStat.size !== 32 || keyStat.mode & 0o077)
  throw new Error('Synthetic Playwright key must be a private 32-byte file');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @bump/api start',
      url: 'http://127.0.0.1:3101/health/ready',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        API_PORT: '3101',
        HOST: '127.0.0.1',
        AUTH_ENABLED: 'true',
        AUTH_ALLOW_SIGNUP: 'true',
        AUTH_BASE_URL: 'http://127.0.0.1:3101',
        CYBER_WORKER_URL: 'http://127.0.0.1:3102',
        CYBER_EVIDENCE_KEY_FILE: cyberKey,
      },
    },
    {
      command: 'pnpm --filter @bump/worker start',
      url: 'http://127.0.0.1:3102/health/ready',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        WORKER_PORT: '3102',
        HOST: '127.0.0.1',
        CYBER_EVIDENCE_KEY_FILE: cyberKey,
        CYBER_PASSIVE_ENABLED: 'false',
        CYBER_TRIVY_CACHE_DIR: resolve('.artifacts/trivy-cache'),
      },
    },
    {
      command: 'pnpm --filter @bump/web start --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'production',
        API_INTERNAL_URL: 'http://127.0.0.1:3101',
        AUTH_BASE_URL: 'http://127.0.0.1:3101',
        CYBER_PUBLIC_ORIGIN: 'http://127.0.0.1:3100',
      },
      timeout: 60_000,
    },
  ],
});
