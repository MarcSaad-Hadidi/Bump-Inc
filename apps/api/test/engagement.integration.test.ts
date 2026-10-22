import { randomUUID } from 'node:crypto';
import { apiEnvSchema, type EngagementRevisionInput, parseEnv } from '@bump/contracts';
import { authorizeEngagement } from '@bump/core';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
import { and, eq } from 'drizzle-orm';
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
  !new URL(migrationUrl).pathname.endsWith('_test')
) {
  throw new Error('Engagement tests require isolated runtime and migration _test databases');
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
type Person = { id: string; email: string; cookie: string; ip: string };
const userIds = new Set<string>();
const organizationIds = new Set<string>();
const engagementIds = new Set<string>();
let owner: Person;
let manager: Person;
let operator: Person;
let outsider: Person;
let organizationId: string;
let foreignOrganizationId: string;
let address = 0;
const target = { kind: 'hostname' as const, value: 'api.example.test' };
const action = 'configuration.read' as const;

function request(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  person: Person,
  payload?: unknown,
) {
  return app.inject({
    method,
    url,
    remoteAddress: person.ip,
    headers: {
      origin: env.AUTH_BASE_URL,
      cookie: person.cookie,
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
  });
}

async function enroll(): Promise<Person> {
  const person = {
    id: '',
    email: `${randomUUID()}@example.test`,
    cookie: '',
    ip: `198.51.100.${++address}`,
  };
  const password = 'Test-engagement-password-9xA!';
  const signup = await request('POST', '/api/auth/sign-up/email', person, {
    name: 'Engagement test',
    email: person.email,
    password,
  });
  const id = signup.json<{ user?: { id?: string } }>().user?.id;
  if (id) {
    userIds.add(id);
    person.id = id;
  }
  expect(signup.statusCode, signup.body).toBe(200);
  const mail = messages.findLast((message) => message.to === person.email);
  const url = new URL(mail?.text.match(/https?:\/\/\S+/)?.[0] ?? '');
  expect((await request('GET', `${url.pathname}${url.search}`, person)).statusCode).toBe(302);
  const signin = await request('POST', '/api/auth/sign-in/email', person, {
    email: person.email,
    password,
  });
  expect(signin.statusCode, signin.body).toBe(200);
  const cookies = signin.headers['set-cookie'];
  person.cookie = (Array.isArray(cookies) ? cookies : [cookies ?? ''])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
  return person;
}

async function makeOrganization(person: Person) {
  const result = await request('POST', '/organizations', person, {
    name: 'Engagement test',
    slug: `eng-${randomUUID()}`,
  });
  const id = result.json<{ id?: string }>().id;
  if (id) organizationIds.add(id);
  expect(result.statusCode, result.body).toBe(201);
  return result.json().id as string;
}

async function addMember(person: Person, role: 'admin' | 'member') {
  const invitation = await request('POST', `/organizations/${organizationId}/invitations`, owner, {
    email: person.email,
    role,
  });
  expect(invitation.statusCode, invitation.body).toBe(201);
  const accepted = await request(
    'POST',
    `/invitations/${invitation.json().invitationId}/accept`,
    person,
  );
  expect(accepted.statusCode, accepted.body).toBe(200);
}

function revision(overrides: Partial<EngagementRevisionInput> = {}): EngagementRevisionInput {
  return {
    objective: 'Review the explicitly authorized test asset configuration',
    responsibleUserId: operator.id,
    scope: { assets: [target], actions: [action], exclusions: [] },
    authorizationText:
      'The organization owner authorizes the named responsible member to review this exact asset during the specified interval.',
    sourceReference: 'https://127.0.0.1:1/never-fetch-this-reference',
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 3_600_000).toISOString(),
    ...overrides,
  };
}
const base = () => `/organizations/${organizationId}/engagements`;
async function create(data = revision()) {
  const response = await request('POST', base(), manager, data);
  const id = response.json<{ id?: string }>().id;
  if (id) engagementIds.add(id);
  expect(response.statusCode, response.body).toBe(201);
  return response.json() as {
    id: string;
    currentRevision: number;
    version: { authorizationSha256: string };
  };
}
function approve(
  head: { id: string; currentRevision: number; version: { authorizationSha256: string } },
  person = owner,
) {
  return request('POST', `${base()}/${head.id}/approve`, person, {
    expectedRevision: head.currentRevision,
    authorizationSha256: head.version.authorizationSha256,
  });
}
function preview(id: string, expectedRevision = 1, person = operator) {
  return request('POST', `${base()}/${id}/authorize`, person, { expectedRevision, target, action });
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  owner = await enroll();
  manager = await enroll();
  operator = await enroll();
  outsider = await enroll();
  organizationId = await makeOrganization(owner);
  foreignOrganizationId = await makeOrganization(outsider);
  await addMember(manager, 'admin');
  await addMember(operator, 'member');
});
afterAll(async () => {
  try {
    for (const table of ['engagement_approval', 'engagement_version']) {
      await admin.pool.query(`DELETE FROM ${table} WHERE engagement_id = ANY($1::uuid[])`, [
        [...engagementIds],
      ]);
    }
    await admin.pool.query('DELETE FROM engagement WHERE id = ANY($1::uuid[])', [
      [...engagementIds],
    ]);
    for (const table of ['organization_audit', 'organization_settings']) {
      await admin.pool.query(`DELETE FROM ${table} WHERE organization_id = ANY($1::text[])`, [
        [...organizationIds],
      ]);
    }
    await admin.pool.query('DELETE FROM organization WHERE id = ANY($1::text[])', [
      [...organizationIds],
    ]);
    await admin.pool.query('DELETE FROM verification WHERE value = ANY($1::text[])', [
      [...userIds],
    ]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [[...userIds]]);
  } finally {
    try {
      await app.close();
    } finally {
      await admin.pool.end();
    }
  }
});

