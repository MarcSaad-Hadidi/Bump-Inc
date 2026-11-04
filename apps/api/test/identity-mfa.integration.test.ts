import { createHmac, randomUUID } from 'node:crypto';
import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
import { symmetricDecrypt } from 'better-auth/crypto';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  !new URL(migrationUrl).pathname.endsWith('_test')
) {
  throw new Error('MFA integration tests require isolated runtime and migration _test databases');
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
const password = 'Synthetic-MFA-only-password-4cD!';
const fixtureUserIds = new Set<string>();
const fixtureAttemptIdentifiers = new Set<string>();
let nextAddress = 1;
type Browser = { address: string; cookies: Map<string, string> };
type Person = { id: string; email: string; browser: Browser };
type Enrollment = { totpURI: string; backupCodes: string[] };

function browser(cookies = new Map<string, string>()): Browser {
  return { address: `192.0.2.${nextAddress++}`, cookies: new Map(cookies) };
}

async function request(
  method: 'GET' | 'POST',
  url: string,
  client: Browser = browser(),
  payload?: unknown,
) {
  const response = await app.inject({
    method,
    url,
    remoteAddress: client.address,
    headers: {
      origin: env.AUTH_BASE_URL,
      cookie: [...client.cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
  });
  const rawCookies = response.headers['set-cookie'];
  for (const cookie of Array.isArray(rawCookies) ? rawCookies : [rawCookies ?? '']) {
    const pair = cookie.split(';')[0] ?? '';
    const separator = pair.indexOf('=');
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (value) client.cookies.set(name, value);
    else client.cookies.delete(name);
  }
  return response;
}

async function enroll(): Promise<Person> {
  const client = browser();
  const email = `mfa-${randomUUID()}@example.test`;
  const signup = await request('POST', '/api/auth/sign-up/email', client, {
    name: 'Synthetic MFA account',
    email,
    password,
  });
  const id = signup.json<{ user?: { id?: string } }>().user?.id;
  if (id) fixtureUserIds.add(id);
  expect(signup.statusCode).toBe(200);
  if (!id) throw new Error('Synthetic MFA account was not created');
  const message = messages.findLast((item) => item.to === email && item.subject.includes('Verify'));
  const link = message?.text.match(/https?:\/\/\S+/)?.[0];
  if (!link) throw new Error('Synthetic verification message was not captured');
  const verification = new URL(link);
  expect(
    (await request('GET', `${verification.pathname}${verification.search}`, client)).statusCode,
  ).toBe(302);
  const signin = await request('POST', '/api/auth/sign-in/email', client, { email, password });
  expect(signin.statusCode).toBe(200);
  return { id, email, browser: client };
}

function decodeBase32(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of encoded.toUpperCase().replace(/=+$/, '')) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error('Invalid authenticator setup encoding');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  return Buffer.from(bytes);
}

// Independent RFC 6238 authenticator, using only Node's standard cryptography.
function totp(uri: string, now = Date.now()): string {
  const params = new URL(uri).searchParams;
  const secret = decodeBase32(params.get('secret') ?? '');
  const period = Number(params.get('period') ?? 30);
  const digits = Number(params.get('digits') ?? 6);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / period)));
  const digest = createHmac('sha1', secret).update(counter).digest();
  const offset = (digest.at(-1) ?? 0) & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits)
    .toString()
    .padStart(digits, '0');
}

async function enable(person: Person): Promise<Enrollment> {
  const response = await request('POST', '/api/auth/two-factor/enable', person.browser, {
    password,
  });
  expect(response.statusCode).toBe(200);
  const data = response.json<Enrollment & { method: string }>();
  expect(data.method).toBe('totp');
  expect(typeof data.totpURI === 'string').toBe(true);
  expect(Array.isArray(data.backupCodes) && data.backupCodes.length > 1).toBe(true);
  return data;
}

