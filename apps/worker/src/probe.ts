import { PROBE_QUEUE_NAME, probeJobSchema } from '@bump/contracts';
import { type createDatabase, systemProbes } from '@bump/db';
import { type Job, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';

export function createProbeProcessor(database: ReturnType<typeof createDatabase>) {
  return async (job: Pick<Job<unknown>, 'name' | 'data'>): Promise<void> => {
    const payload = probeJobSchema.safeParse(job.data);
    if (job.name !== 'probe' || !payload.success) {
      throw new UnrecoverableError('Invalid system probe job');
    }
    try {
      await database.db.insert(systemProbes).values({ id: payload.data.id }).onConflictDoNothing();
    } catch {
      // BullMQ persists error messages and stacks, so discard driver details before retrying.
      throw new Error('System probe persistence failed');
    }
  };
}

export function createProbeWorker(options: {
  connection: Redis;
  database: ReturnType<typeof createDatabase>;
  concurrency: number;
}) {
  return new Worker(PROBE_QUEUE_NAME, createProbeProcessor(options.database), {
    connection: options.connection,
    concurrency: options.concurrency,
  });
}
