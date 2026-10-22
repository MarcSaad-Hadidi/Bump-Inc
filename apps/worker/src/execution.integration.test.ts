import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { EXECUTION_QUEUE_NAME, type ExecutionJobInput } from '@bump/contracts';
import {
  amendEngagement,
  approveEngagement,
  cancelExecution,
  claimExecution,
  configureExecution,
  createEngagement,
  executionCheckpoint,
  finishExecution,
  readExecution,
  revokeEngagement,
  submitExecution,
} from '@bump/core';
import { assertRuntimeRole, authSchema, createDatabase, migrateDatabase } from '@bump/db';
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
if (
  process.env.NODE_ENV !== 'test' ||
  !databaseUrl ||
  !migrationUrl ||
  !redisUrl ||
  !new URL(databaseUrl).pathname.endsWith('_test') ||
  !new URL(migrationUrl).pathname.endsWith('_test') ||
  new URL(databaseUrl).host !== new URL(migrationUrl).host ||
  new URL(databaseUrl).pathname !== new URL(migrationUrl).pathname ||
  new URL(redisUrl).pathname !== '/1'
) {
  throw new Error('Execution integration requires isolated matching _test databases and Redis /1');
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
const target = { kind: 'hostname' as const, value: 'worker.example.test' };
const action = 'configuration.read' as const;
type Fixture = Awaited<ReturnType<typeof fixture>>;
type StoredJob = Awaited<ReturnType<typeof readExecution>>;

function revision(userId: string, validUntil = new Date(Date.now() + 3_600_000).toISOString()) {
  return {
    objective: 'Run the local synthetic execution acceptance fixture',
    responsibleUserId: userId,
    scope: { assets: [target], actions: [action], exclusions: [] },
    authorizationText:
      'The synthetic organization owner authorizes this exact local fixture for the assigned member during the documented interval.',
    sourceReference: 'https://example.test/synthetic-authorization',
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil,
  };
}

async function fixture() {
  const organizationId = randomUUID();
  const ownerId = randomUUID();
  const userId = randomUUID();
  organizations.push(organizationId);
  users.push(ownerId, userId);
  await admin.db.insert(authSchema.user).values(
    [ownerId, userId].map((id) => ({
      id,
      name: 'Synthetic execution user',
      email: `${id}@example.test`,
    })),
  );
  await admin.db.insert(authSchema.organization).values({
    id: organizationId,
    name: 'Synthetic execution organization',
    slug: organizationId,
  });
  await admin.db.insert(authSchema.member).values([
    { id: randomUUID(), organizationId, userId: ownerId, role: 'owner' },
    { id: randomUUID(), organizationId, userId, role: 'member' },
  ]);
  const owner = { organizationId, userId: ownerId };
  const actor = { organizationId, userId };
  const head = await createEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    revision: revision(userId),
  });
  await approveEngagement(database, {
    ...owner,
    requestId: randomUUID(),
    engagementId: head.id,
    expectedRevision: 1,
    authorizationSha256: head.version.authorizationSha256,
  });
  return { owner, actor, engagementId: head.id };
}

function input(f: Fixture, overrides: Partial<ExecutionJobInput> = {}): ExecutionJobInput {
  return {
    engagementId: f.engagementId,
    expectedRevision: 1,
    target,
    action,
    kind: 'synthetic',
    payload: { durationMs: 0, failUntilAttempt: 0 },
    idempotencyKey: randomUUID(),
    maxAttempts: 3,
    timeoutMs: 2_000,
    backoffMs: 100,
    ...overrides,
  };
}

function submit(f: Fixture, overrides: Partial<ExecutionJobInput> = {}) {
  return submitExecution(database, {
    ...f.actor,
    requestId: randomUUID(),
    job: input(f, overrides),
  });
}
function read(f: Fixture, jobId: string) {
  return readExecution(database, { ...f.owner, jobId });
}
function claim(f: Fixture, jobId: string) {
  return claimExecution(database, { ...f.actor, jobId });
}
function control(
  f: Fixture,
  overrides: Partial<{ emergencyStop: boolean; concurrencyLimit: number; rateLimit: number }> = {},
) {
  return configureExecution(database, {
    ...f.owner,
    requestId: randomUUID(),
    control: { emergencyStop: false, concurrencyLimit: 2, rateLimit: 1000, ...overrides },
  });
}

async function until(f: Fixture, jobId: string, predicate: (job: StoredJob) => boolean) {
  const deadline = performance.now() + 10_000;
  let stored = await read(f, jobId);
  while (!predicate(stored) && performance.now() < deadline) {
    await dispatchExecutions(database, queue);
    await delay(25);
    stored = await read(f, jobId);
  }
  expect(predicate(stored), `Job ${jobId} stopped at ${stored.status}`).toBe(true);
  return stored;
}

