import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/scanners/**/*.test.ts'],
    environment: 'node',
    env: { NODE_ENV: 'test' },
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 180000,
    restoreMocks: true,
  },
});
