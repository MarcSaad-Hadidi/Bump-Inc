import { randomUUID } from 'node:crypto';
import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../src/server.js';

const env = parseEnv(apiEnvSchema, {
  ...process.env,
  AUTH_ALLOW_SIGNUP: 'true',
  LOG_LEVEL: 'silent',
});
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (
  env.NODE_ENV !== 'test' ||
  !new URL(env.DATABASE_URL).pathname.endsWith('_test') ||
  !migrationUrl ||
  new URL(migrationUrl).pathname !== new URL(env.DATABASE_URL).pathname ||
  new URL(migrationUrl).host !== new URL(env.DATABASE_URL).host
) {
  throw new Error('Private rate integration requires isolated matching _test databases');
}
const database = createDatabase(env.DATABASE_URL);
const admin = createDatabase(migrationUrl);
const messages: MailMessage[] = [];
const sendMail = async (message: MailMessage) => {
  messages.push(message);
};
const auth = createAuth(database.db, env, sendMail);
const app = buildServer(env, {
  identity: { database, env, auth, sendMail },
  start: () => assertRuntimeRole(database.pool),
  database: () => database.pool.query('SELECT 1'),
  redis: async () => 'PONG',
  close: () => database.pool.end(),
});
const password = 'Synthetic-private-rate-password-8dE!';
const fixtureUserIds = new Set<string>();
type Person = { id: string; email: string; cookie: string };
let personA: Person;
let personB: Person;
let enrollmentAddress = 1;

function cookies(response: { headers: Record<string, unknown> }) {
  const raw = response.headers['set-cookie'];
  const values: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return values.map((cookie) => cookie.split(';')[0]).join('; ');
}

function get(url: string, address: string, cookie = '', forged = false) {
  return app.inject({
    method: 'GET',
    url,
    remoteAddress: address,
    headers: {
      cookie,
      ...(forged
        ? {
            'x-bump-client-ip': `203.0.113.${1 + (enrollmentAddress++ % 200)}`,
            'x-forwarded-for': randomUUID(),
            'x-real-ip': randomUUID(),
            'x-user-id': randomUUID(),
          }
        : {}),
    },
  });
}

async function enroll(): Promise<Person> {
  const email = `private-rate-${randomUUID()}@example.test`;
  const remoteAddress = `192.0.2.${enrollmentAddress++}`;
  const signup = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    remoteAddress,
    headers: { origin: env.AUTH_BASE_URL },
    payload: { name: 'Synthetic private rate user', email, password },
  });
  const id = signup.json<{ user?: { id?: string } }>().user?.id;
  if (id) fixtureUserIds.add(id);
  expect(signup.statusCode).toBe(200);
  if (!id) throw new Error('Synthetic rate fixture user was not created');
  const link = messages
    .findLast((message) => message.to === email)
    ?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error('Synthetic rate verification message was not captured');
  const verification = new URL(link);
  expect(
    (await get(`${verification.pathname}${verification.search}`, remoteAddress)).statusCode,
  ).toBe(302);
  const signin = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    remoteAddress,
    headers: { origin: env.AUTH_BASE_URL },
    payload: { email, password },
  });
  expect(signin.statusCode).toBe(200);
  return { id, email, cookie: cookies(signin) };
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  await app.ready();
  personA = await enroll();
  personB = await enroll();
});

afterAll(async () => {
  try {
    const ids = [...fixtureUserIds];
    await admin.pool.query('DELETE FROM verification WHERE value = ANY($1::text[])', [ids]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [ids]);
    messages.length = 0;
  } finally {
    await app.close();
    await admin.pool.end();
  }
});