async function withWorkers(run: () => Promise<void>) {
  const workers = [1, 2].map(() => createExecutionWorker({ connection, database, concurrency: 2 }));
  for (const worker of workers) worker.on('error', () => {});
  try {
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));
    await run();
  } finally {
    await Promise.all(workers.map((worker) => worker.close()));
  }
}

beforeAll(async () => {
  await migrateDatabase(migrationUrl);
  await assertRuntimeRole(database.pool);
  await Promise.all([connection.ping(), queue.waitUntilReady()]);
});

afterAll(async () => {
  try {
    await queue.obliterate({ force: true });
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
        organizations,
      ]);
    }
    await admin.pool.query('DELETE FROM organization WHERE id = ANY($1::text[])', [organizations]);
    await admin.pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [users]);
  } finally {
    await queue.close();
    await Promise.all([connection.quit(), producer.quit(), database.pool.end(), admin.pool.end()]);
  }
});

describe('durable synthetic execution against PostgreSQL and Redis', () => {
  it('rolls back the job and history if its durable outbox cannot be written', async () => {
    const f = await fixture();
    const job = input(f);
    await admin.pool.query(
      `ALTER TABLE execution_outbox ADD CONSTRAINT execution_test_outbox_failure CHECK (organization_id <> '${f.actor.organizationId}') NOT VALID`,
    );
    try {
      await expect(
        submitExecution(database, {
          ...f.actor,
          requestId: randomUUID(),
          job,
        }),
      ).rejects.toThrow();
      expect(
        (
          await admin.pool.query('SELECT id FROM execution_job WHERE organization_id = $1', [
            f.actor.organizationId,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (
          await admin.pool.query('SELECT id FROM execution_event WHERE organization_id = $1', [
            f.actor.organizationId,
          ])
        ).rows,
      ).toEqual([]);
    } finally {
      await admin.pool.query(
        'ALTER TABLE execution_outbox DROP CONSTRAINT execution_test_outbox_failure',
      );
    }
    const stored = await submitExecution(database, { ...f.actor, requestId: randomUUID(), job });
    expect(stored.status).toBe('queued');
    await cancelExecution(database, { ...f.actor, jobId: stored.id, requestId: randomUUID() });
  });

  it('deduplicates concurrent submissions and opaque notifications across two workers', async () => {
    const f = await fixture();
    const job = input(f);
    const submissions = await Promise.all(
      [1, 2].map(() =>
        submitExecution(database, {
          ...f.actor,
          requestId: randomUUID(),
          job,
        }),
      ),
    );
    expect(submissions[0]?.id).toBe(submissions[1]?.id);
    const id = submissions[0]!.id;
    await expect(
      submitExecution(database, {
        ...f.actor,
        requestId: randomUUID(),
        job: { ...job, payload: { durationMs: 1, failUntilAttempt: 0 } },
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await withWorkers(async () => {
      await Promise.all([1, 2].map(() => queue.add('execute', { jobId: id })));
      const stored = await until(f, id, (row) => row.status === 'succeeded');
      expect(stored.attempts).toHaveLength(1);
      expect(stored.result).toEqual({ completed: true });
      expect(stored.events.filter((event) => event.status === 'succeeded')).toHaveLength(1);
    });
  });

  it('serializes duplicate claims, concurrency caps and rate caps in PostgreSQL', async () => {
    const f = await fixture();
    await control(f, { concurrencyLimit: 1, rateLimit: 2 });
    const first = await submit(f);
    const second = await submit(f);
    const claims = await Promise.all([claim(f, first.id), claim(f, first.id), claim(f, second.id)]);
    const winners = claims.filter((value) => value !== null);
    expect(winners).toHaveLength(1);
    const winner = winners[0]!;
    await finishExecution(database, {
      ...f.actor,
      jobId: winner.id,
      token: winner.token,
      outcome: 'succeeded',
      result: { completed: true },
    });
    const remaining = winner.id === first.id ? second : first;
    const next = await claim(f, remaining.id);
    expect(next).not.toBeNull();
    await finishExecution(database, {
      ...f.actor,
      jobId: remaining.id,
      token: next!.token,
      outcome: 'succeeded',
      result: { completed: true },
    });
    const third = await submit(f);
    expect(await claim(f, third.id)).toBeNull();
    expect((await read(f, third.id)).attempts).toHaveLength(0);
    await admin.pool.query(
      "UPDATE execution_attempt SET started_at = now() - interval '61 seconds' WHERE organization_id = $1",
      [f.owner.organizationId],
    );
    const released = await claim(f, third.id);
    expect(released).not.toBeNull();
    await finishExecution(database, {
      ...f.actor,
      jobId: third.id,
      token: released!.token,
      outcome: 'succeeded',
      result: { completed: true },
    });
  });

  it('retries only to its stored bound and records exhausted attempts in the dead letter state', async () => {
    const f = await fixture();
    const retry = await submit(f, { payload: { durationMs: 0, failUntilAttempt: 1 } });
    const exhausted = await submit(f, {
      payload: { durationMs: 0, failUntilAttempt: 5 },
      maxAttempts: 2,
    });
    await withWorkers(async () => {
      const succeeded = await until(f, retry.id, (job) => job.status === 'succeeded');
      const dead = await until(f, exhausted.id, (job) => job.status === 'dead_letter');
      expect(succeeded.attempts.map((attempt) => attempt.outcome)).toEqual(['failed', 'succeeded']);
      expect(dead.attempts).toHaveLength(2);
      expect(dead.attempts.every((attempt) => attempt.outcome === 'failed')).toBe(true);
    });
  });

  it('bounds handler deadlines and puts an exhausted timeout in the dead letter state', async () => {
    const f = await fixture();
    const job = await submit(f, {
      payload: { durationMs: 1_000, failUntilAttempt: 0 },
      timeoutMs: 100,
      maxAttempts: 1,
    });
    await withWorkers(async () => {
      const dead = await until(f, job.id, (row) => row.status === 'dead_letter');
      expect(dead.attempts).toHaveLength(1);
      expect(dead.attempts[0]?.outcome).toBe('timed_out');
      expect(dead.result).toBeNull();
    });
  });

  it('cancels queued and active jobs and stops an active handler on emergency stop', async () => {
    const f = await fixture();
    const queued = await submit(f);
    await cancelExecution(database, { ...f.actor, jobId: queued.id, requestId: randomUUID() });
    expect(await claim(f, queued.id)).toBeNull();
    expect((await read(f, queued.id)).attempts).toHaveLength(0);
    await withWorkers(async () => {
      const active = await submit(f, { payload: { durationMs: 3_000, failUntilAttempt: 0 } });
      await until(f, active.id, (row) => row.status === 'running');
      await cancelExecution(database, { ...f.actor, jobId: active.id, requestId: randomUUID() });
      expect((await until(f, active.id, (row) => row.status === 'cancelled')).result).toBeNull();
      const stopped = await submit(f, { payload: { durationMs: 3_000, failUntilAttempt: 0 } });
      await until(f, stopped.id, (row) => row.status === 'running');
      await control(f, { emergencyStop: true });
      expect((await until(f, stopped.id, (row) => row.status === 'cancelled')).result).toBeNull();
      await expect(submit(f)).rejects.toMatchObject({ statusCode: 409, code: 'emergency_stop' });
    });
  });

  it.each(['revoked', 'amended', 'expired', 'approver_demoted', 'membership_removed'] as const)(
    'rechecks %s authorization before a retry rather than reusing the first permit',
    async (mutation) => {
      const f = await fixture();
      const job = await submit(f);
      const first = await claim(f, job.id);
      expect(first).not.toBeNull();
      await finishExecution(database, {
        ...f.actor,
        jobId: job.id,
        token: first!.token,
        outcome: 'failed',
      });
      const selected = {
        ...f.owner,
        engagementId: f.engagementId,
        expectedRevision: 1,
        requestId: randomUUID(),
      };
      if (mutation === 'revoked')
        await revokeEngagement(database, { ...selected, reason: 'Synthetic withdrawal' });
      if (mutation === 'amended')
        await amendEngagement(database, { ...selected, revision: revision(f.actor.userId) });
      if (mutation === 'expired')
        await admin.pool.query(
          "UPDATE engagement_version SET valid_until = now() - interval '1 second' WHERE engagement_id = $1",
          [f.engagementId],
        );
      if (mutation === 'approver_demoted')
        await admin.pool.query(
          'UPDATE member SET role = $1 WHERE organization_id = $2 AND user_id = $3',
          ['admin', f.owner.organizationId, f.owner.userId],
        );
      if (mutation === 'membership_removed')
        await admin.pool.query('DELETE FROM member WHERE organization_id = $1 AND user_id = $2', [
          f.actor.organizationId,
          f.actor.userId,
        ]);
      await admin.pool.query(
        "UPDATE execution_job SET available_at = now() - interval '1 second' WHERE id = $1",
        [job.id],
      );
      if (mutation === 'membership_removed') await dispatchExecutions(database, queue);
      else expect(await claim(f, job.id)).toBeNull();
      const stored = await read(f, job.id);
      expect(stored.status).toBe('denied');
      expect(stored.attempts).toHaveLength(1);
      expect(stored.result).toBeNull();
    },
  );

  it('recovers an expired lease and fences its late checkpoint and result after a new claim', async () => {
    const f = await fixture();
    const job = await submit(f);
    const first = await claim(f, job.id);
    expect(first).not.toBeNull();
    await admin.pool.query(
      "UPDATE execution_job SET deadline_at = now() - interval '1 second' WHERE id = $1",
      [job.id],
    );
    await dispatchExecutions(database, queue);
    expect((await read(f, job.id)).status).toBe('retry_wait');
    await admin.pool.query(
      "UPDATE execution_job SET available_at = now() - interval '1 second' WHERE id = $1",
      [job.id],
    );
    const second = await claim(f, job.id);
    expect(second).not.toBeNull();
    expect(second!.token).not.toBe(first!.token);
    expect(
      await executionCheckpoint(database, { ...f.actor, jobId: job.id, token: first!.token }),
    ).toBe(false);
    expect(
      await finishExecution(database, {
        ...f.actor,
        jobId: job.id,
        token: first!.token,
        outcome: 'succeeded',
        result: { completed: true },
      }),
    ).toBeNull();
    expect((await read(f, job.id)).status).toBe('running');
    await finishExecution(database, {
      ...f.actor,
      jobId: job.id,
      token: second!.token,
      outcome: 'succeeded',
      result: { completed: true },
    });
    const stored = await read(f, job.id);
    expect(stored.status).toBe('succeeded');
    expect(stored.attempts.map((attempt) => attempt.outcome)).toEqual(['timed_out', 'succeeded']);
  });

  it('keeps the outbox after failed publication and republishes a notification removed from Redis', async () => {
    const f = await fixture();
    const job = await submit(f);
    const disconnected = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      connectTimeout: 1_000,
      commandTimeout: 1_000,
      retryStrategy: null,
    });
    disconnected.on('error', () => {});
    const unavailableQueue = new Queue(EXECUTION_QUEUE_NAME, { connection: disconnected });
    unavailableQueue.on('error', () => {});
    try {
      await unavailableQueue.waitUntilReady();
      disconnected.disconnect();
      await expect(dispatchExecutions(database, unavailableQueue)).rejects.toThrow();
      expect((await read(f, job.id)).status).toBe('queued');
      const durable = await admin.pool.query(
        'SELECT job_id FROM execution_outbox WHERE job_id = $1',
        [job.id],
      );
      expect(durable.rows).toHaveLength(1);
    } finally {
      await unavailableQueue.close();
      disconnected.disconnect();
    }
    await admin.pool.query(
      "UPDATE execution_outbox SET publish_after = now() - interval '1 second' WHERE job_id = $1",
      [job.id],
    );
    await dispatchExecutions(database, queue);
    await queue.drain(true);
    await admin.pool.query(
      "UPDATE execution_outbox SET publish_after = now() - interval '1 second' WHERE job_id = $1",
      [job.id],
    );
    await withWorkers(async () => {
      const stored = await until(f, job.id, (row) => row.status === 'succeeded');
      expect(stored.attempts).toHaveLength(1);
    });
  });

  it('rejects malformed transport input and direct unscoped tenant/history access', async () => {
    const f = await fixture();
    const job = await submit(f);
    const process = createExecutionProcessor(database);
    await expect(
      process({ name: 'execute', data: { jobId: job.id, actorUserId: f.owner.userId } }),
    ).rejects.toThrow();
    await expect(process({ name: 'shell', data: { jobId: job.id } })).rejects.toThrow();
    for (const table of [
      'execution_job',
      'execution_attempt',
      'execution_event',
      'execution_outbox',
      'execution_control',
    ]) {
      expect((await database.pool.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
    }
    await expect(
      database.pool.query('UPDATE execution_event SET status = $1 WHERE job_id = $2', [
        'succeeded',
        job.id,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      database.pool.query('DELETE FROM execution_event WHERE job_id = $1', [job.id]),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      database.pool.query('UPDATE execution_attempt SET token = $1 WHERE job_id = $2', [
        randomUUID(),
        job.id,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    const foreign = await fixture();
    await expect(
      readExecution(database, { ...foreign.owner, jobId: job.id }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
