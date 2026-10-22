import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Dependencies } from '../src/dependencies.js';
import { buildServer } from '../src/server.js';

const env = parseEnv(apiEnvSchema, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://bump:test@localhost:5432/bump_test',
  REDIS_URL: 'redis://localhost:6379/1',
});
const apps: ReturnType<typeof buildServer>[] = [];

function setup(overrides: Partial<Dependencies> = {}) {
  const dependencies = {
    start: vi.fn(async () => undefined),
    database: vi.fn(async () => ({ rows: [{ value: 1 }] })),
    redis: vi.fn(async () => 'PONG'),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
  const app = buildServer(env, dependencies);
  apps.push(app);
  return { app, dependencies };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('API foundation', () => {
  it('checks both dependencies for readiness and owns their lifecycle', async () => {
    const { app, dependencies } = setup();
    const response = await app.inject('/health/ready');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    expect(dependencies.start).toHaveBeenCalledOnce();
    expect(dependencies.database).toHaveBeenCalledOnce();
    expect(dependencies.redis).toHaveBeenCalledOnce();
    await app.close();
    expect(dependencies.close).toHaveBeenCalledOnce();
  });

  it.each(['database', 'redis'] as const)(
    'stays live but not ready when %s fails',
    async (name) => {
      const { app } = setup({
        [name]: async () => {
          throw new Error('password=secret');
        },
      });
      const readiness = await app.inject('/health/ready');
      expect(readiness.statusCode).toBe(503);
      expect(readiness.json()).toEqual({ status: 'not_ready' });
      expect((await app.inject('/health/live')).statusCode).toBe(200);
    },
  );

  it('generates request IDs instead of trusting client headers and sets security headers', async () => {
    const { app } = setup();
    const response = await app.inject({
      url: '/health/live',
      headers: { 'request-id': 'attacker', 'x-request-id': 'attacker' },
    });
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('sanitizes unhandled errors and missing routes', async () => {
    const { app } = setup();
    app.get('/failure', async () => {
      throw new Error('postgresql://user:secret@host');
    });
    const failure = await app.inject('/failure');
    expect(failure.statusCode).toBe(500);
    expect(failure.json()).toEqual({
      error: 'Internal Server Error',
      requestId: expect.any(String),
    });
    const missing = await app.inject('/secret-token');
    expect(missing.statusCode).toBe(404);
    expect(missing.body).not.toContain('secret-token');
  });

  it('rejects invalid inputs without exposing Zod details or request contents', async () => {
    const { app } = setup();
    app.post('/validate', async (request) =>
      z.object({ name: z.string() }).strict().parse(request.body),
    );
    const invalid = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: { password: 'secret' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ error: 'Bad Request', requestId: expect.any(String) });
    const malformed = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: '{secret',
      headers: { 'content-type': 'application/json' },
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).not.toContain('secret');
  });

  it('limits request bodies', async () => {
    const { app } = setup();
    app.post('/body', async () => ({ status: 'ok' }));
    const response = await app.inject({
      method: 'POST',
      url: '/body',
      payload: { value: 'x'.repeat(1_048_576) },
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: 'Payload Too Large', requestId: expect.any(String) });
  });

  it('rate limits requests while leaving liveness available', async () => {
    const { app } = setup();
    for (let index = 0; index < 120; index += 1) {
      expect((await app.inject('/health/ready')).statusCode).toBe(200);
    }
    expect((await app.inject('/health/ready')).statusCode).toBe(429);
    expect((await app.inject('/health/live')).statusCode).toBe(200);
  });
});