async function activate(person: Person): Promise<Enrollment> {
  const setup = await enable(person);
  const response = await request('POST', '/api/auth/two-factor/verify-totp', person.browser, {
    code: totp(setup.totpURI),
  });
  expect(response.statusCode).toBe(200);
  return setup;
}

async function signout(person: Person) {
  expect((await request('POST', '/api/auth/sign-out', person.browser, {})).statusCode).toBe(200);
}

async function challenge(person: Person): Promise<Browser> {
  const client = browser();
  const response = await request('POST', '/api/auth/sign-in/email', client, {
    email: person.email,
    password,
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().twoFactorRedirect).toBe(true);
  expect(response.json().twoFactorMethods).toEqual(['totp']);
  expect('token' in response.json()).toBe(false);
  const pending = await admin.db
    .select({ identifier: authSchema.verification.identifier })
    .from(authSchema.verification)
    .where(
      and(
        eq(authSchema.verification.value, person.id),
        like(authSchema.verification.identifier, '2fa-%'),
      ),
    );
  for (const entry of pending) fixtureAttemptIdentifiers.add(`2fa-attempts-${entry.identifier}`);
  return client;
}

async function storedFactor(person: Person) {
  const [stored] = await admin.db
    .select()
    .from(authSchema.twoFactor)
    .where(eq(authSchema.twoFactor.userId, person.id));
  if (!stored) throw new Error('Synthetic MFA enrollment was not stored');
  return stored;
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  await app.ready();
});

afterAll(async () => {
  try {
    const userIds = [...fixtureUserIds];
    await admin.pool.query('DELETE FROM verification WHERE value = ANY($1::text[])', [userIds]);
    await admin.pool.query('DELETE FROM verification WHERE identifier = ANY($1::text[])', [
      [...fixtureAttemptIdentifiers],
    ]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [userIds]);
    messages.length = 0;
  } finally {
    await app.close();
    await admin.pool.end();
  }
});

