import { randomUUID } from 'node:crypto';
import { apiEnvSchema, type ExecutionJobInput, parseEnv } from '@bump/contracts';
import { claimExecution, finishExecution } from '@bump/core';
import { assertRuntimeRole, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import type { MailMessage } from '@bump/integrations';
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
  !migrationUrl ||
  !new URL(env.DATABASE_URL).pathname.endsWith('_test') ||
  !new URL(migrationUrl).pathname.endsWith('_test') ||
  new URL(env.DATABASE_URL).host !== new URL(migrationUrl).host ||
  new URL(env.DATABASE_URL).pathname !== new URL(migrationUrl).pathname
) {
  throw new Error(
    'Execution API tests require isolated matching runtime and migration _test databases',
  );
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
const userIds: string[] = [];
const organizationIds: string[] = [];
let owner: Person;
let operator: Person;
let outsider: Person;
let organizationId: string;
let foreignOrganizationId: string;
let address = 0;
const target = { kind: 'hostname' as const, value: 'api-execution.example.test' };
const action = 'configuration.read' as const;
const base = () => `/organizations/${organizationId}/executions`;
const controlPath = () => `/organizations/${organizationId}/execution-control`;

function request(method: 'GET' | 'POST' | 'PUT', url: string, person: Person, payload?: unknown) {
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
  const password = 'Test-execution-password-9xA!';
  const signup = await request('POST', '/api/auth/sign-up/email', person, {
    name: 'Synthetic execution user',
    email: person.email,
    password,
  });
  const id = signup.json<{ user?: { id?: string } }>().user?.id;
  if (id) {
    person.id = id;
    userIds.push(id);
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
  const response = await request('POST', '/organizations', person, {
    name: 'Synthetic execution organization',
    slug: `execution-${randomUUID()}`,
  });
  const id = response.json<{ id?: string }>().id;
  if (id) organizationIds.push(id);
  expect(response.statusCode, response.body).toBe(201);
  return response.json().id as string;
}

async function authorizedJob(
  overrides: Partial<ExecutionJobInput> = {},
): Promise<ExecutionJobInput> {
  const response = await request('POST', `/organizations/${organizationId}/engagements`, owner, {
    objective: 'Execute the local synthetic API acceptance fixture',
    responsibleUserId: operator.id,
    scope: { assets: [target], actions: [action], exclusions: [] },
    authorizationText:
      'The synthetic organization owner authorizes this exact local fixture for the assigned member during the specified interval.',
    sourceReference: 'https://example.test/synthetic-authorization',
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 3_600_000).toISOString(),
  });
  expect(response.statusCode, response.body).toBe(201);
  const head = response.json();
  const approval = await request(
    'POST',
    `/organizations/${organizationId}/engagements/${head.id}/approve`,
    owner,
    {
      expectedRevision: 1,
      authorizationSha256: head.version.authorizationSha256,
    },
  );
  expect(approval.statusCode, approval.body).toBe(201);
  return {
    engagementId: head.id as string,
    expectedRevision: 1,
    target,
    action,
    kind: 'synthetic',
    payload: { durationMs: 0, failUntilAttempt: 0 },
    idempotencyKey: randomUUID(),
    maxAttempts: 3,
    timeoutMs: 5_000,
    backoffMs: 100,
    ...overrides,
  };
}

async function submit(job: ExecutionJobInput) {
  const response = await request('POST', base(), operator, job);
  expect(response.statusCode, response.body).toBe(201);
  expect(response.json()).not.toHaveProperty('leaseToken');
  expect(response.json()).not.toHaveProperty('requestHash');
  return response.json() as { id: string; status: string };
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  owner = await enroll();
  operator = await enroll();
  outsider = await enroll();
  organizationId = await makeOrganization(owner);
  foreignOrganizationId = await makeOrganization(outsider);
  const invitation = await request('POST', `/organizations/${organizationId}/invitations`, owner, {
    email: operator.email,
    role: 'member',
  });
  expect(invitation.statusCode, invitation.body).toBe(201);
  const accepted = await request(
    'POST',
    `/invitations/${invitation.json().invitationId}/accept`,
    operator,
  );
  expect(accepted.statusCode, accepted.body).toBe(200);
});

