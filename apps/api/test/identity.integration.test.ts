import { randomUUID } from 'node:crypto';
import { apiEnvSchema, parseEnv } from '@bump/contracts';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
import { and, eq } from 'drizzle-orm';
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
  throw new Error(
    'Identity integration tests require isolated runtime and migration _test databases',
  );
}
const database = createDatabase(env.DATABASE_URL);
const admin = createDatabase(migrationUrl);
const messages: MailMessage[] = [];
let rejectDelivery = false;
const sendMail = async (message: MailMessage) => {
  if (rejectDelivery) throw new Error('Simulated SMTP failure');
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
const password = 'Test-only-password-4cD!';
const clientAddresses = new Map<string, string>();
const fixtureUserIds = new Set<string>();
const fixtureOrganizationIds = new Set<string>();
type Person = { id: string; email: string; cookie: string };
let ownerA: Person;
let ownerB: Person;
let member: Person;
let organizationA: string;
let organizationB: string;

function request(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  person?: Person,
  payload?: unknown,
) {
  const email =
    person?.email ??
    (payload &&
    typeof payload === 'object' &&
    'email' in payload &&
    typeof payload.email === 'string'
      ? payload.email
      : 'anonymous');
  if (!clientAddresses.has(email))
    clientAddresses.set(email, `192.0.2.${clientAddresses.size + 1}`);
  return app.inject({
    method,
    url,
    remoteAddress: clientAddresses.get(email) ?? '192.0.2.254',
    headers: {
      origin: env.AUTH_BASE_URL,
      'x-bump-client-ip': '203.0.113.99',
      'x-forwarded-for': '203.0.113.99',
      ...(person ? { cookie: person.cookie } : {}),
    },
    ...(payload === undefined
      ? {}
      : {
          payload: JSON.stringify(payload),
          headers: {
            origin: env.AUTH_BASE_URL,
            'x-bump-client-ip': '203.0.113.99',
            'x-forwarded-for': '203.0.113.99',
            'content-type': 'application/json',
            ...(person ? { cookie: person.cookie } : {}),
          },
        }),
  });
}

async function enroll(verify = true): Promise<Person> {
  const email = `${randomUUID()}@example.test`;
  const signup = await request('POST', '/api/auth/sign-up/email', undefined, {
    name: 'Test account',
    email,
    password,
  });
  const createdUserId = signup.json<{ user?: { id?: string } }>().user?.id;
  if (createdUserId) fixtureUserIds.add(createdUserId);
  expect(signup.statusCode, signup.body).toBe(200);
  const verification = messages.findLast(
    (message) => message.to === email && message.subject.includes('Verify'),
  );
  expect(verification).toBeDefined();
  const link = verification?.text.match(/https?:\/\/\S+/)?.[0];
  expect(link).toBeDefined();
  if (verify) {
    const url = new URL(link ?? '');
    expect((await request('GET', `${url.pathname}${url.search}`)).statusCode).toBe(302);
  }
  const signin = await request('POST', '/api/auth/sign-in/email', undefined, { email, password });
  if (!verify) {
    expect(signin.statusCode).toBe(403);
    return { id: signup.json().user.id as string, email, cookie: '' };
  }
  expect(signin.statusCode, signin.body).toBe(200);
  const cookies = signin.headers['set-cookie'];
  const values = Array.isArray(cookies) ? cookies : [cookies ?? ''];
  expect(
    values.some((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')),
  ).toBe(true);
  return {
    id: signin.json().user.id as string,
    email,
    cookie: values.map((cookie) => cookie.split(';')[0]).join('; '),
  };
}

async function organization(person: Person) {
  const response = await request('POST', '/organizations', person, {
    name: 'Test organization',
    slug: `test-${randomUUID()}`,
    locale: 'en',
  });
  const createdOrganizationId = response.json<{ id?: string }>().id;
  if (createdOrganizationId) fixtureOrganizationIds.add(createdOrganizationId);
  expect(response.statusCode, response.body).toBe(201);
  return response.json().id as string;
}

async function invite(
  person: Person,
  organizationId: string,
  email: string,
  role = 'member',
  resend = false,
) {
  return request('POST', `/organizations/${organizationId}/invitations`, person, {
    email,
    role,
    resend,
  });
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  ownerA = await enroll();
  ownerB = await enroll();
  member = await enroll();
  organizationA = await organization(ownerA);
  organizationB = await organization(ownerB);
});

afterAll(async () => {
  try {
    const organizationIds = [...fixtureOrganizationIds];
    const userIds = [...fixtureUserIds];
    await admin.pool.query(
      'DELETE FROM organization_audit WHERE organization_id = ANY($1::text[])',
      [organizationIds],
    );
    await admin.pool.query(
      'DELETE FROM organization_settings WHERE organization_id = ANY($1::text[])',
      [organizationIds],
    );
    // Organization and user foreign keys cascade through their owned auth records.
    await admin.pool.query('DELETE FROM organization WHERE id = ANY($1::text[])', [
      organizationIds,
    ]);
    await admin.pool.query('DELETE FROM verification WHERE value = ANY($1::text[])', [userIds]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [userIds]);
  } finally {
    try {
      await app.close();
    } finally {
      await admin.pool.end();
    }
  }
});

describe('library-backed identity and tenant API', () => {
  it('serializes concurrent organization creation at five per user', async () => {
    const person = await enroll();
    const responses = await Promise.all(
      Array.from({ length: 6 }, async () => {
        const response = await request('POST', '/organizations', person, {
          name: 'Concurrent test organization',
          slug: `cap-${randomUUID()}`,
          locale: 'en',
        });
        const id = response.json<{ id?: string }>().id;
        if (id) fixtureOrganizationIds.add(id);
        return response;
      }),
    );
    expect(responses.filter((response) => response.statusCode === 201)).toHaveLength(5);
    expect(responses.filter((response) => response.statusCode === 403)).toHaveLength(1);
    expect((await request('GET', '/organizations', person)).json()).toHaveLength(5);
  });

  it('uses secure cookies and disables enrollment in production mode', async () => {
    const productionEnv = {
      ...env,
      NODE_ENV: 'production' as const,
      AUTH_BASE_URL: 'https://bump.example.test',
    };
    const productionApp = buildServer(productionEnv, {
      identity: {
        database,
        env: productionEnv,
        auth: createAuth(database.db, productionEnv, sendMail),
        sendMail,
      },
      start: async () => {},
      database: async () => {},
      redis: async () => {},
      close: async () => {},
    });
    try {
      const response = await productionApp.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        headers: { origin: productionEnv.AUTH_BASE_URL },
        payload: { email: ownerB.email, password },
      });
      expect(response.statusCode, response.body).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(
        (Array.isArray(cookies) ? cookies : [cookies ?? '']).some(
          (cookie) =>
            cookie.includes('Secure') &&
            cookie.includes('HttpOnly') &&
            cookie.includes('SameSite=Lax'),
        ),
      ).toBe(true);
      expect(
        (
          await productionApp.inject({
            method: 'POST',
            url: '/api/auth/sign-up/email',
            headers: { origin: productionEnv.AUTH_BASE_URL },
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
    } finally {
      await productionApp.close();
    }
  });

  it('does not create sessions for unverified email addresses', async () => {
    await enroll(false);
  });

  it('isolates organization lists, reads, writes, settings, membership and audit', async () => {
    const list = await request('GET', '/organizations', ownerA);
    expect(list.json().map((item: { id: string }) => item.id)).toEqual([organizationA]);
    for (const suffix of ['', '/settings', '/members', '/audit']) {
      expect(
        (await request('GET', `/organizations/${organizationB}${suffix}`, ownerA)).statusCode,
      ).toBe(403);
    }
    expect(
      (await request('PATCH', `/organizations/${organizationB}`, ownerA, { name: 'forged' }))
        .statusCode,
    ).toBe(403);
    expect(
      (await request('PATCH', `/organizations/${organizationB}/settings`, ownerA, { locale: 'fr' }))
        .statusCode,
    ).toBe(403);
    expect((await invite(ownerA, organizationB, member.email)).statusCode).toBe(403);
    expect(
      (await request('PATCH', `/organizations/${organizationA}/settings`, ownerA, { locale: 'fr' }))
        .statusCode,
    ).toBe(200);
    expect(
      (await request('GET', `/organizations/${organizationA}/settings`, ownerA)).json().locale,
    ).toBe('fr');
    expect(
      (await request('GET', `/organizations/${organizationB}/settings`, ownerB)).json().locale,
    ).toBe('en');
  });

  it('accepts only the verified intended recipient and refuses replay', async () => {
    const invitation = await invite(ownerA, organizationA, member.email);
    expect(invitation.statusCode, invitation.body).toBe(201);
    expect(invitation.json().delivery).toBe('sent');
    const invitationId = invitation.json().invitationId as string;
    expect(
      messages.some(
        (message) => message.to === member.email && message.text.includes(invitationId),
      ),
    ).toBe(true);
    expect((await request('POST', `/invitations/${invitationId}/accept`, ownerB)).statusCode).toBe(
      403,
    );
    expect((await request('GET', `/invitations/${invitationId}`, member)).statusCode).toBe(200);
    const accepted = await Promise.all([
      request('POST', `/invitations/${invitationId}/accept`, member),
      request('POST', `/invitations/${invitationId}/accept`, member),
    ]);
    expect(accepted.map((result) => result.statusCode).sort()).toEqual([200, 400]);
    expect((await request('POST', `/invitations/${invitationId}/accept`, member)).statusCode).toBe(
      400,
    );
    expect((await request('GET', `/organizations/${organizationA}`, member)).statusCode).toBe(200);
  });

  it('enforces member roles and records the acting admin rather than the target user', async () => {
    expect((await invite(member, organizationA, ownerB.email)).statusCode).toBe(403);
    expect(
      (await request('PATCH', `/organizations/${organizationA}/settings`, member, { locale: 'en' }))
        .statusCode,
    ).toBe(403);
    expect((await request('GET', `/organizations/${organizationA}/audit`, member)).statusCode).toBe(
      403,
    );
    const memberships = (
      await request('GET', `/organizations/${organizationA}/members`, ownerA)
    ).json() as { id: string; userId: string }[];
    const target = memberships.find((item) => item.userId === member.id);
    expect(target).toBeDefined();
    const promoted = await request(
      'PATCH',
      `/organizations/${organizationA}/members/${target?.id}`,
      ownerA,
      { role: 'admin' },
    );
    expect(promoted.statusCode, promoted.body).toBe(200);
    const history = (
      await request('GET', `/organizations/${organizationA}/audit`, ownerA)
    ).json() as { action: string; actorUserId: string; targetId: string }[];
    expect(history).toContainEqual(
      expect.objectContaining({
        action: 'member.role_changed',
        actorUserId: ownerA.id,
        targetId: target?.id,
      }),
    );
    expect(
      (await request('DELETE', `/organizations/${organizationA}/members/${target?.id}`, ownerA))
        .statusCode,
    ).toBe(200);
    expect(
      (await request('GET', `/organizations/${organizationA}/settings`, member)).statusCode,
    ).toBe(403);
  });

  it('rolls back a Better Auth organization update when the audit insert fails', async () => {
    await admin.pool.query(
      "ALTER TABLE organization_audit ADD CONSTRAINT api_test_audit_failure CHECK (action <> 'organization.updated') NOT VALID",
    );
    try {
      const response = await request('PATCH', `/organizations/${organizationA}`, ownerA, {
        name: 'Must roll back',
      });
      expect(response.statusCode).toBe(500);
      expect((await request('GET', `/organizations/${organizationA}`, ownerA)).json().name).toBe(
        'Test organization',
      );
    } finally {
      await admin.pool.query(
        'ALTER TABLE organization_audit DROP CONSTRAINT api_test_audit_failure',
      );
    }
  });

  it('refuses invitations from revoked admins and permits current admins to reissue them', async () => {
    const inviter = await enroll();
    const recipient = await enroll();
    const granted = await invite(ownerA, organizationA, inviter.email, 'admin');
    expect(granted.statusCode).toBe(201);
    const membership = await request(
      'POST',
      `/invitations/${granted.json().invitationId}/accept`,
      inviter,
    );
    expect(membership.statusCode, membership.body).toBe(200);
    const issued = await invite(inviter, organizationA, recipient.email);
    expect(issued.statusCode).toBe(201);
    const memberId = membership.json().memberId as string;
    expect(
      (
        await request('PATCH', `/organizations/${organizationA}/members/${memberId}`, ownerA, {
          role: 'member',
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await request('POST', `/invitations/${issued.json().invitationId}/accept`, recipient))
        .statusCode,
    ).toBe(403);
    const reissued = await invite(ownerA, organizationA, recipient.email, 'member', true);
    expect(reissued.statusCode, reissued.body).toBe(201);
    expect(reissued.json().invitationId).not.toBe(issued.json().invitationId);
    expect(
      (await request('POST', `/invitations/${reissued.json().invitationId}/accept`, recipient))
        .statusCode,
    ).toBe(200);
  });

  it('stores the connection address instead of forged forwarding headers', async () => {
    const [session] = await admin.db
      .select()
      .from(authSchema.session)
      .where(eq(authSchema.session.userId, ownerA.id));
    expect(session?.ipAddress).toBe(clientAddresses.get(ownerA.email));
    expect(session?.ipAddress).not.toBe('203.0.113.99');
  });

  it('reports SMTP failure honestly and permits resending the pending invitation', async () => {
    rejectDelivery = true;
    let response: Awaited<ReturnType<typeof request>>;
    try {
      response = await invite(ownerA, organizationA, ownerB.email);
    } finally {
      rejectDelivery = false;
    }
    expect(response.statusCode).toBe(502);
    expect(response.json().delivery).toBe('failed');
    const resent = await invite(ownerA, organizationA, ownerB.email, 'member', true);
    expect(resent.statusCode, resent.body).toBe(201);
    expect(resent.json().delivery).toBe('sent');
  });

  it('rejects expired invitations', async () => {
    const response = await invite(ownerA, organizationA, member.email);
    expect(response.statusCode).toBe(201);
    const invitationId = response.json().invitationId as string;
    await admin.db
      .update(authSchema.invitation)
      .set({ expiresAt: new Date(0) })
      .where(eq(authSchema.invitation.id, invitationId));
    expect((await request('POST', `/invitations/${invitationId}/accept`, member)).statusCode).toBe(
      400,
    );
  });

  it('revokes sessions on logout and password reset', async () => {
    const person = await enroll();
    expect((await request('POST', '/api/auth/sign-out', person)).statusCode).toBe(200);
    expect((await request('GET', '/me', person)).statusCode).toBe(401);
    const loggedIn = await request('POST', '/api/auth/sign-in/email', undefined, {
      email: person.email,
      password,
    });
    const rawCookies = loggedIn.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies ?? ''];
    person.cookie = cookies.map((cookie) => cookie.split(';')[0]).join('; ');
    const reset = await request('POST', '/api/auth/request-password-reset', undefined, {
      email: person.email,
      redirectTo: `${env.AUTH_BASE_URL}/`,
    });
    expect(reset.statusCode).toBe(200);
    const message = messages.findLast(
      (item) => item.to === person.email && item.subject.includes('Reset'),
    );
    const resetUrl = new URL(message?.text.match(/https?:\/\/\S+/)?.[0] ?? '');
    const token = resetUrl.pathname.split('/').at(-1);
    const changed = await request('POST', '/api/auth/reset-password', undefined, {
      token,
      newPassword: `${password}-changed`,
    });
    expect(changed.statusCode, changed.body).toBe(200);
    expect((await request('GET', '/me', person)).statusCode).toBe(401);
    const sessions = await admin.db
      .select()
      .from(authSchema.session)
      .where(and(eq(authSchema.session.userId, person.id)));
    expect(sessions).toHaveLength(0);
  });
});
