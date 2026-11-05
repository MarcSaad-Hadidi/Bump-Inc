import { createHash, randomUUID } from 'node:crypto';
import type { AuditImportInput, CanonicalObservation } from '@bump/contracts';
import {
  assertRuntimeRole,
  auditImport,
  auditImportRequest,
  auditObservation,
  authSchema,
  createDatabase,
  engagement,
  engagementApproval,
  engagementVersion,
  executionAttempt,
  executionControl,
  executionEvent,
  executionJob,
  executionOutbox,
  migrateDatabase,
  organizationAudit,
} from '@bump/db';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { approveEngagement, createEngagement, revokeEngagement } from './engagements.js';
import {
  cancelExecution,
  claimExecution,
  configureExecution,
  finishExecution,
  readExecution,
} from './execution.js';
import {
  finishAuditImport,
  listAuditImports,
  queueAuditImport,
  readAuditImport,
  readAuditImportForExecution,
  readAuditObservations,
  reserveAuditImport,
} from './ingestion.js';

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !runtimeUrl ||
  !migrationUrl ||
  !new URL(runtimeUrl).pathname.endsWith('_test') ||
  new URL(runtimeUrl).host !== new URL(migrationUrl).host ||
  new URL(runtimeUrl).pathname !== new URL(migrationUrl).pathname
) {
  throw new Error(
    'Ingestion domain fixtures require matching dedicated _test runtime and migration databases',
  );
}
const database = createDatabase(runtimeUrl);
const admin = createDatabase(migrationUrl);
const organizations: string[] = [];
const users: string[] = [];
const target = { kind: 'hostname' as const, value: 'ingestion.example.invalid' };
const observation: CanonicalObservation = {
  kind: 'issue',
  title: 'Synthetic reported issue',
  reportedSeverity: 'unknown',
  sourcePointer: '/observations/0',
};
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function fixture() {
  const organizationId = randomUUID();
  const ownerId = randomUUID();
  const userId = randomUUID();
  organizations.push(organizationId);
  users.push(ownerId, userId);
  await admin.db.insert(authSchema.user).values(
    [ownerId, userId].map((id) => ({
      id,
      name: 'Synthetic ingestion user',
      email: `${id}@example.invalid`,
    })),
  );
  await admin.db
    .insert(authSchema.organization)
    .values({ id: organizationId, name: 'Synthetic ingestion organization', slug: organizationId });
  await admin.db.insert(authSchema.member).values([
    { id: randomUUID(), organizationId, userId: ownerId, role: 'owner' },
    { id: randomUUID(), organizationId, userId, role: 'member' },
  ]);
  const owner = { organizationId, userId: ownerId };
  const actor = { organizationId, userId };
  const head = await createEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    revision: {
      objective: 'Import the bounded synthetic local audit fixture',
      responsibleUserId: userId,
      scope: { assets: [target], actions: ['audit.import'], exclusions: [] },
      authorizationText:
        'The synthetic owner authorizes passive import of this exact local fixture by the assigned operator during this interval.',
      validFrom: new Date(Date.now() - 60_000).toISOString(),
      validUntil: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  await approveEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    engagementId: head.id,
    expectedRevision: 1,
    authorizationSha256: head.version.authorizationSha256,
  });
  return { actor, owner, engagementId: head.id };
}

function input(f: Fixture, changes: Partial<AuditImportInput> = {}): AuditImportInput {
  return {
    engagementId: f.engagementId,
    expectedRevision: 1,
    target,
    format: 'bump-json-v1',
    sourceName: 'synthetic.json',
    sourceText: JSON.stringify({ version: 1, observations: [observation] }),
    idempotencyKey: randomUUID(),
    ...changes,
  };
}

function reserve(f: Fixture, request = input(f)) {
  return reserveAuditImport(database, {
    ...f.actor,
    requestId: randomUUID(),
    input: request,
    storageBackend: 'local',
  });
}

async function ready(f: Fixture) {
  const row = await reserve(f);
  return queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: row.id });
}

async function running(f: Fixture) {
  const row = await ready(f);
  const claimed = await claimExecution(database, { ...f.actor, jobId: row.executionJobId! });
  expect(claimed).not.toBeNull();
  return { row, attempt: { ...f.actor, jobId: row.executionJobId!, token: claimed!.token } };
}

