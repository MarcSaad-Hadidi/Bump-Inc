import type { ApiEnv } from '@bump/contracts';
import { assertRuntimeRole, createDatabase } from '@bump/db';
import { createAuth } from '@bump/identity';
import { createArtifactStore, createMailer } from '@bump/integrations';
import type { FastifyBaseLogger } from 'fastify';
import { Redis } from 'ioredis';
import type { IdentityContext } from './identity-routes.js';

export interface Dependencies {
  identity?: IdentityContext;
  start(): Promise<void>;
  database(): Promise<unknown>;
  redis(): Promise<unknown>;
  close(): Promise<void>;
}

export function createDependencies(env: ApiEnv, logger: FastifyBaseLogger): Dependencies {
  const database = createDatabase(env.DATABASE_URL);
  const { pool } = database;
  const mailer = createMailer(env);
  const artifactStore = createArtifactStore(process.env);
  const sendMail = async (message: Parameters<typeof mailer.send>[0]) => {
    try {
      await mailer.send(message);
    } catch (error) {
      logger.error('Identity email delivery failed');
      throw error;
    }
  };
  const auth = createAuth(database.db, env, sendMail);
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
    identity: { database, env, auth, sendMail, artifactStore },
    async start() {
      await assertRuntimeRole(pool);
      // A Redis outage affects readiness without preventing startup.
      await redis.connect().catch(() => undefined);
    },
    database: () => pool.query('SELECT 1'),
    redis: () => redis.ping(),
    async close() {
      redis.disconnect();
      mailer.close();
      artifactStore.close();
      await pool.end();
    },
  };
}