afterAll(async () => {
  try {
    for (const table of [
      'execution_event',
      'execution_attempt',
      'execution_outbox',
      'execution_job',
      'execution_control',
      'engagement_approval',
      'engagement_version',
      'engagement',
      'organization_audit',
      'organization_settings',
    ]) {
      await admin.pool.query(`DELETE FROM ${table} WHERE organization_id = ANY($1::text[])`, [
        organizationIds,
      ]);
    }
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

describe('authenticated execution HTTP interface', () => {
  it('normalizes idempotent submissions, rejects changed input and exposes durable history', async () => {
    const job = await authorizedJob();
    const first = await submit(job);
    const duplicate = await request('POST', base(), operator, {
      ...job,
      engagementId: job.engagementId.toUpperCase(),
    });
    expect(duplicate.statusCode, duplicate.body).toBe(201);
    expect(duplicate.json().id).toBe(first.id);
    const conflict = await request('POST', base(), operator, { ...job, timeoutMs: 100 });
    expect(conflict.statusCode).toBe(409);
    const running = await claimExecution(database, {
      organizationId,
      userId: operator.id,
      jobId: first.id,
    });
    expect(running).not.toBeNull();
    const active = await request('GET', `${base()}/${first.id}`, operator);
    expect(active.json().status).toBe('running');
    expect(active.json()).not.toHaveProperty('leaseToken');
    expect(active.json()).not.toHaveProperty('requestHash');
    expect(active.json().attempts[0]).not.toHaveProperty('token');
    const activeList = await request('GET', base(), operator);
    for (const row of activeList.json()) {
      expect(row).not.toHaveProperty('leaseToken');
      expect(row).not.toHaveProperty('requestHash');
    }
    await finishExecution(database, {
      organizationId,
      userId: operator.id,
      jobId: first.id,
      token: running!.token,
      outcome: 'succeeded',
      result: { completed: true },
    });
    const detail = await request('GET', `${base()}/${first.id}`, operator);
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json()).toMatchObject({
      id: first.id,
      status: 'succeeded',
      result: { completed: true },
    });
    expect(detail.json().attempts).toHaveLength(1);
    expect(detail.json()).not.toHaveProperty('leaseToken');
    expect(detail.json()).not.toHaveProperty('requestHash');
    expect(detail.json().attempts[0]).not.toHaveProperty('token');
    expect(detail.json().events.map((event: { status: string }) => event.status)).toEqual([
      'queued',
      'running',
      'succeeded',
    ]);
    const listed = await request('GET', base(), operator);
    expect(listed.statusCode).toBe(200);
    expect(listed.json().some((row: { id: string }) => row.id === first.id)).toBe(true);
  });

  it('enforces membership, tenant isolation and current assigned-operator authorization', async () => {
    const job = await authorizedJob();
    const stored = await submit(job);
    expect((await request('POST', base(), outsider, job)).statusCode).toBe(403);
    expect((await request('GET', base(), outsider)).statusCode).toBe(403);
    expect((await request('GET', `${base()}/${stored.id}`, outsider)).statusCode).toBe(403);
    expect((await request('POST', `${base()}/${stored.id}/cancel`, outsider)).statusCode).toBe(403);
    expect(
      (
        await request(
          'GET',
          `/organizations/${foreignOrganizationId}/executions/${stored.id}`,
          outsider,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (await request('POST', base(), owner, { ...job, idempotencyKey: randomUUID() })).statusCode,
    ).toBe(403);
    expect((await app.inject({ method: 'GET', url: base() })).statusCode).toBe(401);
    const revoked = await request(
      'POST',
      `/organizations/${organizationId}/engagements/${job.engagementId}/revoke`,
      owner,
      {
        expectedRevision: 1,
        reason: 'Synthetic authorization withdrawn',
      },
    );
    expect(revoked.statusCode).toBe(200);
    expect(
      (await request('POST', base(), operator, { ...job, idempotencyKey: randomUUID() }))
        .statusCode,
    ).toBe(403);
  });

  it('rejects identity injection, shell handlers and out-of-bounds scheduling inputs', async () => {
    const job = await authorizedJob();
    for (const changes of [
      { userId: owner.id },
      { organizationId: foreignOrganizationId },
      { kind: 'shell' },
      { payload: { durationMs: 0, failUntilAttempt: 0, command: 'echo forbidden' } },
      { maxAttempts: 6 },
      { timeoutMs: 99 },
      { backoffMs: 99 },
      { idempotencyKey: '' },
    ]) {
      expect((await request('POST', base(), operator, { ...job, ...changes })).statusCode).toBe(
        400,
      );
    }
    expect((await request('GET', `${base()}/not-a-uuid`, operator)).statusCode).toBe(400);
    expect(
      (await request('POST', `${base()}/${randomUUID()}/cancel`, operator, { userId: owner.id }))
        .statusCode,
    ).toBe(400);
  });

  it('makes cancellation idempotent and reserves execution controls for administrators', async () => {
    const stored = await submit(await authorizedJob());
    const cancelled = await request('POST', `${base()}/${stored.id}/cancel`, operator);
    const repeated = await request('POST', `${base()}/${stored.id}/cancel`, operator);
    expect(cancelled.statusCode, cancelled.body).toBe(200);
    expect(repeated.statusCode).toBe(200);
    expect(repeated.json().status).toBe('cancelled');
    expect(cancelled.json()).not.toHaveProperty('leaseToken');
    expect(cancelled.json()).not.toHaveProperty('requestHash');
    const detail = await request('GET', `${base()}/${stored.id}`, owner);
    expect(detail.json().attempts).toHaveLength(0);
    expect(
      detail.json().events.filter((event: { status: string }) => event.status === 'cancelled'),
    ).toHaveLength(1);
    const controls = { emergencyStop: true, concurrencyLimit: 1, rateLimit: 1 };
    expect((await request('PUT', controlPath(), operator, controls)).statusCode).toBe(403);
    expect((await request('GET', controlPath(), outsider)).statusCode).toBe(403);
    const updated = await request('PUT', controlPath(), owner, controls);
    expect(updated.statusCode, updated.body).toBe(200);
    expect((await request('GET', controlPath(), owner)).json()).toMatchObject(controls);
    for (const changes of [
      { concurrencyLimit: 0 },
      { concurrencyLimit: 33 },
      { rateLimit: 1001 },
      { emergencyStop: 'yes' },
    ]) {
      expect(
        (await request('PUT', controlPath(), owner, { ...controls, ...changes })).statusCode,
      ).toBe(400);
    }
    expect(
      (
        await request('PUT', controlPath(), owner, {
          emergencyStop: false,
          concurrencyLimit: 32,
          rateLimit: 1000,
        })
      ).statusCode,
    ).toBe(200);
  });
});