describe('private API limits with authoritative Better Auth sessions', () => {
  it('keeps 120 requests per verified actor while separating users behind the same proxy', async () => {
    const address = '127.0.0.1';
    for (let count = 0; count < 120; count++) {
      const response = await get('/me', address, personA.cookie);
      expect(response.statusCode).toBe(200);
      expect(Number(response.headers['x-ratelimit-limit'])).toBe(120);
      expect(Number(response.headers['x-ratelimit-remaining'])).toBe(119 - count);
    }
    const limited = await get('/me', address, personA.cookie);
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({ error: 'Too Many Requests', requestId: expect.any(String) });
    expect((await get('/organizations', address, personA.cookie)).statusCode).toBe(429);
    expect(
      (await get(`/organizations/${randomUUID()}/cyber/snapshot`, address, personA.cookie))
        .statusCode,
    ).toBe(429);
    expect((await get('/me', address, personB.cookie)).statusCode).toBe(200);
    expect((await get('/organizations', address, personB.cookie)).statusCode).toBe(200);
    // Moving the same verified session to a different IP cannot reset its budget.
    expect((await get('/me', '198.51.100.20', personA.cookie)).statusCode).toBe(429);
  });

  it('keeps rotating forged cookies and forwarded identities in the same IP budget', async () => {
    const address = '198.51.100.21';
    for (let count = 0; count < 120; count++) {
      const response = await get('/me', address, `better-auth.session_token=${randomUUID()}`, true);
      expect(response.statusCode).toBe(401);
      expect(Number(response.headers['x-ratelimit-remaining'])).toBe(119 - count);
    }
    expect(
      (await get('/me', address, `better-auth.session_token=${randomUUID()}`, true)).statusCode,
    ).toBe(429);
    expect((await get('/health/ready', address)).statusCode).toBe(429);
  });

  it('uses the shared IP budget for valid sessions whose current email is unverified', async () => {
    const ids = [personA.id, personB.id];
    await admin.db
      .update(authSchema.user)
      .set({ emailVerified: false })
      .where(inArray(authSchema.user.id, ids));
    try {
      const address = '198.51.100.22';
      for (let count = 0; count < 120; count++) {
        const person = count % 2 ? personA : personB;
        const response = await get('/me', address, person.cookie);
        expect(response.statusCode).toBe(403);
        expect(Number(response.headers['x-ratelimit-remaining'])).toBe(119 - count);
      }
      expect((await get('/me', address, personB.cookie)).statusCode).toBe(429);
    } finally {
      await admin.db
        .update(authSchema.user)
        .set({ emailVerified: true })
        .where(inArray(authSchema.user.id, ids));
    }
  });

  it('preserves the public auth and health IP limit despite valid session rotation', async () => {
    const address = '198.51.100.23';
    for (let count = 0; count < 120; count++) {
      const person = count % 2 ? personA : personB;
      const response = await get('/api/auth/get-session', address, person.cookie);
      // Better Auth can impose its own stricter IP limit before the global 120.
      expect([200, 429].includes(response.statusCode)).toBe(true);
      expect(Number(response.headers['x-ratelimit-remaining'])).toBe(119 - count);
    }
    expect((await get('/api/auth/get-session', address, personB.cookie)).statusCode).toBe(429);
    expect((await get('/health/ready', address, personB.cookie)).statusCode).toBe(429);
    expect((await get('/health/live', address, personB.cookie)).statusCode).toBe(200);
  });

  it('falls back to the IP limit when the authoritative session lookup fails', async () => {
    const lookup = vi
      .spyOn(auth.api, 'getSession')
      .mockRejectedValue(new Error('Synthetic session database outage'));
    try {
      const address = '198.51.100.24';
      for (let count = 0; count < 120; count++) {
        const person = count % 2 ? personA : personB;
        const response = await get('/me', address, person.cookie);
        expect(response.statusCode).toBe(500);
        expect(Number(response.headers['x-ratelimit-remaining'])).toBe(119 - count);
      }
      expect((await get('/me', address, personB.cookie)).statusCode).toBe(429);
    } finally {
      lookup.mockRestore();
    }
  });

  it('rechecks revoked sessions in PostgreSQL before selecting an actor budget', async () => {
    await admin.db.delete(authSchema.session).where(eq(authSchema.session.userId, personA.id));
    const address = '198.51.100.25';
    const revoked = await get('/me', address, personA.cookie);
    expect(revoked.statusCode).toBe(401);
    expect(Number(revoked.headers['x-ratelimit-remaining'])).toBe(119);
    const anonymous = await get('/me', address);
    expect(anonymous.statusCode).toBe(401);
    expect(Number(anonymous.headers['x-ratelimit-remaining'])).toBe(118);
  });
});
