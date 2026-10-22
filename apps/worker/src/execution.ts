import { setTimeout as delay } from 'node:timers/promises';
import {
  EXECUTION_QUEUE_NAME,
  executionJobInputSchema,
  executionNotificationSchema,
} from '@bump/contracts';
import { claimExecution, executionCheckpoint, finishExecution } from '@bump/core';
import type { Database } from '@bump/db';
import { type Job, type Queue, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';

type Routing = { job_id: string; organization_id: string; actor_user_id: string };

export async function dispatchExecutions(database: Database, queue: Pick<Queue, 'add'>) {
  await database.pool.query('SELECT execution_recover(100)');
  const routes = await database.pool.query<Routing>('SELECT * FROM execution_routes(100)');
  for (const route of routes.rows) {
    await queue.add(
      'execute',
      { jobId: route.job_id },
      {
        // Fresh notification IDs bypass abandoned Redis locks; PostgreSQL fences attempts.
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 1,
      },
    );
    // A crash before this acknowledgement only republishes an idempotent notification.
    await database.pool.query('SELECT execution_dispatched($1::uuid)', [route.job_id]);
  }
  return routes.rows.length;
}

export function startExecutionDispatcher(
  database: Database,
  queue: Pick<Queue, 'add'>,
  onError: () => void,
) {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: Promise<void> = Promise.resolve();
  const tick = () => {
    active = dispatchExecutions(database, queue)
      .then(() => {}, onError)
      .finally(() => {
        if (!closed) timer = setTimeout(tick, 1_000);
      });
  };
  tick();
  return {
    async close() {
      closed = true;
      clearTimeout(timer);
      await active;
    },
  };
}

export function createExecutionProcessor(
  database: Database,
  options: { signal?: AbortSignal } = {},
) {
  return async (notification: Pick<Job<unknown>, 'name' | 'data'>): Promise<void> => {
    const payload = executionNotificationSchema.safeParse(notification.data);
    if (notification.name !== 'execute' || !payload.success)
      throw new UnrecoverableError('Invalid execution notification');
    try {
      const routes = await database.pool.query<Routing>('SELECT * FROM execution_route($1::uuid)', [
        payload.data.jobId,
      ]);
      const route = routes.rows[0];
      if (!route || options.signal?.aborted) return;
      const scope = {
        jobId: route.job_id,
        organizationId: route.organization_id,
        userId: route.actor_user_id,
      };
      const job = await claimExecution(database, scope);
      if (!job) return;
      const attempt = { ...scope, token: job.token };
      const work = executionJobInputSchema.shape.payload.parse(job.payload);
      const end = performance.now() + work.durationMs;
      const deadline = performance.now() + job.timeoutMs;
      while (true) {
        if (options.signal?.aborted) {
          await finishExecution(database, { ...attempt, outcome: 'failed' });
          return;
        }
        if (performance.now() >= deadline) {
          await finishExecution(database, { ...attempt, outcome: 'timed_out' });
          return;
        }
        if (!(await executionCheckpoint(database, attempt))) {
          await finishExecution(database, { ...attempt, outcome: 'cancelled' });
          return;
        }
        if (performance.now() >= end) break;
        await delay(Math.min(100, Math.max(1, end - performance.now())));
      }
      await finishExecution(
        database,
        job.attempt <= work.failUntilAttempt
          ? { ...attempt, outcome: 'failed' }
          : { ...attempt, outcome: 'succeeded', result: { completed: true } },
      );
    } catch {
      // BullMQ stores exceptions in Redis; never persist raw SQL or downstream errors there.
      throw new Error('Execution processing unavailable');
    }
  };
}

export function createExecutionWorker(options: {
  connection: Redis;
  database: Database;
  concurrency: number;
  signal?: AbortSignal;
}) {
  return new Worker(EXECUTION_QUEUE_NAME, createExecutionProcessor(options.database, options), {
    connection: options.connection,
    concurrency: options.concurrency,
  });
}
