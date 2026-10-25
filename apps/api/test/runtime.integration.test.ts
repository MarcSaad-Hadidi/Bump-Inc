import { apiEnvSchema, type Loi25AuditReport, PROBE_QUEUE_NAME, parseEnv } from '@bump/contracts';
import { createDatabase, migrateDatabase } from '@bump/db';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { describe, expect, it, vi } from 'vitest';
import { createProbeWorker } from '../../worker/src/probe.js';
import * as dns from '../../worker/src/scanners/loi25/dns-email.js';
import * as http from '../../worker/src/scanners/loi25/http-security.js';
import { buildServer } from '../src/server.js';

describe('API with PostgreSQL and Redis', () => {
  it('serves live and ready responses using real dependencies', async () => {
    const env = parseEnv(apiEnvSchema);
    if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test')) {
      throw new Error(
        'Integration tests require NODE_ENV=test and a database name ending in _test',
      );
    }

    const app = buildServer(env);
    try {
      const live = await app.inject('/health/live');
      expect(live.statusCode).toBe(200);
      expect(live.json()).toEqual({ status: 'ok' });

      const ready = await app.inject('/health/ready');
      expect(ready.statusCode).toBe(200);
      expect(ready.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('dispatches a POST to the separate worker and returns its persisted report', async () => {
    const env = parseEnv(apiEnvSchema);
    if (
      env.NODE_ENV !== 'test' ||
      !new URL(env.DATABASE_URL).pathname.endsWith('_test') ||
      new URL(env.REDIS_URL).pathname !== '/1'
    )
      throw new Error('Dedicated test services required');
    await migrateDatabase(env.DATABASE_URL);
    const database = createDatabase(env.DATABASE_URL);
    const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const worker = createProbeWorker({ connection, database, concurrency: 1 });
    const queue = new Queue(PROBE_QUEUE_NAME, { connection });
    worker.on('error', () => {});
    vi.spyOn(http, 'createPassiveFetcher').mockReturnValue({
      close() {},
      async fetch(url) {
        return {
          url: 'https://example.com/',
          status: 200,
          html: '<h1>Exemple synthétique</h1>',
          headers: {},
          cookies: [],
          redirects: url.startsWith('http:') ? [url] : [],
        };
      },
    });
    vi.spyOn(dns, 'collectEmailDns').mockResolvedValue({ spf: [], dmarc: [], mx: [] });
    const app = buildServer(env);
    let id: string | undefined;
    try {
      await worker.waitUntilReady();
      const response = await app.inject({
        method: 'POST',
        url: '/api/audits/loi25',
        payload: { companyName: 'Exemple synthétique', domain: 'example.com' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['x-audit-storage']).toBe('postgres');
      const report = response.json<Loi25AuditReport>();
      id = report.auditId;
      expect(report.status).toBe('COMPLETED');
      expect(report.findings.length).toBeGreaterThan(10);
      expect((await app.inject(`/api/audits/${id}`)).json()).toMatchObject({
        auditId: id,
        score: report.score,
        status: 'COMPLETED',
      });
      expect(
        (await database.pool.query('SELECT raw_probe_data FROM audits WHERE id = $1', [id])).rows[0]
          ?.raw_probe_data.checks.length,
      ).toBe(report.findings.length);
    } finally {
      await app.close();
      await worker.close();
      if (id) {
        await (await queue.getJob(id))?.remove();
        await database.pool.query('DELETE FROM audits WHERE id = $1', [id]);
      }
      await queue.close();
      await connection.quit();
      await database.pool.end();
      vi.restoreAllMocks();
    }
  });
});
