import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import {
  type AuditImportInput,
  apiEnvSchema,
  type CanonicalObservation,
  INGESTION_MAX_SOURCE_BYTES,
  parseAuditSource,
  parseEnv,
} from '@bump/contracts';
import { claimExecution, finishAuditImport, readAuditImportForExecution } from '@bump/core';
import { assertRuntimeRole, createDatabase, migrateDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import { type ArtifactStore, createArtifactStore, type MailMessage } from '@bump/integrations';
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
    'Ingestion API tests require isolated matching runtime and migration _test databases',
  );
}
const database = createDatabase(env.DATABASE_URL);
const admin = createDatabase(migrationUrl);
const temporaryParent = resolve('.artifacts/tmp');
const privateRoot = join(temporaryParent, `ingestion-api-${randomUUID()}`);
const localStore = createArtifactStore({
  NODE_ENV: 'test',
  ARTIFACT_BACKEND: 'local',
  ARTIFACT_LOCAL_ROOT: privateRoot,
});
const privateMarker = `SYNTHETIC_PRIVATE_SOURCE_${randomUUID()}`;
let failNextPut = false;
let putCalls = 0;
const store: ArtifactStore = {
  backend: localStore.backend,
  async put(key, bytes, digest) {
    putCalls++;
    if (failNextPut) {
      failNextPut = false;
      throw new Error(privateMarker);
    }
    await localStore.put(key, bytes, digest);
  },
  get: (key, limit) => localStore.get(key, limit),
  close: () => localStore.close(),
};
const messages: MailMessage[] = [];
const sendMail = async (message: MailMessage) => {
  messages.push(message);
};
const auth = createAuth(database.db, env, sendMail);
const app = buildServer(env, {
  identity: { database, env, auth, sendMail, artifactStore: store },
  start: () => assertRuntimeRole(database.pool),
  database: () => database.pool.query('SELECT 1'),
  redis: async () => 'PONG',
  close: () => database.pool.end(),
});
type Person = { id: string; email: string; cookie: string; ip: string };
type Receipt = {
  id: string;
  actorUserId: string;
  status: 'staging' | 'ready';
  executionJobId: string;
  executionStatus: string;
  observationCount: number | null;
  completedAt: string | null;
};
const userIds: string[] = [];
const organizationIds: string[] = [];
let owner: Person;
let operator: Person;
let outsider: Person;
let organizationId: string;
let foreignOrganizationId: string;
let address = 0;
const target = { kind: 'hostname' as const, value: 'import.example.test' };
const base = () => `/organizations/${organizationId}/audit-imports`;
const observation: CanonicalObservation = {
  kind: 'issue',
  title: 'Synthetic reported configuration',
  reportedSeverity: 'low',
  description: privateMarker,
  location: { uriText: 'https://127.0.0.1:1/never-fetch-this-reference', startLine: 7 },
  ruleId: 'synthetic-rule',
  sourcePointer: '/observations/0',
};

