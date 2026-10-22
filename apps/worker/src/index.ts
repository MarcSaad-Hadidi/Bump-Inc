import { parseEnv, workerEnvSchema } from '@bump/contracts';
import { createDatabase } from '@bump/db';
import { loggerOptions } from '@bump/observability';
import { Redis } from 'ioredis';
import { pino } from 'pino';
import { buildHealthServer, checkWorkerReady } from './health.js';
import { createProbeWorker } from './probe.js';

const env = parseEnv(workerEnvSchema);
const logger = pino(loggerOptions('worker', env.LOG_LEVEL));
const database = createDatabase(env.DATABASE_URL);
database.pool.on('error', () => logger.error('Idle database connection failed'));
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 3_000 });
connection.on('error', () => logger.error('Redis connection failed'));
const worker = createProbeWorker({ connection, database, concurrency: env.WORKER_CONCURRENCY });
worker.on('error', () => logger.error('Queue worker error'));
worker.on('failed', () => logger.warn('System probe job failed'));

const app = buildHealthServer(async () => {
  await checkWorkerReady(worker, connection);
  await Promise.all([connection.ping(), database.pool.query('SELECT 1')]);
});

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const deadline = setTimeout(() => {
    logger.error('Worker shutdown deadline exceeded');
    process.exit(1);
  }, 10_000);
  deadline.unref();
  try {
    await app.close();
    await worker.close();
    await database.pool.end();
    await connection.quit();
  } catch {
    logger.error('Worker shutdown failed');
    process.exit(1);
  } finally {
    clearTimeout(deadline);
  }
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});

try {
  await app.listen({ host: env.HOST, port: env.WORKER_PORT });
  logger.info({ port: env.WORKER_PORT }, 'Worker health server listening');
} catch {
  logger.error('Worker health server failed to start');
  process.exitCode = 1;
  await shutdown();
}
