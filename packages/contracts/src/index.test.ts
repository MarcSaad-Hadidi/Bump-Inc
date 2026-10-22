import { describe, expect, it } from 'vitest';
import { apiEnvSchema, parseEnv, probeJobSchema, workerEnvSchema } from './index.js';

const local = {
  DATABASE_URL: 'postgresql://bump:secret@localhost:5432/bump',
  REDIS_URL: 'redis://localhost:6379',
};
const productionIdentity = {
  AUTH_SECRET: 'test-only-production-shaped-secret-value',
  AUTH_BASE_URL: 'https://bump.example',
  SMTP_HOST: 'smtp.example',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'test-user',
  SMTP_PASSWORD: 'test-password',
  MAIL_FROM: 'test@bump.example',
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
        ...productionIdentity,
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
  it('requires explicit secure identity settings in production and parses boolean flags exactly', () => {
    const valid = {
      ...local,
      ...productionIdentity,
      NODE_ENV: 'production',
      DATABASE_URL: `${local.DATABASE_URL}?sslmode=verify-full`,
      REDIS_URL: 'rediss://localhost:6379',
    };
    expect(parseEnv(apiEnvSchema, valid).SMTP_SECURE).toBe(true);
    for (const overrides of [
      { AUTH_SECRET: 'local-development-only-change-this-secret' },
      { AUTH_BASE_URL: 'http://example.com' },
      { AUTH_BASE_URL: 'https://example.com/?token=secret' },
      { AUTH_ALLOW_SIGNUP: 'true' },
      { SMTP_SECURE: 'false' },
      { SMTP_USER: undefined },
      { MAIL_FROM: 'noreply@bump.local' },
    ])
      expect(() => parseEnv(apiEnvSchema, { ...valid, ...overrides })).toThrow(
        'Invalid environment',
      );
    expect(parseEnv(apiEnvSchema, { ...local, AUTH_ALLOW_SIGNUP: 'false' }).AUTH_ALLOW_SIGNUP).toBe(
      false,
    );
    expect(() => parseEnv(apiEnvSchema, { ...local, AUTH_ALLOW_SIGNUP: 'yes' })).toThrow(
      'AUTH_ALLOW_SIGNUP',
    );
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
