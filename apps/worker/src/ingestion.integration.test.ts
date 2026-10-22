import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  type AuditFormat,
  type AuditImportInput,
  type CanonicalObservation,
  EXECUTION_QUEUE_NAME,
  INGESTION_IMPORTER_VERSION,
  parseAuditSource,
} from '@bump/contracts';
import {
  approveEngagement,
  cancelExecution,
  createEngagement,
  queueAuditImport,
  readAuditImport,
  readAuditObservations,
  readExecution,
  reserveAuditImport,
  revokeEngagement,
} from '@bump/core';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
import { type ArtifactStore, createArtifactStore } from '@bump/integrations';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createExecutionProcessor,
  createExecutionWorker,
  dispatchExecutions,
} from './execution.js';

const databaseUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const loopback = ['127.0.0.1', '[::1]', 'localhost'];
if (
  process.env.NODE_ENV !== 'test' ||
  !databaseUrl ||
  !migrationUrl ||
  !redisUrl ||
  !loopback.includes(new URL(databaseUrl).hostname) ||
  !loopback.includes(new URL(migrationUrl).hostname) ||
  !loopback.includes(new URL(redisUrl).hostname) ||
  !new URL(databaseUrl).pathname.endsWith('_test') ||
  !new URL(migrationUrl).pathname.endsWith('_test') ||
  new URL(databaseUrl).host !== new URL(migrationUrl).host ||
  new URL(databaseUrl).pathname !== new URL(migrationUrl).pathname ||
  new URL(redisUrl).pathname !== '/1'
) {
  throw new Error('Ingestion integration requires isolated matching _test databases and Redis /1');
}

const database = createDatabase(databaseUrl);
const admin = createDatabase(migrationUrl);
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
const producer = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
connection.on('error', () => {});
producer.on('error', () => {});
const queue = new Queue(EXECUTION_QUEUE_NAME, { connection: producer });
const organizations: string[] = [];
const users: string[] = [];
const target = { kind: 'hostname' as const, value: 'ingestion-worker.example.test' };
const temporaryParent = resolve('.artifacts/tmp');
let temporary: string | undefined;
let local: ArtifactStore;
type Fixture = Awaited<ReturnType<typeof fixture>>;
type Receipt = Awaited<ReturnType<typeof readAuditImport>>;

const issue: CanonicalObservation = {
  kind: 'issue',
  title: 'Synthetic passive observation',
  description: 'Synthetic UTF-8 source: é',
  reportedSeverity: 'low',
  sourcePointer: '/observations/0',
};
const formats: { format: AuditFormat; sourceText: string; expected: CanonicalObservation[] }[] = [
  {
    format: 'bump-json-v1',
    sourceText: JSON.stringify({ version: 1, observations: [issue] }),
    expected: [issue],
  },
  {
    format: 'sarif-2.1.0',
    sourceText: JSON.stringify({
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'Synthetic analyzer', rules: [{ id: 'SYN001' }] } },
          results: [
            {
              ruleId: 'SYN001',
              level: 'error',
              message: { text: 'Synthetic analyzer detail' },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: 'https://example.test/not-fetched.ts' },
                    region: { startLine: 3 },
                  },
                },
              ],
            },
          ],
        },
      ],
    }),
    expected: [
      {
        kind: 'issue',
        title: 'SYN001',
        description: 'Synthetic analyzer detail',
        reportedSeverity: 'unknown',
        sourceLevel: 'error',
        ruleId: 'SYN001',
        location: { uriText: 'https://example.test/not-fetched.ts', startLine: 3 },
        sourcePointer: '/runs/0/results/0',
      },
    ],
  },
  {
    format: 'cyclonedx-1.6-json',
    sourceText: JSON.stringify({
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      components: [
        {
          type: 'library',
          name: 'synthetic-library',
          version: '1.0.0',
          components: [{ type: 'library', name: 'synthetic-child' }],
        },
      ],
    }),
    expected: [
      {
        kind: 'component',
        title: 'synthetic-library',
        reportedSeverity: 'unknown',
        component: { name: 'synthetic-library', version: '1.0.0' },
        sourcePointer: '/components/0',
      },
      {
        kind: 'component',
        title: 'synthetic-child',
        reportedSeverity: 'unknown',
        component: { name: 'synthetic-child' },
        sourcePointer: '/components/0/components/0',
      },
    ],
  },
];
const bump = formats[0]!;

