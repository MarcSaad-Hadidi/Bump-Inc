import { PROBE_QUEUE_NAME, probeJobSchema } from '@bump/contracts';
import { createAuditRepository, type createDatabase, systemProbes } from '@bump/db';
import { type Job, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { runLoi25Audit } from './scanners/loi25/index.js';

export function createProbeProcessor(database: ReturnType<typeof createDatabase>) {
  return async (job: Pick<Job<unknown>, 'name' | 'data'>): Promise<void> => {
    const payload = probeJobSchema.safeParse(job.data);
    if (job.name === 'loi25' && payload.success) {
      if (process.env.NODE_ENV === 'production')
        throw new UnrecoverableError('Audit authorization is not configured');
      const repository = createAuditRepository(database.db);
      try {
        const audit = await repository.get(payload.data.id);
        if (!audit) throw new UnrecoverableError('Audit not found');
        if (audit.status === 'COMPLETED') return;
        await repository.status(audit.auditId, 'RUNNING');
        const report = await runLoi25Audit(
          { companyName: audit.companyName, domain: audit.domain },
          audit.auditId,
        );
        await repository.save(report, {
          checks: report.findings.map((finding) => finding.evidence),
        });
      } catch (error) {
        if (error instanceof UnrecoverableError) throw error;
        await repository.status(payload.data.id, 'FAILED').catch(() => undefined);
        throw new Error('Audit processing failed');
      }
      return;
    }
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
