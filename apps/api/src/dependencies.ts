import { type ApiEnv, PROBE_QUEUE_NAME } from '@bump/contracts';
import { createDatabase } from '@bump/db';
import { Queue, QueueEvents } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { Redis } from 'ioredis';
import { type AuditService, createAuditService } from './audits.js';

export interface Dependencies {
  start(): Promise<void>;
  database(): Promise<unknown>;
  redis(): Promise<unknown>;
  close(): Promise<void>;
  audits?(): Promise<AuditService>;
}

export function createDependencies(env: ApiEnv, logger: FastifyBaseLogger): Dependencies {
  const database = createDatabase(env.DATABASE_URL);
  const { pool } = database;
  let auditService: Promise<AuditService> | undefined;
  let auditQueue: Queue | undefined;
  let auditEvents: QueueEvents | undefined;
  let auditEventConnection: Redis | undefined;
  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    commandTimeout: 2_000,
  });

  redis.on('error', () => {
    logger.warn({ dependency: 'redis' }, 'Dependency connection unavailable');
  });
  pool.on('error', () => {
    logger.error({ dependency: 'database' }, 'Idle database connection failed');
  });

  return {
    async start() {
      // Liveness must remain available during a dependency outage; readiness reports failure.
      await redis.connect().catch(() => undefined);
    },
    database: () => pool.query('SELECT 1'),
    redis: () => redis.ping(),
    audits() {
      auditService ??= pool.query('SELECT 1 FROM audits, audit_findings LIMIT 0').then(
        async () => {
          // Local development must not depend on Redis or a separately running scanner worker.
          if (env.NODE_ENV === 'development') return createAuditService(database);
          return createAuditService(database, undefined, async (id) => {
            await redis.ping();
            if (!auditQueue || !auditEvents) {
              auditEventConnection = new Redis(env.REDIS_URL, {
                maxRetriesPerRequest: null,
                connectTimeout: 2_000,
              });
              auditEventConnection.on('error', () =>
                logger.warn('Audit event connection unavailable'),
              );
              auditQueue = new Queue(PROBE_QUEUE_NAME, { connection: redis });
              auditEvents = new QueueEvents(PROBE_QUEUE_NAME, { connection: auditEventConnection });
              auditQueue.on('error', () => logger.warn('Audit queue unavailable'));
              auditEvents.on('error', () => logger.warn('Audit events unavailable'));
            }
            const job = await auditQueue!.add(
              'loi25',
              { id },
              {
                jobId: id,
                attempts: 1,
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 86400, count: 1000 },
              },
            );
            await job.waitUntilFinished(auditEvents!, 22_000);
          });
        },
        () => {
          if (env.NODE_ENV === 'production') throw new Error('Audit database unavailable');
          logger.warn(
            'Audit database or schema unavailable; temporary reports expire after 24 hours or restart',
          );
          return createAuditService(undefined);
        },
      );
      return auditService;
    },
    async close() {
      await auditQueue?.close();
      await auditEvents?.close();
      auditEventConnection?.disconnect();
      redis.disconnect();
      await pool.end();
    },
  };
}
