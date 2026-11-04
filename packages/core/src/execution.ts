import { createHash, randomUUID } from 'node:crypto';
import {
  type ExecutionWorkInput,
  executionControlInputSchema,
  executionJobInputSchema,
  executionWorkInputSchema,
} from '@bump/contracts';
import {
  type Database,
  executionAttempt,
  executionControl,
  executionEvent,
  executionJob,
  executionOutbox,
  organizationAudit,
  TenantAccessError,
  type TenantRole,
  type Transaction,
  withTenant,
} from '@bump/db';
import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authorizeEngagementInTransaction, EngagementError } from './engagements.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const scopeSchema = z.strictObject({ organizationId: uuid, userId: uuid });
const selectedSchema = scopeSchema.extend({ jobId: uuid });
const mutationSchema = selectedSchema.extend({ requestId: uuid });
const attemptSchema = selectedSchema.extend({ token: uuid });
type Scope = z.infer<typeof scopeSchema>;
type Selected = z.infer<typeof selectedSchema>;
type Job = typeof executionJob.$inferSelect;
type Outcome = 'succeeded' | 'failed' | 'timed_out' | 'cancelled';

export class ExecutionError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409,
    public readonly code: string,
  ) {
    super('Execution request denied');
    this.name = 'ExecutionError';
  }
}

function adminOnly(role: TenantRole) {
  if (role !== 'owner' && role !== 'admin') throw new ExecutionError(403, 'forbidden');
}

async function lockOrganization(tx: Transaction, scope: Scope) {
  // All processes, including SQL lease recovery, serialize the organization's slots.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope.organizationId}, 3))`);
}

async function now(tx: Transaction) {
  const result = await tx.execute<{ value: string }>(sql`select clock_timestamp() as value`);
  const row = result.rows[0];
  if (!row) throw new ExecutionError(409, 'state_conflict');
  return new Date(row.value);
}

function jobCondition(scope: Selected) {
  return and(
    eq(executionJob.organizationId, scope.organizationId),
    eq(executionJob.id, scope.jobId),
  );
}

async function jobFor(tx: Transaction, scope: Selected) {
  const [job] = await tx.select().from(executionJob).where(jobCondition(scope));
  if (!job) throw new ExecutionError(404, 'not_found');
  return job;
}

async function controlFor(tx: Transaction, scope: Scope) {
  await tx
    .insert(executionControl)
    .values({ organizationId: scope.organizationId })
    .onConflictDoNothing();
  const [control] = await tx
    .select()
    .from(executionControl)
    .where(eq(executionControl.organizationId, scope.organizationId));
  if (!control) throw new ExecutionError(409, 'state_conflict');
  return control;
}

async function event(tx: Transaction, job: Job, code: string | null, requestId = job.requestId) {
  await tx.insert(executionEvent).values({
    organizationId: job.organizationId,
    jobId: job.id,
    attempt: job.attempt,
    status: job.status,
    code,
    requestId,
    createdAt: sql`clock_timestamp()`,
  });
}

async function schedule(tx: Transaction, job: Job) {
  await tx
    .insert(executionOutbox)
    .values({
      jobId: job.id,
      organizationId: job.organizationId,
      publishAfter: job.availableAt,
    })
    .onConflictDoUpdate({ target: executionOutbox.jobId, set: { publishAfter: job.availableAt } });
}

async function authorize(tx: Transaction, job: Job) {
  try {
    return await authorizeEngagementInTransaction(tx, {
      organizationId: job.organizationId,
      userId: job.actorUserId,
      engagementId: job.engagementId,
      expectedRevision: job.expectedRevision,
      target: job.target,
      action: job.action,
    });
  } catch (error) {
    if (error instanceof EngagementError)
      return { allowed: false as const, reason: 'authorization_denied' };
    throw error;
  }
}

