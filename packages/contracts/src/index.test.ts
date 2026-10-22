import { describe, expect, it } from 'vitest';
import { apiEnvSchema, parseEnv, probeJobSchema, workerEnvSchema } from './index.js';

const local = {
  DATABASE_URL: 'postgresql://bump:secret@localhost:5432/bump',
  REDIS_URL: 'redis://localhost:6379',
};

describe('environment trust boundary', () => {
  it('parses integers and rejects invalid ports, protocols and concurrency', () => {
    expect(parseEnv(apiEnvSchema, { ...local, API_PORT: '4000' }).API_PORT).toBe(4000);
    for (const API_PORT of ['0', '-1', '65536', 'x', '1.5']) {
      expect(() => parseEnv(apiEnvSchema, { ...local, API_PORT })).toThrow('API_PORT');
    }
    expect(() =>
      parseEnv(apiEnvSchema, { ...local, DATABASE_URL: 'https://example.org/bump' }),
    ).toThrow('DATABASE_URL');
    expect(() => parseEnv(workerEnvSchema, { ...local, WORKER_CONCURRENCY: '0' })).toThrow(
      'WORKER_CONCURRENCY',
    );
    for (const DATABASE_URL of ['postgres:database', 'postgresql:/bump_test', 'postgres://host/']) {
      expect(() => parseEnv(apiEnvSchema, { ...local, DATABASE_URL })).toThrow('DATABASE_URL');
    }
    for (const REDIS_URL of ['redis:garbage', 'rediss:/garbage', 'redis://host/not-a-database']) {
      expect(() => parseEnv(apiEnvSchema, { ...local, REDIS_URL })).toThrow('REDIS_URL');
    }
  });
  it('fails closed for missing configuration without exposing values', () => {
    expect(() => parseEnv(apiEnvSchema, {})).toThrow('DATABASE_URL');
    expect(() =>
      parseEnv(apiEnvSchema, { ...local, DATABASE_URL: 'password-super-secret' }),
    ).not.toThrow('password-super-secret');
  });
  it('requires verified transport and non-example credentials in production', () => {
    expect(() => parseEnv(apiEnvSchema, { ...local, NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL',
    );
    expect(
      parseEnv(apiEnvSchema, {
        ...local,
        NODE_ENV: 'production',
        DATABASE_URL: `${local.DATABASE_URL}?sslmode=verify-full`,
        REDIS_URL: 'rediss://localhost:6379',
      }).NODE_ENV,
    ).toBe('production');
    expect(() =>
      parseEnv(apiEnvSchema, {
        ...local,
        NODE_ENV: 'production',
        DATABASE_URL:
          'postgresql://bump:bump_local_development_only@localhost/bump?sslmode=verify-full',
        REDIS_URL: 'rediss://localhost',
      }),
    ).toThrow('DATABASE_URL');
  });
  it('rejects duplicate TLS options regardless of order', () => {
    for (const query of [
      'sslmode=verify-full&sslmode=disable',
      'sslmode=disable&sslmode=verify-full',
    ]) {
      expect(() =>
        parseEnv(apiEnvSchema, {
          ...local,
          NODE_ENV: 'production',
          DATABASE_URL: `${local.DATABASE_URL}?${query}`,
          REDIS_URL: 'rediss://localhost:6379',
        }),
      ).toThrow('DATABASE_URL');
    }
  });
});

it('accepts only the internal probe contract', () => {
  expect(probeJobSchema.parse({ id: '34f351c8-82dc-4fd2-af72-3af8e362a1ed' }).id).toBeTruthy();
  expect(probeJobSchema.safeParse({ id: 'not-uuid' }).success).toBe(false);
  expect(
    probeJobSchema.safeParse({ id: '34f351c8-82dc-4fd2-af72-3af8e362a1ed', command: 'anything' })
      .success,
  ).toBe(false);
});