describe('engagement authorization lifecycle', () => {
  it('stores documentary references without fetching them or executing a target action', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network execution'));
    try {
      const head = await create();
      expect((await approve(head)).statusCode).toBe(201);
      expect((await preview(head.id)).json().allowed).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it('requires approval for each immutable revision and checks worker callers through the same service', async () => {
    const head = await create();
    expect((await preview(head.id)).json()).toMatchObject({
      allowed: false,
      reason: 'not_approved',
      revision: 1,
    });
    expect((await approve(head)).statusCode).toBe(201);
    expect((await preview(head.id)).json()).toMatchObject({ allowed: true, revision: 1 });
    const direct = await authorizeEngagement(database, {
      organizationId,
      userId: operator.id,
      engagementId: head.id,
      expectedRevision: 1,
      target,
      action,
    });
    expect(direct.allowed).toBe(true);
    const amended = await request('POST', `${base()}/${head.id}/versions`, manager, {
      expectedRevision: 1,
      revision: revision({ objective: 'Amended authorized review' }),
    });
    expect(amended.statusCode, amended.body).toBe(201);
    expect((await preview(head.id, 2)).json()).toMatchObject({
      allowed: false,
      reason: 'not_approved',
    });
    expect((await preview(head.id, 1)).json()).toMatchObject({
      allowed: false,
      reason: 'revision_conflict',
      revision: 2,
    });
    expect((await approve(amended.json())).statusCode).toBe(201);
    expect((await preview(head.id, 2)).json().allowed).toBe(true);
    const history = (await request('GET', `${base()}/${head.id}`, operator)).json();
    expect(history.versions.map((item: { revision: number }) => item.revision)).toEqual([2, 1]);
    expect(history.approvals.map((item: { revision: number }) => item.revision)).toEqual([2, 1]);
    expect(history.versions[1].objective).toBe(
      'Review the explicitly authorized test asset configuration',
    );
    const first = await request('GET', `${base()}/${head.id}/versions/1`, operator);
    expect(first.json()).toMatchObject({ version: { revision: 1 }, approval: { revision: 1 } });
    expect((await request('GET', `${base()}/${head.id}/versions/99`, operator)).statusCode).toBe(
      404,
    );
  });

  it('enforces tenant, owner, manager and assigned-operator boundaries', async () => {
    const head = await create();
    expect((await request('GET', base(), outsider)).statusCode).toBe(403);
    expect((await request('GET', `${base()}/${head.id}`, outsider)).statusCode).toBe(403);
    expect(
      (
        await request(
          'GET',
          `/organizations/${foreignOrganizationId}/engagements/${head.id}`,
          outsider,
        )
      ).statusCode,
    ).toBe(404);
    expect((await request('POST', base(), operator, revision())).statusCode).toBe(403);
    expect((await approve(head, manager)).statusCode).toBe(403);
    expect((await approve(head, operator)).statusCode).toBe(403);
    expect(
      (
        await request('POST', `${base()}/${head.id}/versions`, operator, {
          expectedRevision: 1,
          revision: revision(),
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await request('POST', `${base()}/${head.id}/approve`, owner, {
          expectedRevision: 1,
          authorizationSha256: '0'.repeat(64),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await request('POST', `${base()}/${head.id}/authorize`, operator, {
          expectedRevision: 1,
          target,
          action,
          userId: owner.id,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await request('POST', base(), manager, revision({ responsibleUserId: outsider.id })))
        .statusCode,
    ).toBe(403);
    expect((await approve(head)).statusCode).toBe(201);
    expect((await preview(head.id, 1, owner)).json()).toMatchObject({
      allowed: false,
      reason: 'not_responsible',
    });
    expect(
      (
        await request('POST', `${base()}/${head.id}/versions`, manager, {
          expectedRevision: 99,
          revision: revision(),
        })
      ).statusCode,
    ).toBe(409);
  });

  it('rechecks the current approver role and the current operator membership', async () => {
    const person = await enroll();
    await addMember(person, 'member');
    const head = await create(revision({ responsibleUserId: person.id }));
    expect((await approve(head)).statusCode).toBe(201);
    const ownerMembership = and(
      eq(authSchema.member.organizationId, organizationId),
      eq(authSchema.member.userId, owner.id),
    );
    await admin.db.update(authSchema.member).set({ role: 'admin' }).where(ownerMembership);
    try {
      expect((await preview(head.id, 1, person)).json()).toMatchObject({
        allowed: false,
        reason: 'approver_not_authorized',
      });
    } finally {
      await admin.db.update(authSchema.member).set({ role: 'owner' }).where(ownerMembership);
    }
    const [membership] = await admin.db
      .select()
      .from(authSchema.member)
      .where(
        and(
          eq(authSchema.member.organizationId, organizationId),
          eq(authSchema.member.userId, person.id),
        ),
      );
    expect(
      (await request('DELETE', `/organizations/${organizationId}/members/${membership?.id}`, owner))
        .statusCode,
    ).toBe(200);
    expect((await preview(head.id, 1, person)).statusCode).toBe(403);
    await expect(
      authorizeEngagement(database, {
        organizationId,
        userId: person.id,
        engagementId: head.id,
        expectedRevision: 1,
        target,
        action,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects competing amendments and duplicate approvals without losing a revision', async () => {
    const head = await create();
    const changes = await Promise.all(
      [1, 2].map((n) =>
        request('POST', `${base()}/${head.id}/versions`, manager, {
          expectedRevision: 1,
          revision: revision({ objective: `Concurrent amendment ${n}` }),
        }),
      ),
    );
    expect(changes.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    const updated = changes.find((result) => result.statusCode === 201)?.json();
    const approvals = await Promise.all([approve(updated), approve(updated)]);
    expect(approvals.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    expect((await preview(head.id, 2)).json().allowed).toBe(true);
  });

  it('serializes approval against amendment and never authorizes an unapproved newer revision', async () => {
    const head = await create();
    const [approval, amendment] = await Promise.all([
      approve(head),
      request('POST', `${base()}/${head.id}/versions`, manager, {
        expectedRevision: 1,
        revision: revision({ objective: 'Concurrent new revision' }),
      }),
    ]);
    expect([201, 409]).toContain(approval.statusCode);
    expect(amendment.statusCode, amendment.body).toBe(201);
    expect((await preview(head.id, 2)).json()).toMatchObject({
      allowed: false,
      reason: 'not_approved',
      revision: 2,
    });
  });

  it('revokes irreversibly and idempotently with one atomic audit entry', async () => {
    const head = await create();
    expect((await approve(head)).statusCode).toBe(201);
    const path = `${base()}/${head.id}/revoke`;
    expect(
      (await request('POST', path, operator, { expectedRevision: 1, reason: 'Unauthorized' }))
        .statusCode,
    ).toBe(403);
    const first = await request('POST', path, manager, {
      expectedRevision: 1,
      reason: 'Authorization withdrawn',
    });
    const second = await request('POST', path, manager, {
      expectedRevision: 1,
      reason: 'Different reason',
    });
    expect(first.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect((await preview(head.id)).json()).toMatchObject({ allowed: false, reason: 'revoked' });
    expect((await approve(head)).statusCode).toBe(409);
    expect(
      (
        await request('POST', `${base()}/${head.id}/versions`, manager, {
          expectedRevision: 1,
          revision: revision(),
        })
      ).statusCode,
    ).toBe(409);
    const audits = await admin.pool.query(
      'SELECT action FROM organization_audit WHERE target_id = $1 AND action = $2',
      [head.id, 'engagement.revoked'],
    );
    expect(audits.rows).toHaveLength(1);
  });

  it('rolls back the immutable version and head when the audit append fails', async () => {
    const head = await create();
    await admin.pool.query(
      "ALTER TABLE organization_audit ADD CONSTRAINT engagement_test_audit_failure CHECK (action <> 'engagement.amended') NOT VALID",
    );
    try {
      const result = await request('POST', `${base()}/${head.id}/versions`, manager, {
        expectedRevision: 1,
        revision: revision({ objective: 'Must roll back' }),
      });
      expect(result.statusCode).toBe(500);
      const stored = (await request('GET', `${base()}/${head.id}`, owner)).json();
      expect(stored.currentRevision).toBe(1);
      expect(stored.versions).toHaveLength(1);
    } finally {
      await admin.pool.query(
        'ALTER TABLE organization_audit DROP CONSTRAINT engagement_test_audit_failure',
      );
    }
  });

  it('denies expired and excluded requests even after owner approval', async () => {
    const expired = await create(
      revision({
        validFrom: new Date(Date.now() - 120_000).toISOString(),
        validUntil: new Date(Date.now() - 60_000).toISOString(),
      }),
    );
    expect((await approve(expired)).statusCode).toBe(201);
    expect((await preview(expired.id)).json()).toMatchObject({ allowed: false, reason: 'expired' });
    const excluded = await create(
      revision({ scope: { assets: [target], actions: [action], exclusions: [target] } }),
    );
    expect((await approve(excluded)).statusCode).toBe(201);
    expect((await preview(excluded.id)).json()).toMatchObject({
      allowed: false,
      reason: 'excluded',
    });
  });

  it('refuses a document whose stored contents no longer match the approved digest', async () => {
    const head = await create();
    expect((await approve(head)).statusCode).toBe(201);
    // Simulate privileged storage corruption; the runtime role cannot update versions.
    await admin.pool.query(
      'UPDATE engagement_version SET authorization_text = $1 WHERE engagement_id = $2',
      ['Tampered authorization text after approval.', head.id],
    );
    expect((await preview(head.id)).json()).toMatchObject({
      allowed: false,
      reason: 'document_integrity',
    });
  });
});