function request(
  method: 'GET' | 'POST' | 'DELETE',
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

function expectPublicReceipt(value: unknown) {
  expect(value).toBeTypeOf('object');
  for (const key of [
    'storageKey',
    'storageBackend',
    'fingerprint',
    'sourceText',
    'requestHash',
    'leaseToken',
    'token',
    'rawSource',
  ]) {
    expect(value).not.toHaveProperty(key);
  }
  expect(JSON.stringify(value)).not.toContain(privateMarker);
}

function expectGenericError(response: Awaited<ReturnType<typeof request>>, status: number) {
  expect(response.statusCode, response.body).toBe(status);
  expect(Object.keys(response.json()).sort()).toEqual(['error', 'requestId']);
  expect(response.json().requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.body).not.toContain(privateMarker);
  expect(response.body).not.toContain(privateRoot);
}

async function enroll(): Promise<Person> {
  const person = {
    id: '',
    email: `${randomUUID()}@example.test`,
    cookie: '',
    ip: `198.51.100.${++address}`,
  };
  const password = 'Test-ingestion-password-9xA!';
  const signup = await request('POST', '/api/auth/sign-up/email', person, {
    name: 'Synthetic ingestion user',
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
    name: 'Synthetic ingestion organization',
    slug: `ingestion-${randomUUID()}`,
  });
  const id = response.json<{ id?: string }>().id;
  if (id) organizationIds.push(id);
  expect(response.statusCode, response.body).toBe(201);
  return response.json().id as string;
}

async function input(observations = [observation]): Promise<AuditImportInput> {
  const response = await request('POST', `/organizations/${organizationId}/engagements`, owner, {
    objective: 'Passively import the exact synthetic audit source',
    responsibleUserId: operator.id,
    scope: { assets: [target], actions: ['audit.import'], exclusions: [] },
    authorizationText:
      'The synthetic organization owner authorizes the assigned member to import this exact synthetic source during the specified interval.',
    sourceReference: 'https://example.test/synthetic-import-authorization',
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 3_600_000).toISOString(),
  });
  expect(response.statusCode, response.body).toBe(201);
  const head = response.json();
  const approved = await request(
    'POST',
    `/organizations/${organizationId}/engagements/${head.id}/approve`,
    owner,
    {
      expectedRevision: 1,
      authorizationSha256: head.version.authorizationSha256,
    },
  );
  expect(approved.statusCode, approved.body).toBe(201);
  return {
    engagementId: head.id as string,
    expectedRevision: 1,
    target,
    format: 'bump-json-v1',
    sourceName: 'fixture.json',
    sourceText: JSON.stringify({ version: 1, observations }),
    idempotencyKey: randomUUID(),
  };
}

async function submit(data: AuditImportInput): Promise<Receipt> {
  const response = await request('POST', base(), operator, data);
  expect(response.statusCode, response.body).toBe(201);
  expectPublicReceipt(response.json());
  return response.json() as Receipt;
}

async function complete(receipt: Receipt, data: AuditImportInput) {
  const claim = await claimExecution(database, {
    organizationId,
    userId: operator.id,
    jobId: receipt.executionJobId,
  });
  expect(claim).not.toBeNull();
  expect(claim?.kind).toBe('audit.import');
  const active = await request('GET', `${base()}/${receipt.id}`, operator);
  expect(active.json().executionStatus).toBe('running');
  expectPublicReceipt(active.json());
  const execution = await request(
    'GET',
    `/organizations/${organizationId}/executions/${receipt.executionJobId}`,
    operator,
  );
  expect(execution.json()).not.toHaveProperty('leaseToken');
  expect(execution.json()).not.toHaveProperty('requestHash');
  expect(execution.json().attempts[0]).not.toHaveProperty('token');
  const source = await readAuditImportForExecution(database, {
    organizationId,
    userId: operator.id,
    importId: receipt.id,
    jobId: receipt.executionJobId,
    token: claim!.token,
  });
  const bytes = await store.get(source.storageKey, INGESTION_MAX_SOURCE_BYTES);
  expect(bytes.toString('utf8')).toBe(data.sourceText);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(source.sourceSha256);
  await finishAuditImport(database, {
    organizationId,
    userId: operator.id,
    jobId: receipt.executionJobId,
    token: claim!.token,
    observations: parseAuditSource(source.format, bytes.toString('utf8')),
  });
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
      'audit_observation',
      'audit_import_request',
      'audit_import',
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
      store.close();
      const cleanupRoot = resolve(privateRoot);
      if (
        dirname(cleanupRoot) !== temporaryParent ||
        !/^ingestion-api-[0-9a-f-]{36}$/.test(basename(cleanupRoot))
      ) {
        throw new Error('Unsafe ingestion fixture cleanup path');
      }
      await rm(cleanupRoot, { recursive: true, force: true });
    }
  }
});