async function fixture() {
  const organizationId = randomUUID();
  const ownerId = randomUUID();
  const userId = randomUUID();
  organizations.push(organizationId);
  users.push(ownerId, userId);
  await admin.db.insert(authSchema.user).values(
    [ownerId, userId].map((id) => ({
      id,
      name: 'Synthetic ingestion worker user',
      email: `${id}@example.test`,
    })),
  );
  await admin.db.insert(authSchema.organization).values({
    id: organizationId,
    name: 'Synthetic ingestion worker organization',
    slug: organizationId,
  });
  await admin.db.insert(authSchema.member).values([
    { id: randomUUID(), organizationId, userId: ownerId, role: 'owner' },
    { id: randomUUID(), organizationId, userId, role: 'member' },
  ]);
  const owner = { organizationId, userId: ownerId };
  const actor = { organizationId, userId };
  const engagement = await createEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    revision: {
      objective: 'Import a synthetic passive audit fixture',
      responsibleUserId: userId,
      scope: { assets: [target], actions: ['audit.import'], exclusions: [] },
      authorizationText:
        'The synthetic owner authorizes passive import of this exact synthetic target for this member during the documented interval.',
      sourceReference: 'https://example.test/synthetic-authorization',
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  await approveEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    engagementId: engagement.id,
    expectedRevision: 1,
    authorizationSha256: engagement.version.authorizationSha256,
  });
  return { owner, actor, engagementId: engagement.id };
}

function input(f: Fixture, source = bump): AuditImportInput {
  return {
    engagementId: f.engagementId,
    expectedRevision: 1,
    target,
    format: source.format,
    sourceName: 'synthetic.json',
    sourceText: source.sourceText,
    idempotencyKey: randomUUID(),
  };
}

async function submit(f: Fixture, source = bump, store = local, request = input(f, source)) {
  const receipt = await reserveAuditImport(database, {
    ...f.actor,
    requestId: randomUUID(),
    input: request,
    storageBackend: store.backend,
  });
  await store.put(receipt.storageKey, Buffer.from(request.sourceText), receipt.sourceSha256);
  return queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: receipt.id });
}

function observations(f: Fixture, importId: string) {
  return readAuditObservations(database, { ...f.owner, importId, offset: 0, limit: 100 });
}

async function until(f: Fixture, importId: string, predicate: (row: Receipt) => boolean) {
  const deadline = performance.now() + 10_000;
  let receipt = await readAuditImport(database, { ...f.owner, importId });
  while (!predicate(receipt) && performance.now() < deadline) {
    await dispatchExecutions(database, queue);
    await delay(25);
    receipt = await readAuditImport(database, { ...f.owner, importId });
  }
  expect(predicate(receipt), `Import stopped at ${receipt.executionStatus}`).toBe(true);
  return receipt;
}

async function withWorkers(store: ArtifactStore, run: () => Promise<void>) {
  const workers = [1, 2].map(() =>
    createExecutionWorker({
      connection,
      database,
      concurrency: 2,
      artifactStore: store,
    }),
  );
  for (const worker of workers) worker.on('error', () => {});
  try {
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));
    await run();
  } finally {
    await Promise.all(workers.map((worker) => worker.close()));
  }
}

function gatedStore() {
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const reading = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const store: ArtifactStore = {
    ...local,
    async get(key, maxBytes) {
      entered();
      await gate;
      return local.get(key, maxBytes);
    },
  };
  return {
    store,
    release,
    async wait() {
      await Promise.race([
        reading,
        delay(5_000).then(() => {
          throw new Error('Worker did not reach artifact read');
        }),
      ]);
    },
  };
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  await assertRuntimeRole(database.pool);
  await Promise.all([connection.ping(), queue.waitUntilReady()]);
  await mkdir(temporaryParent, { recursive: true });
  temporary = await mkdtemp(join(temporaryParent, 'worker-ingestion-'));
  local = createArtifactStore({
    NODE_ENV: 'test',
    ARTIFACT_LOCAL_ROOT: join(temporary, 'private'),
  });
});

