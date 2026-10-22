import { randomUUID } from 'node:crypto';
import { PROBE_QUEUE_NAME } from '@bump/contracts';
import { createDatabase, migrateDatabase } from '@bump/db';
import { type Job, Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProbeWorker } from './probe.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !databaseUrl || !redisUrl || !migrationUrl) {
  throw new Error(
    'Integration tests require NODE_ENV=test, DATABASE_URL and REDIS_URL for dedicated test services',
  );
}
if (
  !new URL(databaseUrl).pathname.endsWith('_test') ||
  !new URL(migrationUrl).pathname.endsWith('_test')
) {
  throw new Error('Integration database name must end in _test');
}
if (new URL(redisUrl).pathname !== '/1') {
  throw new Error('Integration Redis URL must use the dedicated test database /1');
}

const database = createDatabase(databaseUrl);
const migrationDatabase = createDatabase(migrationUrl);
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const producerConnection = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
const queue = new Queue(PROBE_QUEUE_NAME, { connection: producerConnection });
const events = new QueueEvents(PROBE_QUEUE_NAME, { connection });
const worker = createProbeWorker({ connection, database, concurrency: 2 });
const jobs: Job[] = [];
const probeIds: string[] = [];
let migrationCount = 0;
worker.on('error', () => {});
connection.on('error', () => {});
producerConnection.on('error', () => {});

async function enqueue(name: string, data: unknown) {
  const job = await queue.add(name, data, {
    jobId: randomUUID(),
    attempts: 3,
    backoff: { type: 'exponential', delay: 50 },
  });
  jobs.push(job);
  return job;
}

describe('PostgreSQL / Redis / worker integration', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    const firstMigration = await migrationDatabase.pool.query<{ count: string }>(
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    );
    migrationCount = Number(firstMigration.rows[0]?.count);
    await migrateDatabase(migrationUrl);
    await Promise.all([worker.waitUntilReady(), events.waitUntilReady(), queue.waitUntilReady()]);
  }, 20_000);

  afterAll(async () => {
    await worker.close();
    for (const job of jobs) await job.remove();
    await database.pool.query('DELETE FROM system_probes WHERE id = ANY($1::uuid[])', [probeIds]);
    await Promise.all([queue.close(), events.close()]);
    await Promise.all([
      connection.quit(),
      producerConnection.quit(),
      database.pool.end(),
      migrationDatabase.pool.end(),
    ]);
  }, 20_000);

  it('applies the reviewed migration once even when the migrator runs twice', async () => {
    const result = await migrationDatabase.pool.query<{ count: string }>(
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    );
    expect(migrationCount).toBeGreaterThan(0);
    expect(Number(result.rows[0]?.count)).toBe(migrationCount);
  });

  it('processes concurrent duplicate probes into exactly one persisted record', async () => {
    const id = randomUUID();
    probeIds.push(id);
    const [first, second] = await Promise.all([enqueue('probe', { id }), enqueue('probe', { id })]);
    await Promise.all([
      first.waitUntilFinished(events, 10_000),
      second.waitUntilFinished(events, 10_000),
    ]);
    const result = await database.pool.query<{ id: string; completed_at: Date }>(
      'SELECT id, completed_at FROM system_probes WHERE id = $1',
      [id],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.completed_at).toBeInstanceOf(Date);
  }, 15_000);

  it.each(['invalid-payload', 'invalid-name'])(
    'fails %s permanently without persisting data',
    async (kind) => {
      const id = randomUUID();
      probeIds.push(id);
      const job = await enqueue(
        kind === 'invalid-name' ? 'other' : 'probe',
        kind === 'invalid-payload' ? { id, unexpected: true } : { id },
      );
      await expect(job.waitUntilFinished(events, 10_000)).rejects.toThrow(
        'Invalid system probe job',
      );
      const failedJob = job.id ? await queue.getJob(job.id) : undefined;
      expect(failedJob?.attemptsMade).toBe(1);
      const result = await database.pool.query('SELECT id FROM system_probes WHERE id = $1', [id]);
      expect(result.rows).toHaveLength(0);
    },
    15_000,
  );
});