describe('authenticated passive audit ingestion HTTP interface', () => {
  it('stores exact private source bytes and publishes server provenance and canonical observations', async () => {
    const data = await input([
      observation,
      {
        kind: 'component',
        title: 'Synthetic library',
        reportedSeverity: 'unknown',
        component: {
          name: 'synthetic-library',
          version: '1.0.0',
          purl: 'pkg:npm/synthetic-library@1.0.0',
        },
        sourcePointer: '/observations/1',
      },
    ]);
    const receipt = await submit(data);
    expect(receipt).toMatchObject({
      actorUserId: operator.id,
      status: 'ready',
      executionStatus: 'queued',
      observationCount: null,
      completedAt: null,
    });
    const sourceSha256 = createHash('sha256').update(data.sourceText, 'utf8').digest('hex');
    const detail = await request('GET', `${base()}/${receipt.id}`, operator);
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json()).toMatchObject({
      id: receipt.id,
      engagementId: data.engagementId,
      expectedRevision: 1,
      target,
      format: 'bump-json-v1',
      importerVersion: 'bump-ingestion-v1',
      sourceName: 'fixture.json',
      sourceSha256,
      byteCount: Buffer.byteLength(data.sourceText, 'utf8'),
    });
    expectPublicReceipt(detail.json());
    const stored = await admin.pool.query<{
      storage_key: string;
      source_sha256: string;
      actor_user_id: string;
    }>('SELECT storage_key, source_sha256, actor_user_id FROM audit_import WHERE id = $1', [
      receipt.id,
    ]);
    const provenance = stored.rows[0]!;
    expect(provenance).toEqual({
      storage_key: `${organizationId}/${receipt.id}.json`,
      source_sha256: sourceSha256,
      actor_user_id: operator.id,
    });
    expect(await readFile(join(privateRoot, provenance.storage_key))).toEqual(
      Buffer.from(data.sourceText, 'utf8'),
    );
    expect(await store.get(provenance.storage_key, INGESTION_MAX_SOURCE_BYTES)).toEqual(
      Buffer.from(data.sourceText, 'utf8'),
    );
    const pending = await request('GET', `${base()}/${receipt.id}/observations`, operator);
    expect(pending.json()).toEqual([]);
    await complete(receipt, data);
    const completed = await request('GET', `${base()}/${receipt.id}`, owner);
    expect(completed.json()).toMatchObject({ executionStatus: 'succeeded', observationCount: 2 });
    expect(completed.json().completedAt).toBeTypeOf('string');
    expectPublicReceipt(completed.json());
    const listed = await request('GET', base(), operator);
    expect(listed.statusCode).toBe(200);
    for (const row of listed.json()) expectPublicReceipt(row);
    expect(listed.json().some((row: Receipt) => row.id === receipt.id)).toBe(true);
    const observations = await request('GET', `${base()}/${receipt.id}/observations`, operator);
    expect(observations.statusCode).toBe(200);
    expect(
      observations.json().map((row: { observation: CanonicalObservation }) => row.observation),
    ).toEqual(parseAuditSource(data.format, data.sourceText));
    const execution = await request(
      'GET',
      `/organizations/${organizationId}/executions/${receipt.executionJobId}`,
      operator,
    );
    expect(execution.json()).not.toHaveProperty('leaseToken');
    expect(execution.json()).not.toHaveProperty('requestHash');
    expect(execution.json().attempts[0]).not.toHaveProperty('token');
  });

  it('deduplicates concurrent content and preserves conflicts for every idempotency alias', async () => {
    const data = await input();
    const alias = { ...data, idempotencyKey: randomUUID(), sourceName: 'alias.json' };
    const [first, second] = await Promise.all([submit(data), submit(alias)]);
    expect(second.id).toBe(first.id);
    expect(second.executionJobId).toBe(first.executionJobId);
    expect((await submit(alias)).id).toBe(first.id);
    expectGenericError(
      await request('POST', base(), operator, { ...alias, sourceName: 'changed.json' }),
      409,
    );
    expectGenericError(
      await request('POST', base(), operator, {
        ...alias,
        sourceText: JSON.stringify({ version: 1, observations: [] }),
      }),
      409,
    );
    const counts = await admin.pool.query<{ imports: string; requests: string; jobs: string }>(
      `
      SELECT (SELECT count(*) FROM audit_import WHERE engagement_id = $1) AS imports,
        (SELECT count(*) FROM audit_import_request WHERE import_id = $2) AS requests,
        (SELECT count(*) FROM execution_job WHERE id = $3) AS jobs
    `,
      [data.engagementId, first.id, first.executionJobId],
    );
    expect(counts.rows[0]).toEqual({ imports: '1', requests: '2', jobs: '1' });
  });

  it('resumes one staging reservation after a private storage write failure', async () => {
    const data = await input();
    failNextPut = true;
    const failed = await request('POST', base(), operator, data);
    expectGenericError(failed, 500);
    const staging = await admin.pool.query<{
      id: string;
      status: string;
      execution_job_id: string | null;
    }>('SELECT id, status, execution_job_id FROM audit_import WHERE engagement_id = $1', [
      data.engagementId,
    ]);
    expect(staging.rows).toHaveLength(1);
    expect(staging.rows[0]).toMatchObject({ status: 'staging', execution_job_id: null });
    expect(
      (
        await admin.pool.query('SELECT id FROM execution_job WHERE engagement_id = $1', [
          data.engagementId,
        ])
      ).rows,
    ).toEqual([]);
    const pending = await request('GET', `${base()}/${staging.rows[0]!.id}`, operator);
    expect(pending.json()).toMatchObject({
      status: 'staging',
      executionJobId: null,
      executionStatus: null,
    });
    expectPublicReceipt(pending.json());
    const receipt = await submit(data);
    expect(receipt.id).toBe(staging.rows[0]!.id);
    const writes = putCalls;
    expect((await submit(data)).executionJobId).toBe(receipt.executionJobId);
    expect(putCalls).toBe(writes);
    expect(
      (
        await admin.pool.query('SELECT id FROM audit_import WHERE engagement_id = $1', [
          data.engagementId,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await admin.pool.query('SELECT id FROM execution_job WHERE engagement_id = $1', [
          data.engagementId,
        ])
      ).rows,
    ).toHaveLength(1);
    await complete(receipt, data);
  });

  it('rejects malformed, oversized and excessively nested sources without leaking content or reserving imports', async () => {
    const data = await input();
    let nested: unknown = privateMarker;
    for (let i = 0; i < 40; i++) nested = [nested];
    const invalidSources = [
      `${privateMarker}{`,
      JSON.stringify(nested),
      JSON.stringify({
        version: 1,
        observations: [{ ...observation, reportedSeverity: privateMarker }],
      }),
      JSON.stringify({ version: 1, observations: [{ ...observation, title: '\ud800' }] }),
      'x'.repeat(INGESTION_MAX_SOURCE_BYTES + 1),
    ];
    for (const sourceText of invalidSources)
      expectGenericError(await request('POST', base(), operator, { ...data, sourceText }), 400);
    expectGenericError(
      await request('POST', base(), operator, { ...data, sourceText: 'x'.repeat(1_048_577) }),
      413,
    );
    expect(
      (
        await admin.pool.query('SELECT id FROM audit_import WHERE engagement_id = $1', [
          data.engagementId,
        ])
      ).rows,
    ).toEqual([]);
  });

  it('rejects forged server fields, source paths, unsupported formats and direct internal job submissions', async () => {
    const data = await input();
    for (const changes of [
      { actorUserId: owner.id },
      { userId: owner.id },
      { organizationId: foreignOrganizationId },
      { storageBackend: 's3' },
      { storageKey: '../../private.json' },
      { sourceSha256: '0'.repeat(64) },
      { format: 'shell' },
      { sourceName: '../fixture.json' },
      { sourceName: 'folder\\fixture.json' },
      { expectedRevision: 0 },
      { idempotencyKey: '' },
    ])
      expectGenericError(await request('POST', base(), operator, { ...data, ...changes }), 400);
    expectGenericError(
      await request('POST', `/organizations/${organizationId}/executions`, operator, {
        engagementId: data.engagementId,
        expectedRevision: 1,
        target,
        action: 'audit.import',
        kind: 'audit.import',
        payload: { importId: randomUUID() },
        idempotencyKey: randomUUID(),
      }),
      400,
    );
  });

  it('requires sessions, same-origin mutations, tenant membership and the currently assigned operator', async () => {
    const data = await input();
    const receipt = await submit(data);
    expectGenericError(await app.inject({ method: 'GET', url: base() }), 401);
    for (const origin of [undefined, 'https://foreign.example.test']) {
      const response = await app.inject({
        method: 'POST',
        url: base(),
        remoteAddress: operator.ip,
        headers: {
          cookie: operator.cookie,
          'content-type': 'application/json',
          ...(origin ? { origin } : {}),
        },
        payload: JSON.stringify({ ...data, idempotencyKey: randomUUID() }),
      });
      expectGenericError(response, 403);
    }
    expectGenericError(
      await request('POST', base(), owner, { ...data, idempotencyKey: randomUUID() }),
      403,
    );
    expectGenericError(await request('POST', base(), outsider, data), 403);
    expectGenericError(await request('GET', base(), outsider), 403);
    expectGenericError(await request('GET', `${base()}/${receipt.id}`, outsider), 403);
    expectGenericError(await request('GET', `${base()}/${receipt.id}/observations`, outsider), 403);
    expectGenericError(
      await request(
        'GET',
        `/organizations/${foreignOrganizationId}/audit-imports/${receipt.id}`,
        outsider,
      ),
      404,
    );
    expectGenericError(
      await request(
        'GET',
        `/organizations/${foreignOrganizationId}/audit-imports/${receipt.id}/observations`,
        outsider,
      ),
      404,
    );
    const revoked = await request(
      'POST',
      `/organizations/${organizationId}/engagements/${data.engagementId}/revoke`,
      owner,
      { expectedRevision: 1, reason: 'Synthetic import authorization withdrawn' },
    );
    expect(revoked.statusCode).toBe(200);
    expectGenericError(await request('POST', base(), operator, data), 403);
    expectGenericError(
      await request('POST', base(), operator, { ...data, idempotencyKey: randomUUID() }),
      403,
    );
  });

  it('paginates immutable observations with strict bounds and records zero observations explicitly', async () => {
    const data = await input([
      observation,
      { ...observation, title: 'Second synthetic observation', sourcePointer: '/observations/1' },
    ]);
    const receipt = await submit(data);
    await complete(receipt, data);
    const page = await request(
      'GET',
      `${base()}/${receipt.id}/observations?offset=1&limit=1`,
      operator,
    );
    expect(page.statusCode).toBe(200);
    expect(page.json()).toHaveLength(1);
    expect(page.json()[0]).toMatchObject({
      ordinal: 1,
      observation: { title: 'Second synthetic observation' },
    });
    expect(
      (
        await request('GET', `${base()}/${receipt.id}/observations?offset=2&limit=100`, operator)
      ).json(),
    ).toEqual([]);
    for (const query of [
      'offset=-1',
      'offset=1.5',
      'offset=1001',
      'limit=0',
      'limit=101',
      'offset=0&offset=1',
      'extra=1',
    ]) {
      expectGenericError(
        await request('GET', `${base()}/${receipt.id}/observations?${query}`, operator),
        400,
      );
    }
    expectGenericError(await request('GET', `${base()}/not-a-uuid`, operator), 400);
    const emptyInput = await input([]);
    const empty = await submit(emptyInput);
    expect(empty.observationCount).toBeNull();
    await complete(empty, emptyInput);
    const emptyReceipt = await request('GET', `${base()}/${empty.id}`, operator);
    expect(emptyReceipt.json()).toMatchObject({
      executionStatus: 'succeeded',
      observationCount: 0,
    });
    expect(emptyReceipt.json().completedAt).toBeTypeOf('string');
    expect((await request('GET', `${base()}/${empty.id}/observations`, operator)).json()).toEqual(
      [],
    );
  });

  it('checks current membership even when the actor retains a valid authenticated session', async () => {
    const data = await input();
    const receipt = await submit(data);
    const member = await admin.pool.query<{ id: string }>(
      'SELECT id FROM member WHERE organization_id = $1 AND user_id = $2',
      [organizationId, operator.id],
    );
    const memberId = member.rows[0]!.id;
    const removed = await request(
      'DELETE',
      `/organizations/${organizationId}/members/${memberId}`,
      owner,
    );
    expect(removed.statusCode, removed.body).toBe(200);
    try {
      expectGenericError(await request('GET', base(), operator), 403);
      expectGenericError(await request('GET', `${base()}/${receipt.id}`, operator), 403);
      expectGenericError(
        await request('GET', `${base()}/${receipt.id}/observations`, operator),
        403,
      );
      expectGenericError(await request('POST', base(), operator, data), 403);
    } finally {
      await admin.pool.query(
        'INSERT INTO member(id, organization_id, user_id, role, created_at) VALUES ($1,$2,$3,$4,now())',
        [memberId, organizationId, operator.id, 'member'],
      );
    }
  });
});
