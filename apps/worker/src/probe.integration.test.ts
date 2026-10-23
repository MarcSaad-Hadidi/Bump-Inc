import { randomUUID } from 'node:crypto';
import { PROBE_QUEUE_NAME } from '@bump/contracts';
import { createAuditRepository, createDatabase, migrateDatabase } from '@bump/db';
import { type Job, Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createProbeWorker } from './probe.js';
import * as dns from './scanners/loi25/dns-email.js';
import * as http from './scanners/loi25/http-security.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (process.env.NODE_ENV !== 'test' || !databaseUrl || !redisUrl) {
  throw new Error(
    'Integration tests require NODE_ENV=test, DATABASE_URL and REDIS_URL for dedicated test services',
  );
}
if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('Integration database name must end in _test');
}
if (new URL(redisUrl).pathname !== '/1') {
  throw new Error('Integration Redis URL must use the dedicated test database /1');
}

const database = createDatabase(databaseUrl);
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
    await migrateDatabase(databaseUrl);
    const firstMigration = await database.pool.query<{ count: string }>(
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    );
    migrationCount = Number(firstMigration.rows[0]?.count);
    await migrateDatabase(databaseUrl);
    await Promise.all([worker.waitUntilReady(), events.waitUntilReady(), queue.waitUntilReady()]);
  }, 20_000);

  afterAll(async () => {
    await worker.close();
    for (const job of jobs) await job.remove();
    await database.pool.query('DELETE FROM system_probes WHERE id = ANY($1::uuid[])', [probeIds]);
    await Promise.all([queue.close(), events.close()]);
    await Promise.all([connection.quit(), producerConnection.quit(), database.pool.end()]);
  }, 20_000);

  it('applies the reviewed migration once even when the migrator runs twice', async () => {
    const result = await database.pool.query<{ count: string }>(
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

  it('runs the Loi 25 scanner through Redis and persists evidence only in PostgreSQL', async () => {
    const repository = createAuditRepository(database.db);
    const id = await repository.create({
      companyName: 'Exemple synthétique',
      domain: 'example.com',
    });
    vi.spyOn(http, 'createPassiveFetcher').mockReturnValue({
      close() {},
      async fetch(url) {
        return {
          url: 'https://example.com/',
          status: 200,
          html: '<form><input type="email"></form><script>fbq("init", "synthetic")</script>',
          headers: {},
          cookies: [],
          redirects: url.startsWith('http:') ? [url] : [],
        };
      },
    });
    vi.spyOn(dns, 'collectEmailDns').mockResolvedValue({
      spf: [],
      dmarc: ['v=DMARC1; p=none'],
      mx: [],
    });
    try {
      const job = await enqueue('loi25', { id });
      await job.waitUntilFinished(events, 15_000);
      const report = await repository.get(id);
      expect(report?.status).toBe('COMPLETED');
      expect(
        report?.findings.some((f) => f.evidence['check'] === 'trackers' && f.severity === 'ELEVE'),
      ).toBe(true);
      expect(report?.findings.every((f) => !f.humanVerified)).toBe(true);
      expect(report?.score).toBeLessThan(100);
      const completed = await queue.getJob(job.id!);
      expect(completed?.returnvalue).toBeNull();
      expect(completed?.data).toEqual({ id });
    } finally {
      vi.restoreAllMocks();
      await database.pool.query('DELETE FROM audits WHERE id = $1', [id]);
    }
  }, 20_000);

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
