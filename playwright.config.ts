import { defineConfig, devices } from '@playwright/test';

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
      env: { NODE_ENV: 'test', API_PORT: '3101', HOST: '127.0.0.1' },
    },
    {
      command: 'pnpm --filter @bump/web start --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      env: { NODE_ENV: 'production', API_INTERNAL_URL: 'http://127.0.0.1:3101' },
      timeout: 60_000,
    },
  ],
});
