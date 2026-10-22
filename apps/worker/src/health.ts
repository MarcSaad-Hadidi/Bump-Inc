import type { Worker } from 'bullmq';
import Fastify from 'fastify';
import type { Redis } from 'ioredis';

export async function checkWorkerReady(
  worker: Pick<Worker, 'isRunning' | 'isPaused' | 'waitUntilReady'>,
  connection: Pick<Redis, 'status'>,
) {
  if (!worker.isRunning() || worker.isPaused() || connection.status !== 'ready') {
    throw new Error('Worker unavailable');
  }
  const blockingConnection = await worker.waitUntilReady();
  // BullMQ's initialization promise stays resolved after its blocking connection disconnects.
  if (blockingConnection.status !== 'ready') {
    throw new Error('Worker blocking connection unavailable');
  }
}

export function buildHealthServer(checkReady: () => Promise<void>) {
  const app = Fastify({ logger: false, requestTimeout: 5_000 });
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async (_request, reply) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        checkReady(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Readiness deadline exceeded')), 3_000);
        }),
      ]);
      return { status: 'ok' };
    } catch {
      return reply.code(503).send({ status: 'unavailable' });
    } finally {
      clearTimeout(timer);
    }
  });
  return app;
}