async function observations(f: Fixture, importId: string) {
  return readAuditObservations(database, { ...f.owner, importId, offset: 0, limit: 100 });
}

async function revoke(f: Fixture) {
  await revokeEngagement(database, {
    ...f.owner,
    requestId: randomUUID(),
    engagementId: f.engagementId,
    expectedRevision: 1,
    reason: 'Synthetic fixture revocation',
  });
}

describe('ingestion transactional domain', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    await assertRuntimeRole(database.pool);
  });

  afterAll(async () => {
    try {
      for (const table of [
        auditObservation,
        auditImportRequest,
        auditImport,
        executionOutbox,
        executionEvent,
        executionAttempt,
        executionJob,
        executionControl,
        engagementApproval,
        engagementVersion,
        engagement,
        organizationAudit,
      ]) {
        if (organizations.length)
          await admin.db.delete(table).where(inArray(table.organizationId, organizations));
      }
      if (organizations.length)
        await admin.db
          .delete(authSchema.organization)
          .where(inArray(authSchema.organization.id, organizations));
      if (users.length)
        await admin.db.delete(authSchema.user).where(inArray(authSchema.user.id, users));
    } finally {
      await Promise.all([database.pool.end(), admin.pool.end()]);
    }
  });

  it('deduplicates concurrent requests and keeps aliases conflict-aware with immutable provenance', async () => {
    const f = await fixture();
    const request = input(f);
    const [first, duplicate] = await Promise.all([reserve(f, request), reserve(f, request)]);
    expect(duplicate.id).toBe(first.id);
    const alias = {
      ...request,
      idempotencyKey: randomUUID(),
      sourceName: 'renamed.json',
      target: { ...target, value: target.value.toUpperCase() },
    };
    const reused = await reserve(f, alias);
    expect(reused.id).toBe(first.id);
    expect(reused.sourceName).toBe('synthetic.json');
    expect(reused.requestId).toBe(first.requestId);
    expect(reused.storageKey).toBe(`${f.actor.organizationId}/${first.id}.json`);
    await expect(reserve(f, { ...alias, sourceName: 'changed.json' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'idempotency_conflict',
    });
    const aliases = await admin.db
      .select()
      .from(auditImportRequest)
      .where(eq(auditImportRequest.importId, first.id));
    expect(aliases).toHaveLength(2);
    const queued = await Promise.all([
      queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: first.id }),
      queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: first.id }),
    ]);
    expect(queued[0]!.executionJobId).toBe(queued[1]!.executionJobId);
    expect(
      await admin.db
        .select()
        .from(executionOutbox)
        .where(eq(executionOutbox.jobId, queued[0]!.executionJobId!)),
    ).toHaveLength(1);
  });

  it('retains a staging reservation and resumes it while rejecting a different staging backend', async () => {
    const f = await fixture();
    const request = input(f);
    const staged = await reserve(f, request);
    expect(staged.status).toBe('staging');
    expect(staged.executionJobId).toBeNull();
    await expect(
      reserveAuditImport(database, {
        ...f.actor,
        requestId: randomUUID(),
        input: request,
        storageBackend: 's3',
      }),
    ).rejects.toMatchObject({ code: 'storage_backend_conflict' });
    expect((await reserve(f, request)).id).toBe(staged.id);
    const queued = await queueAuditImport(database, {
      ...f.actor,
      requestId: randomUUID(),
      importId: staged.id,
    });
    expect(queued.status).toBe('ready');
    const job = await readExecution(database, { ...f.owner, jobId: queued.executionJobId! });
    expect(job).toMatchObject({
      kind: 'audit.import',
      action: 'audit.import',
      payload: { importId: staged.id },
      maxAttempts: 3,
      timeoutMs: 30_000,
      backoffMs: 1000,
    });
    expect((await listAuditImports(database, f.owner))[0]).toMatchObject({
      id: staged.id,
      executionStatus: 'queued',
    });
  });

  it('reauthorizes duplicate reservation and queue requests after mandate revocation', async () => {
    const f = await fixture();
    const request = input(f);
    const row = await reserve(f, request);
    await queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: row.id });
    await revoke(f);
    await expect(reserve(f, request)).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: row.id }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('enforces current tenant membership, original actor and exact tenant-bound mandates', async () => {
    const f = await fixture();
    const other = await fixture();
    const row = await reserve(f);
    await expect(
      reserve(other, input(other, { engagementId: f.engagementId })),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      readAuditImport(database, { ...other.owner, importId: row.id }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      queueAuditImport(database, { ...f.owner, requestId: randomUUID(), importId: row.id }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect((await readAuditImport(database, { ...f.owner, importId: row.id })).id).toBe(row.id);
    await admin.db
      .delete(authSchema.member)
      .where(
        and(
          eq(authSchema.member.organizationId, f.actor.organizationId),
          eq(authSchema.member.userId, f.actor.userId),
        ),
      );
    await expect(readAuditImport(database, { ...f.actor, importId: row.id })).rejects.toMatchObject(
      { statusCode: 403 },
    );
  });

  it('serializes concurrent quota reservations and includes staging bytes', async () => {
    const f = await fixture();
    const a = input(f, { sourceName: 'a.json' });
    const b = input(f, { sourceName: 'b.json', sourceText: a.sourceText + ' ' });
    const remaining = Math.max(Buffer.byteLength(a.sourceText), Buffer.byteLength(b.sourceText));
    let bytes = 67_108_864 - remaining;
    const values: (typeof auditImport.$inferInsert)[] = [];
    while (bytes > 0) {
      const id = randomUUID();
      const byteCount = Math.min(524_288, bytes);
      values.push({
        id,
        organizationId: f.actor.organizationId,
        actorUserId: f.actor.userId,
        engagementId: f.engagementId,
        expectedRevision: 1,
        target,
        format: 'bump-json-v1',
        importerVersion: 'bump-ingestion-v1',
        sourceName: 'synthetic-quota.json',
        sourceSha256: 'a'.repeat(64),
        byteCount,
        storageBackend: 'local',
        storageKey: `${f.actor.organizationId}/${id}.json`,
        fingerprint: createHash('sha256').update(id).digest('hex'),
        requestId: randomUUID(),
      });
      bytes -= byteCount;
    }
    await admin.db.insert(auditImport).values(values);
    const outcomes = await Promise.allSettled([reserve(f, a), reserve(f, b)]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === 'rejected')).toMatchObject({
      reason: { code: 'quota_exceeded' },
    });
  });

  it('rolls back the job and outbox if linking a queued import fails', async () => {
    const f = await fixture();
    const row = await reserve(f);
    const constraint = `test_queue_${randomUUID().replaceAll('-', '')}`;
    await admin.pool.query(
      `ALTER TABLE audit_import ADD CONSTRAINT ${constraint} CHECK (id <> '${row.id}'::uuid OR status = 'staging')`,
    );
    try {
      await expect(
        queueAuditImport(database, { ...f.actor, requestId: randomUUID(), importId: row.id }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
      expect(
        await admin.db
          .select()
          .from(executionJob)
          .where(eq(executionJob.organizationId, f.actor.organizationId)),
      ).toEqual([]);
      expect(
        await admin.db
          .select()
          .from(executionOutbox)
          .where(eq(executionOutbox.organizationId, f.actor.organizationId)),
      ).toEqual([]);
      expect((await readAuditImport(database, { ...f.owner, importId: row.id })).status).toBe(
        'staging',
      );
    } finally {
      await admin.pool.query(`ALTER TABLE audit_import DROP CONSTRAINT ${constraint}`);
    }
  });

  it('commits ordered canonical observations, completion and execution success together', async () => {
    const f = await fixture();
    const { row, attempt } = await running(f);
    await expect(
      readAuditImportForExecution(database, { ...attempt, importId: row.id }),
    ).resolves.toMatchObject({ id: row.id });
    await expect(
      readAuditImportForExecution(database, { ...attempt, token: randomUUID(), importId: row.id }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      finishExecution(database, { ...attempt, outcome: 'succeeded' }),
    ).rejects.toMatchObject({ code: 'import_finalization_required' });
    const canonical = [
      observation,
      {
        ...observation,
        title: 'Second synthetic reported issue',
        sourcePointer: '/observations/1',
      },
    ];
    expect(
      await finishAuditImport(database, { ...attempt, observations: canonical }),
    ).toMatchObject({ status: 'succeeded', result: { completed: true } });
    const rows = await observations(f, row.id);
    expect(rows.map((value) => value.ordinal)).toEqual([0, 1]);
    expect(rows.map((value) => value.observation)).toEqual(canonical);
    const completed = await readAuditImport(database, { ...f.owner, importId: row.id });
    expect(completed).toMatchObject({ observationCount: 2, executionStatus: 'succeeded' });
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(await finishAuditImport(database, { ...attempt, observations: canonical })).toBeNull();
    expect(
      await readAuditObservations(database, { ...f.owner, importId: row.id, offset: 1, limit: 1 }),
    ).toHaveLength(1);
  });

  it('rolls back inserted observations when final completion fails, then safely retries', async () => {
    const f = await fixture();
    const { row, attempt } = await running(f);
    const constraint = `test_complete_${randomUUID().replaceAll('-', '')}`;
    await admin.pool.query(
      `ALTER TABLE audit_import ADD CONSTRAINT ${constraint} CHECK (id <> '${row.id}'::uuid OR completed_at IS NULL)`,
    );
    try {
      await expect(
        finishAuditImport(database, { ...attempt, observations: [observation] }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
      expect(await observations(f, row.id)).toEqual([]);
      expect(
        (await readAuditImport(database, { ...f.owner, importId: row.id })).completedAt,
      ).toBeNull();
      expect((await readExecution(database, { ...f.owner, jobId: attempt.jobId })).status).toBe(
        'running',
      );
    } finally {
      await admin.pool.query(`ALTER TABLE audit_import DROP CONSTRAINT ${constraint}`);
    }
    expect(
      await finishAuditImport(database, { ...attempt, observations: [observation] }),
    ).toMatchObject({ status: 'succeeded' });
    expect(await observations(f, row.id)).toHaveLength(1);
  });

  it('does not insert observations for stale tokens, cancellation, stop, revocation, expiry or removed membership', async () => {
    for (const reason of ['stale', 'cancel', 'stop', 'revoke', 'expired', 'removed'] as const) {
      const f = await fixture();
      const { row, attempt } = await running(f);
      if (reason === 'cancel')
        await cancelExecution(database, {
          ...f.actor,
          jobId: attempt.jobId,
          requestId: randomUUID(),
        });
      if (reason === 'stop')
        await configureExecution(database, {
          ...f.owner,
          requestId: randomUUID(),
          control: { emergencyStop: true, concurrencyLimit: 2, rateLimit: 1000 },
        });
      if (reason === 'revoke') await revoke(f);
      if (reason === 'expired')
        await admin.db
          .update(executionJob)
          .set({ deadlineAt: new Date(Date.now() - 1_000) })
          .where(eq(executionJob.id, attempt.jobId));
      if (reason === 'removed')
        await admin.db
          .delete(authSchema.member)
          .where(
            and(
              eq(authSchema.member.organizationId, f.actor.organizationId),
              eq(authSchema.member.userId, f.actor.userId),
            ),
          );
      const finished = await finishAuditImport(database, {
        ...attempt,
        token: reason === 'stale' ? randomUUID() : attempt.token,
        observations: [observation],
      });
      expect(finished?.status).not.toBe('succeeded');
      expect(await observations(f, row.id)).toEqual([]);
      expect(
        (await readAuditImport(database, { ...f.owner, importId: row.id })).completedAt,
      ).toBeNull();
    }
  });

  it('accepts an empty report and uses bounded generic import failure codes', async () => {
    const f = await fixture();
    const { row, attempt } = await running(f);
    expect(await finishExecution(database, { ...attempt, outcome: 'failed' })).toMatchObject({
      status: 'retry_wait',
      errorCode: 'import_failed',
    });
    await admin.db
      .update(executionJob)
      .set({ availableAt: new Date(Date.now() - 1_000) })
      .where(eq(executionJob.id, attempt.jobId));
    const retry = await claimExecution(database, { ...f.actor, jobId: attempt.jobId });
    expect(retry).not.toBeNull();
    expect(
      await finishAuditImport(database, {
        ...attempt,
        token: attempt.token,
        observations: [observation],
      }),
    ).toBeNull();
    expect(
      await finishAuditImport(database, { ...attempt, token: retry!.token, observations: [] }),
    ).toMatchObject({ status: 'succeeded' });
    expect(
      (await readAuditImport(database, { ...f.owner, importId: row.id })).observationCount,
    ).toBe(0);
  });
});
