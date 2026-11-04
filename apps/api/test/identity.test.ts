import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { createDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';

const env = parseEnv(apiEnvSchema, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused_test',
  REDIS_URL: 'redis://127.0.0.1:1/1',
});
const apps: ReturnType<typeof buildServer>[] = [];
function setup() {
  const database = createDatabase(env.DATABASE_URL);
  const sendMail = async () => {
    throw new Error('Unexpected delivery');
  };
  const app = buildServer(env, {
    identity: { database, env, auth: createAuth(database.db, env, sendMail), sendMail },
    start: async () => {},
    database: async () => {},
    redis: async () => {},
    close: () => database.pool.end(),
  });
  apps.push(app);
  return app;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('identity HTTP boundaries', () => {
  it('does not expose library organization mutations or deletion endpoints', async () => {
    const app = setup();
    for (const url of [
      '/api/auth/organization/create',
      '/api/auth/organization/update-member-role',
      '/api/auth/organization%2Fcreate',
      '/api/auth/delete-user',
    ]) {
      const result = await app.inject({
        method: 'POST',
        url,
        headers: { origin: env.AUTH_BASE_URL },
        payload: {},
      });
      expect(result.statusCode).toBe(404);
    }
  });
  it('requires explicit enrollment configuration', async () => {
    const result = await setup().inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { origin: env.AUTH_BASE_URL },
      payload: {},
    });
    expect(result.statusCode).toBe(403);
  });
  it('rejects absent and hostile origins before cookie-authenticated mutations', async () => {
    const app = setup();
    for (const headers of [{}, { origin: 'https://attacker.example' }]) {
      const result = await app.inject({
        method: 'POST',
        url: '/organizations',
        headers,
        payload: { name: 'forged' },
      });
      expect(result.statusCode).toBe(403);
    }
  });
  it('rejects unauthenticated organization access', async () => {
    expect((await setup().inject('/organizations')).statusCode).toBe(401);
  });
  it('shares session and CSRF protection with engagement routes', async () => {
    const app = setup();
    const base = '/organizations/00000000-0000-4000-8000-000000000001/engagements';
    expect((await app.inject(base)).statusCode).toBe(401);
    const withoutOrigin = await app.inject({ method: 'POST', url: base, payload: {} });
    expect(withoutOrigin.statusCode).toBe(403);
    const withoutSession = await app.inject({
      method: 'POST',
      url: base,
      headers: { origin: env.AUTH_BASE_URL },
      payload: {},
    });
    expect(withoutSession.statusCode).toBe(401);
  });
  it('keeps callback origin validation active in the test environment', async () => {
    const response = await setup().inject(
      '/api/auth/verify-email?token=invalid&callbackURL=https%3A%2F%2Fattacker.example',
    );
    expect(response.statusCode).toBe(403);
  });
});