async function terminal(
  tx: Transaction,
  job: Job,
  status: 'denied' | 'cancelled',
  code: string,
  timestamp: Date,
  requestId = job.requestId,
) {
  const [updated] = await tx
    .update(executionJob)
    .set({
      status,
      errorCode: code,
      leaseToken: null,
      deadlineAt: null,
      finishedAt: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(executionJob.id, job.id))
    .returning();
  if (!updated) throw new ExecutionError(409, 'state_conflict');
  if (job.leaseToken) {
    await tx
      .update(executionAttempt)
      .set({ finishedAt: timestamp, outcome: status, code })
      .where(and(eq(executionAttempt.jobId, job.id), eq(executionAttempt.token, job.leaseToken)));
  }
  await tx.delete(executionOutbox).where(eq(executionOutbox.jobId, job.id));
  await event(tx, updated, code, requestId);
  return updated;
}

async function rejectRemovedMember(database: Database, scope: Selected) {
  await database.pool.query('select public.execution_reject_removed_member($1::uuid)', [
    scope.jobId,
  ]);
}

export async function submitExecution(
  database: Database,
  input: Scope & { requestId: string; job: unknown },
) {
  const parsed = scopeSchema.extend({ requestId: uuid, job: executionJobInputSchema }).parse(input);
  return withTenant(database, parsed, (tx) => submitExecutionInTransaction(tx, parsed));
}

// Internal submissions share the caller's membership transaction and outbox commit.
export async function submitExecutionInTransaction(
  tx: Transaction,
  input: Scope & { requestId: string; job: ExecutionWorkInput },
) {
  const parsed = scopeSchema
    .extend({ requestId: uuid, job: executionWorkInputSchema })
    .parse(input);
  await lockOrganization(tx, parsed);
  const requestHash = createHash('sha256').update(JSON.stringify(parsed.job)).digest('hex');
  const decision = await authorizeEngagementInTransaction(tx, {
    organizationId: parsed.organizationId,
    userId: parsed.userId,
    engagementId: parsed.job.engagementId,
    expectedRevision: parsed.job.expectedRevision,
    target: parsed.job.target,
    action: parsed.job.action,
  });
  if (!decision.allowed) throw new ExecutionError(403, 'authorization_denied');
  const [existing] = await tx
    .select()
    .from(executionJob)
    .where(
      and(
        eq(executionJob.organizationId, parsed.organizationId),
        eq(executionJob.actorUserId, parsed.userId),
        eq(executionJob.idempotencyKey, parsed.job.idempotencyKey),
      ),
    );
  if (existing) {
    if (existing.requestHash !== requestHash) throw new ExecutionError(409, 'idempotency_conflict');
    return existing;
  }
  const control = await controlFor(tx, parsed);
  if (control.emergencyStop) throw new ExecutionError(409, 'emergency_stop');
  const [job] = await tx
    .insert(executionJob)
    .values({
      ...parsed.job,
      organizationId: parsed.organizationId,
      actorUserId: parsed.userId,
      requestId: parsed.requestId,
      requestHash,
    })
    .returning();
  if (!job) throw new ExecutionError(409, 'state_conflict');
  await schedule(tx, job);
  await event(tx, job, null);
  return job;
}

export async function readExecution(database: Database, input: Selected) {
  const scope = selectedSchema.parse(input);
  return withTenant(database, scope, async (tx) => {
    const job = await jobFor(tx, scope);
    const attempts = await tx
      .select()
      .from(executionAttempt)
      .where(
        and(
          eq(executionAttempt.organizationId, scope.organizationId),
          eq(executionAttempt.jobId, scope.jobId),
        ),
      )
      .orderBy(asc(executionAttempt.attempt));
    const events = await tx
      .select()
      .from(executionEvent)
      .where(
        and(
          eq(executionEvent.organizationId, scope.organizationId),
          eq(executionEvent.jobId, scope.jobId),
        ),
      )
      .orderBy(asc(executionEvent.createdAt));
    return { ...job, attempts, events };
  });
}

export async function listExecutions(database: Database, input: Scope) {
  const scope = scopeSchema.parse(input);
  return withTenant(database, scope, (tx) =>
    tx
      .select()
      .from(executionJob)
      .where(eq(executionJob.organizationId, scope.organizationId))
      .orderBy(desc(executionJob.createdAt))
      .limit(100),
  );
}

export async function cancelExecution(database: Database, input: Selected & { requestId: string }) {
  const scope = mutationSchema.parse(input);
  return withTenant(database, scope, async (tx, role) => {
    await lockOrganization(tx, scope);
    const job = await jobFor(tx, scope);
    if (job.actorUserId !== scope.userId) adminOnly(role);
    if (!['queued', 'retry_wait', 'running'].includes(job.status)) return job;
    const timestamp = await now(tx);
    if (job.status !== 'running')
      return terminal(tx, job, 'cancelled', 'cancelled', timestamp, scope.requestId);
    if (job.cancelRequestedAt) return job;
    const [updated] = await tx
      .update(executionJob)
      .set({ cancelRequestedAt: timestamp, updatedAt: timestamp })
      .where(jobCondition(scope))
      .returning();
    if (!updated) throw new ExecutionError(409, 'state_conflict');
    await event(tx, updated, 'cancel_requested', scope.requestId);
    return updated;
  });
}

export async function readExecutionControl(database: Database, input: Scope) {
  const scope = scopeSchema.parse(input);
  return withTenant(database, scope, async (tx) => {
    await lockOrganization(tx, scope);
    return controlFor(tx, scope);
  });
}

export async function configureExecution(
  database: Database,
  input: Scope & { requestId: string; control: unknown },
) {
  const scope = scopeSchema
    .extend({ requestId: uuid, control: executionControlInputSchema })
    .parse(input);
  return withTenant(database, scope, async (tx, role) => {
    adminOnly(role);
    await lockOrganization(tx, scope);
    await controlFor(tx, scope);
    const [control] = await tx
      .update(executionControl)
      .set(scope.control)
      .where(eq(executionControl.organizationId, scope.organizationId))
      .returning();
    if (!control) throw new ExecutionError(409, 'state_conflict');
    if (control.emergencyStop) {
      const timestamp = await now(tx);
      const jobs = await tx
        .select()
        .from(executionJob)
        .where(
          and(
            eq(executionJob.organizationId, scope.organizationId),
            inArray(executionJob.status, ['queued', 'retry_wait', 'running']),
          ),
        );
      for (const job of jobs) {
        if (job.status !== 'running') {
          await terminal(tx, job, 'cancelled', 'emergency_stop', timestamp, scope.requestId);
        } else if (!job.cancelRequestedAt) {
          const [updated] = await tx
            .update(executionJob)
            .set({ cancelRequestedAt: timestamp, updatedAt: timestamp })
            .where(eq(executionJob.id, job.id))
            .returning();
          if (updated) await event(tx, updated, 'emergency_stop', scope.requestId);
        }
      }
    }
    await tx.insert(organizationAudit).values({
      organizationId: scope.organizationId,
      actorUserId: scope.userId,
      requestId: scope.requestId,
      action: 'execution.control_updated',
      targetId: scope.organizationId,
    });
    return control;
  });
}

export async function claimExecution(database: Database, input: Selected) {
  const scope = selectedSchema.parse(input);
  try {
    return await withTenant(database, scope, async (tx) => {
      await lockOrganization(tx, scope);
      const job = await jobFor(tx, scope);
      if (job.actorUserId !== scope.userId) throw new ExecutionError(403, 'forbidden');
      if (job.status !== 'queued' && job.status !== 'retry_wait') return null;
      if (job.availableAt > (await now(tx))) return null;
      const decision = await authorize(tx, job);
      if (!decision.allowed) {
        await terminal(tx, job, 'denied', decision.reason, await now(tx));
        return null;
      }
      const control = await controlFor(tx, scope);
      if (control.emergencyStop || job.cancelRequestedAt) {
        await terminal(tx, job, 'cancelled', 'cancelled', await now(tx));
        return null;
      }
      const timestamp = await now(tx);
      const [active] = await tx
        .select({ value: count() })
        .from(executionJob)
        .where(
          and(
            eq(executionJob.organizationId, scope.organizationId),
            eq(executionJob.status, 'running'),
          ),
        );
      const [recent] = await tx
        .select({ value: count() })
        .from(executionAttempt)
        .where(
          and(
            eq(executionAttempt.organizationId, scope.organizationId),
            gte(executionAttempt.startedAt, new Date(timestamp.getTime() - 60_000)),
          ),
        );
      if (
        (active?.value ?? 0) >= control.concurrencyLimit ||
        (recent?.value ?? 0) >= control.rateLimit
      )
        return null;
      const token = randomUUID();
      const deadlineAt = new Date(timestamp.getTime() + job.timeoutMs);
      const [claimed] = await tx
        .update(executionJob)
        .set({
          status: 'running',
          attempt: job.attempt + 1,
          leaseToken: token,
          deadlineAt,
          errorCode: null,
          updatedAt: timestamp,
        })
        .where(jobCondition(scope))
        .returning();
      if (!claimed) throw new ExecutionError(409, 'state_conflict');
      await tx.insert(executionAttempt).values({
        organizationId: scope.organizationId,
        jobId: job.id,
        attempt: claimed.attempt,
        token,
        deadlineAt,
        startedAt: timestamp,
      });
      await tx.delete(executionOutbox).where(eq(executionOutbox.jobId, job.id));
      await event(tx, claimed, null);
      return { ...claimed, token };
    });
  } catch (error) {
    if (!(error instanceof TenantAccessError)) throw error;
    await rejectRemovedMember(database, scope);
    return null;
  }
}

export async function executionCheckpoint(database: Database, input: Selected & { token: string }) {
  const scope = attemptSchema.parse(input);
  try {
    return await withTenant(database, scope, async (tx) => {
      await lockOrganization(tx, scope);
      const job = await jobFor(tx, scope);
      if (
        job.actorUserId !== scope.userId ||
        job.status !== 'running' ||
        job.leaseToken !== scope.token
      )
        return false;
      if (job.cancelRequestedAt) return false;
      const control = await controlFor(tx, scope);
      if (control.emergencyStop) return false;
      const decision = await authorize(tx, job);
      const timestamp = await now(tx);
      if (!decision.allowed) {
        await terminal(tx, job, 'denied', decision.reason, timestamp);
        return false;
      }
      return job.deadlineAt !== null && job.deadlineAt > timestamp;
    });
  } catch (error) {
    if (!(error instanceof TenantAccessError)) throw error;
    await rejectRemovedMember(database, scope);
    return false;
  }
}

export async function finishExecution(
  database: Database,
  input: Selected & { token: string; outcome: Outcome; result?: { completed: true } },
  onSuccess?: (tx: Transaction, job: Job) => Promise<void>,
) {
  const scope = attemptSchema
    .extend({
      outcome: z.enum(['succeeded', 'failed', 'timed_out', 'cancelled']),
      result: z.strictObject({ completed: z.literal(true) }).optional(),
    })
    .parse(input);
  try {
    return await withTenant(database, scope, async (tx) => {
      await lockOrganization(tx, scope);
      const job = await jobFor(tx, scope);
      if (
        job.actorUserId !== scope.userId ||
        job.status !== 'running' ||
        job.leaseToken !== scope.token
      )
        return null;
      const control = await controlFor(tx, scope);
      if (job.cancelRequestedAt || control.emergencyStop)
        return terminal(tx, job, 'cancelled', 'cancelled', await now(tx));
      const decision = await authorize(tx, job);
      const timestamp = await now(tx);
      if (!decision.allowed) return terminal(tx, job, 'denied', decision.reason, timestamp);
      const outcome = !job.deadlineAt || job.deadlineAt <= timestamp ? 'timed_out' : scope.outcome;
      if (outcome === 'cancelled') return terminal(tx, job, 'cancelled', 'cancelled', timestamp);
      if (outcome === 'succeeded') {
        if (job.kind === 'audit.import' && !onSuccess)
          throw new ExecutionError(409, 'import_finalization_required');
        await onSuccess?.(tx, job);
      }
      const retry = outcome !== 'succeeded' && job.attempt < job.maxAttempts;
      const status = outcome === 'succeeded' ? 'succeeded' : retry ? 'retry_wait' : 'dead_letter';
      const code =
        outcome === 'succeeded'
          ? null
          : outcome === 'timed_out'
            ? 'timed_out'
            : job.kind === 'audit.import'
              ? 'import_failed'
              : 'synthetic_failure';
      const availableAt = retry
        ? new Date(timestamp.getTime() + Math.min(60_000, job.backoffMs * 2 ** (job.attempt - 1)))
        : job.availableAt;
      const [updated] = await tx
        .update(executionJob)
        .set({
          status,
          leaseToken: null,
          deadlineAt: null,
          availableAt,
          errorCode: code,
          result: outcome === 'succeeded' ? { completed: true } : null,
          finishedAt: retry ? null : timestamp,
          updatedAt: timestamp,
        })
        .where(jobCondition(scope))
        .returning();
      if (!updated) throw new ExecutionError(409, 'state_conflict');
      await tx
        .update(executionAttempt)
        .set({ finishedAt: timestamp, outcome, code })
        .where(and(eq(executionAttempt.jobId, job.id), eq(executionAttempt.token, scope.token)));
      if (retry) await schedule(tx, updated);
      await event(tx, updated, code);
      return updated;
    });
  } catch (error) {
    if (!(error instanceof TenantAccessError)) throw error;
    await rejectRemovedMember(database, scope);
    return null;
  }
}