afterAll(async () => {
  try {
    await queue.obliterate({ force: true });
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
    ])
      await admin.pool.query(`DELETE FROM ${table} WHERE organization_id = ANY($1::text[])`, [
        organizations,
      ]);
    await admin.pool.query('DELETE FROM organization WHERE id = ANY($1::text[])', [organizations]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [users]);
  } finally {
    local?.close();
    if (temporary) {
      if (
        dirname(temporary) !== temporaryParent ||
        !basename(temporary).startsWith('worker-ingestion-')
      )
        throw new Error('Unsafe test cleanup');
      await rm(temporary, { recursive: true, force: true });
    }
    await queue.close();
    await Promise.all([connection.quit(), producer.quit(), database.pool.end(), admin.pool.end()]);
  }
});

describe('passive import worker with real PostgreSQL, Redis and private storage', () => {
  it.each(formats)(
    'imports $format across two workers with exact provenance and ordered observations',
    async (source) => {
      const f = await fixture();
      const requestId = randomUUID();
      const request = input(f, source);
      const reserved = await reserveAuditImport(database, {
        ...f.actor,
        requestId,
        input: request,
        storageBackend: 'local',
      });
      const bytes = Buffer.from(source.sourceText);
      await local.put(reserved.storageKey, bytes, reserved.sourceSha256);
      const queued = await queueAuditImport(database, {
        ...f.actor,
        requestId: randomUUID(),
        importId: reserved.id,
      });
      await dispatchExecutions(database, queue);
      const notifications = await queue.getJobs(['wait', 'delayed']);
      expect(notifications.some((job) => job.data.jobId === queued.executionJobId)).toBe(true);
      for (const notification of notifications)
        expect(Object.keys(notification.data)).toEqual(['jobId']);
      await withWorkers(local, async () => {
        const done = await until(f, queued.id, (row) => row.executionStatus === 'succeeded');
        expect(done).toMatchObject({
          organizationId: f.actor.organizationId,
          actorUserId: f.actor.userId,
          engagementId: f.engagementId,
          expectedRevision: 1,
          target,
          format: source.format,
          importerVersion: INGESTION_IMPORTER_VERSION,
          sourceName: request.sourceName,
          requestId,
          sourceSha256: createHash('sha256').update(bytes).digest('hex'),
          byteCount: bytes.length,
          storageBackend: 'local',
          storageKey: `${f.actor.organizationId}/${queued.id}.json`,
          observationCount: source.expected.length,
        });
        expect(done.completedAt).toBeInstanceOf(Date);
        expect(await local.get(done.storageKey, done.byteCount)).toEqual(bytes);
        expect(parseAuditSource(source.format, source.sourceText)).toEqual(source.expected);
        const rows = await observations(f, queued.id);
        expect(rows.map((row) => row.ordinal)).toEqual(
          source.expected.map((_, ordinal) => ordinal),
        );
        expect(rows.map((row) => row.observation)).toEqual(source.expected);
        if (process.platform !== 'win32') {
          expect((await lstat(join(temporary!, 'private', done.storageKey))).mode & 0o777).toBe(
            0o600,
          );
          expect((await lstat(join(temporary!, 'private'))).mode & 0o777).toBe(0o700);
        }
      });
    },
  );

  it('deduplicates content, concurrent submissions and repeated opaque notifications', async () => {
    const f = await fixture();
    const request = input(f);
    const receipts = await Promise.all([
      submit(f, bump, local, request),
      submit(f, bump, local, request),
    ]);
    const repeated = await submit(f, bump, local, { ...request, idempotencyKey: randomUUID() });
    expect(receipts.map((row) => row.id)).toEqual([repeated.id, repeated.id]);
    expect(receipts.map((row) => row.executionJobId)).toEqual([
      repeated.executionJobId,
      repeated.executionJobId,
    ]);
    await Promise.all(
      Array.from({ length: 6 }, () => queue.add('execute', { jobId: repeated.executionJobId })),
    );
    await withWorkers(local, async () => {
      await until(f, repeated.id, (row) => row.executionStatus === 'succeeded');
      await queue.add('execute', { jobId: repeated.executionJobId });
      await delay(100);
    });
    expect((await observations(f, repeated.id)).map((row) => row.observation)).toEqual([issue]);
    const job = await readExecution(database, { ...f.owner, jobId: repeated.executionJobId! });
    expect(job.attempts).toHaveLength(1);
    expect(
      (
        await admin.pool.query('SELECT id FROM execution_job WHERE organization_id = $1', [
          f.actor.organizationId,
        ])
      ).rows,
    ).toHaveLength(1);
  });

  it('rejects a same-length corrupted private source without persisting observations or success', async () => {
    const f = await fixture();
    const receipt = await submit(f);
    const corrupted = bump.sourceText.replace('Synthetic', 'Corrupted');
    expect(Buffer.byteLength(corrupted)).toBe(receipt.byteCount);
    await writeFile(join(temporary!, 'private', receipt.storageKey), corrupted);
    await withWorkers(local, async () => {
      const failed = await until(f, receipt.id, (row) => row.executionStatus === 'dead_letter');
      expect(failed.completedAt).toBeNull();
      expect(failed.observationCount).toBeNull();
    });
    expect(await observations(f, receipt.id)).toEqual([]);
    const job = await readExecution(database, { ...f.owner, jobId: receipt.executionJobId! });
    expect(job.errorCode).toBe('import_failed');
    expect(job.result).toBeNull();
    expect(job.attempts.map((attempt) => attempt.outcome)).toEqual(['failed', 'failed', 'failed']);
  });

  it.each(['revoked', 'cancelled', 'membership_removed'] as const)(
    'prevents final observations when %s during the actual source read',
    async (mutation) => {
      const f = await fixture();
      const receipt = await submit(f);
      const gate = gatedStore();
      await withWorkers(gate.store, async () => {
        try {
          await dispatchExecutions(database, queue);
          await gate.wait();
          expect(await observations(f, receipt.id)).toEqual([]);
          if (mutation === 'revoked')
            await revokeEngagement(database, {
              ...f.owner,
              requestId: randomUUID(),
              engagementId: f.engagementId,
              expectedRevision: 1,
              reason: 'Synthetic authorization withdrawn during source read',
            });
          if (mutation === 'cancelled')
            await cancelExecution(database, {
              ...f.actor,
              requestId: randomUUID(),
              jobId: receipt.executionJobId!,
            });
          if (mutation === 'membership_removed')
            await admin.pool.query(
              'DELETE FROM member WHERE organization_id = $1 AND user_id = $2',
              [f.actor.organizationId, f.actor.userId],
            );
        } finally {
          gate.release();
        }
        const stopped = await until(
          f,
          receipt.id,
          (row) => row.executionStatus === (mutation === 'cancelled' ? 'cancelled' : 'denied'),
        );
        expect(stopped.completedAt).toBeNull();
        expect(stopped.observationCount).toBeNull();
        expect(await observations(f, receipt.id)).toEqual([]);
        expect(
          (await readExecution(database, { ...f.owner, jobId: receipt.executionJobId! })).result,
        ).toBeNull();
      });
    },
  );

  it('retries an interrupted source read with a fresh worker and commits observations exactly once', async () => {
    const f = await fixture();
    const receipt = await submit(f);
    const gate = gatedStore();
    const stop = new AbortController();
    const processing = createExecutionProcessor(database, {
      artifactStore: gate.store,
      signal: stop.signal,
    })({
      name: 'execute',
      data: { jobId: receipt.executionJobId },
    });
    try {
      await gate.wait();
    } finally {
      stop.abort();
      gate.release();
      await processing;
    }
    expect(
      (await readAuditImport(database, { ...f.owner, importId: receipt.id })).executionStatus,
    ).toBe('retry_wait');
    expect(await observations(f, receipt.id)).toEqual([]);
    await withWorkers(local, async () => {
      await until(f, receipt.id, (row) => row.executionStatus === 'succeeded');
    });
    expect((await observations(f, receipt.id)).map((row) => row.observation)).toEqual([issue]);
    const job = await readExecution(database, { ...f.owner, jobId: receipt.executionJobId! });
    expect(job.attempts.map((attempt) => attempt.outcome)).toEqual(['failed', 'succeeded']);
  });

  it.each([
    { phase: 'before_start', mutation: 'membership_removed' },
    { phase: 'before_retry', mutation: 'membership_removed' },
    { phase: 'before_start', mutation: 'revoked' },
    { phase: 'before_retry', mutation: 'revoked' },
  ] as const)('rechecks $mutation authorization $phase', async ({ phase, mutation }) => {
    const f = await fixture();
    const receipt = await submit(f);
    if (phase === 'before_retry') {
      const gate = gatedStore();
      const stop = new AbortController();
      const processing = createExecutionProcessor(database, {
        artifactStore: gate.store,
        signal: stop.signal,
      })({
        name: 'execute',
        data: { jobId: receipt.executionJobId },
      });
      try {
        await gate.wait();
      } finally {
        stop.abort();
        gate.release();
        await processing;
      }
    }
    if (mutation === 'membership_removed')
      await admin.pool.query('DELETE FROM member WHERE organization_id = $1 AND user_id = $2', [
        f.actor.organizationId,
        f.actor.userId,
      ]);
    else
      await revokeEngagement(database, {
        ...f.owner,
        requestId: randomUUID(),
        engagementId: f.engagementId,
        expectedRevision: 1,
        reason: 'Synthetic authorization withdrawn before execution claim',
      });
    await withWorkers(local, async () => {
      const stopped = await until(f, receipt.id, (row) => row.executionStatus === 'denied');
      expect(stopped.completedAt).toBeNull();
    });
    expect(await observations(f, receipt.id)).toEqual([]);
    const job = await readExecution(database, { ...f.owner, jobId: receipt.executionJobId! });
    expect(job.attempts).toHaveLength(phase === 'before_retry' ? 1 : 0);
  });

  it('imports real immutable S3 bytes through the worker into PostgreSQL', async () => {
    const configured = process.env.S3_TEST_ENDPOINT;
    if (!configured) throw new Error('Isolated S3 test service required');
    const endpoint = new URL(configured);
    if (
      endpoint.protocol !== 'http:' ||
      !loopback.includes(endpoint.hostname) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== '/' ||
      process.env.S3_TEST_BUCKET !== 'bump-ingestion-test' ||
      process.env.S3_TEST_ACCESS_KEY_ID !== 'bump_ci_disposable' ||
      process.env.S3_TEST_SECRET_ACCESS_KEY !== 'bump_ci_s3_disposable_only'
    )
      throw new Error('Isolated S3 test service required');
    const store = createArtifactStore({
      NODE_ENV: 'test',
      ARTIFACT_BACKEND: 's3',
      ARTIFACT_S3_ENDPOINT: endpoint.href,
      ARTIFACT_S3_BUCKET: 'bump-ingestion-test',
      ARTIFACT_S3_REGION: 'us-east-1',
      ARTIFACT_S3_ACCESS_KEY_ID: 'bump_ci_disposable',
      ARTIFACT_S3_SECRET_ACCESS_KEY: 'bump_ci_s3_disposable_only',
    });
    try {
      const f = await fixture();
      const request = input(f);
      const reserved = await reserveAuditImport(database, {
        ...f.actor,
        requestId: randomUUID(),
        input: request,
        storageBackend: 's3',
      });
      const bytes = Buffer.from(request.sourceText);
      // Each real PUT is bounded to five seconds; starting retries for ten seconds caps readiness at fifteen.
      const deadline = Date.now() + 10_000;
      while (true) {
        try {
          await store.put(reserved.storageKey, bytes, reserved.sourceSha256);
          break;
        } catch {
          if (Date.now() >= deadline) throw new Error('Isolated S3 test service unavailable');
          await delay(200);
        }
      }
      const receipt = await queueAuditImport(database, {
        ...f.actor,
        requestId: randomUUID(),
        importId: reserved.id,
      });
      await withWorkers(store, async () => {
        const done = await until(f, receipt.id, (row) => row.executionStatus === 'succeeded');
        expect(done.storageBackend).toBe('s3');
        expect(done.sourceSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
        expect(done.byteCount).toBe(bytes.length);
        expect(done.observationCount).toBe(1);
        expect(await store.get(done.storageKey, done.byteCount)).toEqual(bytes);
        expect((await observations(f, done.id)).map((row) => row.observation)).toEqual([issue]);
      });
    } finally {
      store.close();
    }
  }, 30_000);
});