describe('Better Auth MFA over real PostgreSQL and HTTP', () => {
  it('requires the password and a verified authenticator, and encrypts stored secrets', async () => {
    const person = await enroll();
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(false);
    const denied = await request('POST', '/api/auth/two-factor/enable', person.browser, {
      password: 'incorrect-password',
    });
    expect(denied.statusCode).toBe(400);
    const setup = await enable(person);
    const uri = new URL(setup.totpURI);
    expect(uri.protocol).toBe('otpauth:');
    expect(uri.searchParams.get('issuer')).toBe('Bump Cyber');
    const stored = await storedFactor(person);
    const plaintextSecret = decodeBase32(uri.searchParams.get('secret') ?? '').toString('utf8');
    // Assertions deliberately compare booleans so a failure cannot print a secret.
    expect(stored.secret !== plaintextSecret).toBe(true);
    expect(stored.secret.includes(plaintextSecret)).toBe(false);
    expect(
      (await symmetricDecrypt({ key: env.AUTH_SECRET, data: stored.secret })) === plaintextSecret,
    ).toBe(true);
    expect(stored.backupCodes !== JSON.stringify(setup.backupCodes)).toBe(true);
    expect(setup.backupCodes.some((code) => stored.backupCodes.includes(code))).toBe(false);
    expect(
      (await symmetricDecrypt({ key: env.AUTH_SECRET, data: stored.backupCodes })) ===
        JSON.stringify(setup.backupCodes),
    ).toBe(true);
    expect(stored.verified).toBe(false);
    expect(stored.failedVerificationCount).toBe(0);
    expect(stored.lockedUntil).toBeNull();
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(false);
    const invalid = await request('POST', '/api/auth/two-factor/verify-totp', person.browser, {
      code: 'invalid-code',
    });
    expect(invalid.statusCode).toBe(401);
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(false);
    const verified = await request('POST', '/api/auth/two-factor/verify-totp', person.browser, {
      code: totp(setup.totpURI),
    });
    expect(verified.statusCode).toBe(200);
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(true);
    expect((await storedFactor(person)).verified).toBe(true);
  });

  it('creates no session until the second factor succeeds and consumes the challenge', async () => {
    const person = await enroll();
    const setup = await activate(person);
    await signout(person);
    const client = await challenge(person);
    const replay = browser(client.cookies);
    expect((await request('GET', '/me', client)).statusCode).toBe(401);
    expect((await request('GET', '/api/auth/get-session', client)).json()).toBeNull();
    const sessions = await admin.db
      .select({ id: authSchema.session.id })
      .from(authSchema.session)
      .where(eq(authSchema.session.userId, person.id));
    expect(sessions).toHaveLength(0);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', client, {
          code: 'invalid-code',
        })
      ).statusCode,
    ).toBe(401);
    expect((await request('GET', '/me', client)).statusCode).toBe(401);
    const verified = await request('POST', '/api/auth/two-factor/verify-totp', client, {
      code: totp(setup.totpURI),
    });
    expect(verified.statusCode).toBe(200);
    expect((await request('GET', '/me', client)).statusCode).toBe(200);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', replay, {
          code: totp(setup.totpURI),
        })
      ).statusCode,
    ).toBe(401);
  });

  it('rejects missing, tampered and expired challenge cookies', async () => {
    const person = await enroll();
    const setup = await activate(person);
    await signout(person);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', browser(), {
          code: totp(setup.totpURI),
        })
      ).statusCode,
    ).toBe(401);
    const client = await challenge(person);
    const forged = browser(client.cookies);
    const challengeCookie = [...forged.cookies.keys()].find((name) => name.endsWith('.two_factor'));
    if (!challengeCookie) throw new Error('MFA challenge cookie was not issued');
    forged.cookies.set(challengeCookie, `${forged.cookies.get(challengeCookie)}tampered`);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', forged, {
          code: totp(setup.totpURI),
        })
      ).statusCode,
    ).toBe(401);
    await admin.db
      .update(authSchema.verification)
      .set({ expiresAt: new Date(0) })
      .where(
        and(
          eq(authSchema.verification.value, person.id),
          like(authSchema.verification.identifier, '2fa-%'),
        ),
      );
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', client, {
          code: totp(setup.totpURI),
        })
      ).statusCode,
    ).toBe(401);
    expect((await request('GET', '/me', client)).statusCode).toBe(401);
  });

  it('accepts recovery codes once and refuses reuse on the next sign-in', async () => {
    const person = await enroll();
    const setup = await activate(person);
    await signout(person);
    const client = await challenge(person);
    const recovered = await request('POST', '/api/auth/two-factor/verify-backup-code', client, {
      code: setup.backupCodes[0],
    });
    expect(recovered.statusCode).toBe(200);
    expect((await request('GET', '/me', client)).statusCode).toBe(200);
    expect((await request('POST', '/api/auth/sign-out', client, {})).statusCode).toBe(200);
    const next = await challenge(person);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-backup-code', next, {
          code: setup.backupCodes[0],
        })
      ).statusCode,
    ).toBe(401);
    expect((await request('GET', '/me', next)).statusCode).toBe(401);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-backup-code', next, {
          code: setup.backupCodes[1],
        })
      ).statusCode,
    ).toBe(200);
    expect((await request('GET', '/me', next)).statusCode).toBe(200);
  });

  it('preserves the default account lockout across challenges, factors and addresses', async () => {
    const person = await enroll();
    const setup = await activate(person);
    await signout(person);
    // Seed the penultimate failure so the real default threshold is exercised without delays.
    await admin.db
      .update(authSchema.twoFactor)
      .set({ failedVerificationCount: 9 })
      .where(eq(authSchema.twoFactor.userId, person.id));
    const first = await challenge(person);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', first, {
          code: 'invalid-code',
        })
      ).statusCode,
    ).toBe(401);
    const locked = await storedFactor(person);
    expect(locked.failedVerificationCount).toBe(10);
    expect((locked.lockedUntil?.getTime() ?? 0) > Date.now()).toBe(true);
    const next = await challenge(person);
    for (const [endpoint, code] of [
      ['verify-totp', totp(setup.totpURI)],
      ['verify-backup-code', setup.backupCodes[0]],
    ]) {
      const response = await request('POST', `/api/auth/two-factor/${endpoint}`, next, { code });
      expect(response.statusCode).toBe(429);
      expect(response.json().code).toBe('ACCOUNT_TEMPORARILY_LOCKED');
    }
    expect((await request('GET', '/me', next)).statusCode).toBe(401);
    await admin.db
      .update(authSchema.twoFactor)
      .set({ lockedUntil: new Date(0) })
      .where(eq(authSchema.twoFactor.userId, person.id));
    const unlocked = await challenge(person);
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', unlocked, {
          code: totp(setup.totpURI),
        })
      ).statusCode,
    ).toBe(200);
    const reset = await storedFactor(person);
    expect(reset.failedVerificationCount).toBe(0);
    expect(reset.lockedUntil).toBeNull();
  });

  it('preserves the default three-attempt HTTP limit without creating a session', async () => {
    const client = browser();
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(
        (
          await request('POST', '/api/auth/two-factor/verify-totp', client, {
            code: 'invalid-code',
          })
        ).statusCode,
      ).toBe(401);
    }
    expect(
      (
        await request('POST', '/api/auth/two-factor/verify-totp', client, {
          code: 'invalid-code',
        })
      ).statusCode,
    ).toBe(429);
    expect((await request('GET', '/me', client)).statusCode).toBe(401);
  });

  it('requires the password to disable MFA and removes its stored enrollment', async () => {
    const person = await enroll();
    await activate(person);
    const previous = browser(person.browser.cookies);
    expect(
      (
        await request('POST', '/api/auth/two-factor/disable', person.browser, {
          password: 'incorrect-password',
        })
      ).statusCode,
    ).toBe(400);
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(true);
    const disabled = await request('POST', '/api/auth/two-factor/disable', person.browser, {
      password,
    });
    expect(disabled.statusCode).toBe(200);
    expect(disabled.json().status).toBe(true);
    expect((await request('GET', '/me', person.browser)).json().twoFactorEnabled).toBe(false);
    expect((await request('GET', '/me', previous)).statusCode).toBe(401);
    const factors = await admin.db
      .select({ id: authSchema.twoFactor.id })
      .from(authSchema.twoFactor)
      .where(eq(authSchema.twoFactor.userId, person.id));
    expect(factors).toHaveLength(0);
    await signout(person);
    const client = browser();
    const signin = await request('POST', '/api/auth/sign-in/email', client, {
      email: person.email,
      password,
    });
    expect(signin.statusCode).toBe(200);
    expect(signin.json().twoFactorRedirect === true).toBe(false);
    expect((await request('GET', '/me', client)).statusCode).toBe(200);
  });

  it('keeps CSRF, session checks and the MFA HTTP allowlist in force', async () => {
    for (const suffix of ['enable', 'disable', 'verify-totp', 'verify-backup-code']) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `/api/auth/two-factor/${suffix}`,
            headers: { origin: 'https://attacker.example' },
            payload: { password, code: 'invalid-code' },
          })
        ).statusCode,
      ).toBe(403);
    }
    expect(
      (await request('POST', '/api/auth/two-factor/enable', browser(), { password })).statusCode,
    ).toBe(401);
    for (const path of [
      '/two-factor/generate-backup-codes',
      '/two-factor/view-backup-codes',
      '/two-factor/get-totp-uri',
      '/two-factor/send-otp',
      '/two-factor/verify-otp',
      '/totp/generate',
    ]) {
      expect((await request('POST', `/api/auth${path}`, browser(), {})).statusCode).toBe(404);
    }
  });
});
