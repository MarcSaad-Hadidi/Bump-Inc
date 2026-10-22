import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

describe('API with PostgreSQL and Redis', () => {
  it('serves live and ready responses using real dependencies', async () => {
    const env = parseEnv(apiEnvSchema);
    if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test')) {
      throw new Error(
        'Integration tests require NODE_ENV=test and a database name ending in _test',
      );
    }

    const app = buildServer(env);
    try {
      const live = await app.inject('/health/live');
      expect(live.statusCode).toBe(200);
      expect(live.json()).toEqual({ status: 'ok' });

      const ready = await app.inject('/health/ready');
      expect(ready.statusCode).toBe(200);
      expect(ready.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
