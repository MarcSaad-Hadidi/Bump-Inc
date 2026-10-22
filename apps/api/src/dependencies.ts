import type { ApiEnv } from '@bump/contracts';
import { createDatabase } from '@bump/db';
import type { FastifyBaseLogger } from 'fastify';
import { Redis } from 'ioredis';

export interface Dependencies {
  start(): Promise<void>;
  database(): Promise<unknown>;
  redis(): Promise<unknown>;
  close(): Promise<void>;
}

export function createDependencies(env: ApiEnv, logger: FastifyBaseLogger): Dependencies {
  const { pool } = createDatabase(env.DATABASE_URL);
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
    async close() {
      redis.disconnect();
      await pool.end();
    },
  };
}
