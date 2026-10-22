import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/**/*.integration.test.ts', 'packages/**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    env: { NODE_ENV: 'test' },
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    restoreMocks: true,
  },
});
