import { createHash, randomUUID } from 'node:crypto';
import {
  type AuditImportInput,
  auditImportInputSchema,
  type CanonicalObservation,
  canonicalObservationSchema,
  INGESTION_IMPORTER_VERSION,
  INGESTION_MAX_OBSERVATIONS,
  INGESTION_TENANT_QUOTA_BYTES,
  parseAuditSource,
} from '@bump/contracts';
import {
  auditImport,
  auditImportRequest,
  auditObservation,
  type Database,
  executionControl,
  executionJob,
  type Transaction,
  withTenant,
} from '@bump/db';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authorizeEngagementInTransaction } from './engagements.js';
import { finishExecution, submitExecutionInTransaction } from './execution.js';

const uuid = z.uuid().transform((value) => value.toLowerCase());
const scopeSchema = z.strictObject({ organizationId: uuid, userId: uuid });
const selectedSchema = scopeSchema.extend({ importId: uuid });
const attemptSchema = scopeSchema.extend({ jobId: uuid, token: uuid });
type Scope = z.infer<typeof scopeSchema>;
type Selected = z.infer<typeof selectedSchema>;
type AuditImport = typeof auditImport.$inferSelect;
type Job = typeof executionJob.$inferSelect;

export class IngestionError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409,
    public readonly code: string,
  ) {
    super('Audit import request denied');
    this.name = 'IngestionError';
  }
}

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

async function lockOrganization(tx: Transaction, scope: Scope) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope.organizationId}, 3))`);
}

function importCondition(scope: Selected) {
  return and(
    eq(auditImport.organizationId, scope.organizationId),
    eq(auditImport.id, scope.importId),
  );
}

async function importFor(tx: Transaction, scope: Selected) {
  const [row] = await tx.select().from(auditImport).where(importCondition(scope));
  if (!row) throw new IngestionError(404, 'not_found');
  return row;
}

async function authorize(
  tx: Transaction,
  scope: Scope,
  input: Pick<AuditImportInput, 'engagementId' | 'expectedRevision' | 'target'>,
) {
  const decision = await authorizeEngagementInTransaction(tx, {
    organizationId: scope.organizationId,
    userId: scope.userId,
    engagementId: input.engagementId,
    expectedRevision: input.expectedRevision,
    target: input.target,
    action: 'audit.import',
  });
  if (!decision.allowed) throw new IngestionError(403, 'authorization_denied');
}

function checkBackend(row: AuditImport, backend: 'local' | 's3') {
  if (row.status === 'staging' && row.storageBackend !== backend)
    throw new IngestionError(409, 'storage_backend_conflict');
  return row;
}

export async function reserveAuditImport(
  database: Database,
  input: Scope & { requestId: string; input: AuditImportInput; storageBackend: 'local' | 's3' },
) {
  const parsed = scopeSchema
    .extend({
      requestId: uuid,
      input: auditImportInputSchema,
      storageBackend: z.enum(['local', 's3']),
    })
    .parse(input);
  parseAuditSource(parsed.input.format, parsed.input.sourceText);
  const { sourceText, idempotencyKey, ...request } = parsed.input;
  const sourceSha256 = digest(sourceText);
  const requestHash = digest(JSON.stringify({ ...request, sourceSha256 }));
  const fingerprint = digest(
    JSON.stringify({
      organizationId: parsed.organizationId,
      engagementId: request.engagementId,
      expectedRevision: request.expectedRevision,
      target: request.target,
      format: request.format,
      importerVersion: INGESTION_IMPORTER_VERSION,
      sourceSha256,
    }),
  );
  const byteCount = Buffer.byteLength(sourceText, 'utf8');
  return withTenant(database, parsed, async (tx) => {
    await lockOrganization(tx, parsed);
    await authorize(tx, parsed, request);
    const [alias] = await tx
      .select()
      .from(auditImportRequest)
      .where(
        and(
          eq(auditImportRequest.organizationId, parsed.organizationId),
          eq(auditImportRequest.actorUserId, parsed.userId),
          eq(auditImportRequest.idempotencyKey, idempotencyKey),
        ),
      );
    if (alias) {
      if (alias.requestHash !== requestHash) throw new IngestionError(409, 'idempotency_conflict');
      return checkBackend(
        await importFor(tx, { ...parsed, importId: alias.importId }),
        parsed.storageBackend,
      );
    }
    let [row] = await tx
      .select()
      .from(auditImport)
      .where(
        and(
          eq(auditImport.organizationId, parsed.organizationId),
          eq(auditImport.fingerprint, fingerprint),
        ),
      );
    if (row) checkBackend(row, parsed.storageBackend);
    else {
      const [usage] = await tx
        .select({ bytes: sql<string>`coalesce(sum(${auditImport.byteCount}), 0)` })
        .from(auditImport)
        .where(eq(auditImport.organizationId, parsed.organizationId));
      if (Number(usage?.bytes ?? 0) + byteCount > INGESTION_TENANT_QUOTA_BYTES)
        throw new IngestionError(409, 'quota_exceeded');
      const id = randomUUID();
      [row] = await tx
        .insert(auditImport)
        .values({
          ...request,
          id,
          organizationId: parsed.organizationId,
          actorUserId: parsed.userId,
          importerVersion: INGESTION_IMPORTER_VERSION,
          sourceSha256,
          byteCount,
          storageBackend: parsed.storageBackend,
          storageKey: `${parsed.organizationId}/${id}.json`,
          fingerprint,
          requestId: parsed.requestId,
        })
        .returning();
    }
    if (!row) throw new IngestionError(409, 'state_conflict');
    await tx.insert(auditImportRequest).values({
      organizationId: parsed.organizationId,
      actorUserId: parsed.userId,
      idempotencyKey,
      requestHash,
      importId: row.id,
    });
    return row;
  });
}

export async function queueAuditImport(
  database: Database,
  input: Selected & { requestId: string },
) {
  const scope = selectedSchema.extend({ requestId: uuid }).parse(input);
  return withTenant(database, scope, async (tx) => {
    await lockOrganization(tx, scope);
    const row = await importFor(tx, scope);
    if (row.actorUserId !== scope.userId) throw new IngestionError(403, 'authorization_denied');
    await authorize(tx, scope, row);
    if (row.status === 'ready') return row;
    const job = await submitExecutionInTransaction(tx, {
      organizationId: scope.organizationId,
      userId: scope.userId,
      requestId: scope.requestId,
      job: {
        engagementId: row.engagementId,
        expectedRevision: row.expectedRevision,
        target: row.target,
        action: 'audit.import',
        kind: 'audit.import',
        payload: { importId: row.id },
        idempotencyKey: `import-${row.id}`,
        maxAttempts: 3,
        timeoutMs: 30_000,
        backoffMs: 1_000,
      },
    });
    const [updated] = await tx
      .update(auditImport)
      .set({
        status: 'ready',
        executionJobId: job.id,
        readyAt: sql`clock_timestamp()`,
      })
      .where(importCondition(scope))
      .returning();
    if (!updated) throw new IngestionError(409, 'state_conflict');
    return updated;
  });
}

export async function readAuditImport(database: Database, input: Selected) {
  const scope = selectedSchema.parse(input);
  return withTenant(database, scope, async (tx) => {
    const row = await importFor(tx, scope);
    const [job] = row.executionJobId
      ? await tx
          .select({ status: executionJob.status })
          .from(executionJob)
          .where(
            and(
              eq(executionJob.organizationId, scope.organizationId),
              eq(executionJob.id, row.executionJobId),
            ),
          )
      : [];
    return { ...row, executionStatus: job?.status ?? null };
  });
}

export async function listAuditImports(database: Database, input: Scope) {
  const scope = scopeSchema.parse(input);
  return withTenant(database, scope, async (tx) => {
    const rows = await tx
      .select({ row: auditImport, executionStatus: executionJob.status })
      .from(auditImport)
      .leftJoin(
        executionJob,
        and(
          eq(executionJob.organizationId, auditImport.organizationId),
          eq(executionJob.id, auditImport.executionJobId),
        ),
      )
      .where(eq(auditImport.organizationId, scope.organizationId))
      .orderBy(desc(auditImport.createdAt), desc(auditImport.id))
      .limit(100);
    return rows.map(({ row, executionStatus }) => ({ ...row, executionStatus }));
  });
}

export async function readAuditObservations(
  database: Database,
  input: Selected & { offset: number; limit: number },
) {
  const scope = selectedSchema
    .extend({
      offset: z.number().int().min(0).max(INGESTION_MAX_OBSERVATIONS),
      limit: z.number().int().min(1).max(100),
    })
    .parse(input);
  return withTenant(database, scope, async (tx) => {
    await importFor(tx, scope);
    return tx
      .select()
      .from(auditObservation)
      .where(
        and(
          eq(auditObservation.organizationId, scope.organizationId),
          eq(auditObservation.importId, scope.importId),
        ),
      )
      .orderBy(asc(auditObservation.ordinal))
      .offset(scope.offset)
      .limit(scope.limit);
  });
}

function checkBinding(row: AuditImport, job: Job) {
  if (
    row.status !== 'ready' ||
    row.completedAt ||
    row.executionJobId !== job.id ||
    row.organizationId !== job.organizationId ||
    row.actorUserId !== job.actorUserId ||
    row.engagementId !== job.engagementId ||
    row.expectedRevision !== job.expectedRevision ||
    row.target.kind !== job.target.kind ||
    row.target.value !== job.target.value ||
    job.kind !== 'audit.import' ||
    job.action !== 'audit.import' ||
    !('importId' in job.payload) ||
    job.payload.importId !== row.id
  )
    throw new IngestionError(409, 'state_conflict');
}

export async function readAuditImportForExecution(
  database: Database,
  input: Selected & { jobId: string; token: string },
) {
  const scope = selectedSchema.extend({ jobId: uuid, token: uuid }).parse(input);
  return withTenant(database, scope, async (tx) => {
    await lockOrganization(tx, scope);
    const row = await importFor(tx, scope);
    const [job] = await tx
      .select()
      .from(executionJob)
      .where(
        and(
          eq(executionJob.organizationId, scope.organizationId),
          eq(executionJob.id, scope.jobId),
        ),
      );
    if (
      !job ||
      job.actorUserId !== scope.userId ||
      job.status !== 'running' ||
      job.leaseToken !== scope.token ||
      job.cancelRequestedAt
    )
      throw new IngestionError(409, 'state_conflict');
    checkBinding(row, job);
    await authorize(tx, scope, row);
    const [control] = await tx
      .select()
      .from(executionControl)
      .where(eq(executionControl.organizationId, scope.organizationId));
    const clock = await tx.execute<{ value: string }>(sql`select clock_timestamp() as value`);
    const timestamp = clock.rows[0]?.value;
    if (
      control?.emergencyStop ||
      !timestamp ||
      !job.deadlineAt ||
      job.deadlineAt <= new Date(timestamp)
    )
      throw new IngestionError(409, 'state_conflict');
    return row;
  });
}

export async function finishAuditImport(
  database: Database,
  input: Scope & { jobId: string; token: string; observations: CanonicalObservation[] },
) {
  const parsed = attemptSchema
    .extend({ observations: z.array(canonicalObservationSchema).max(INGESTION_MAX_OBSERVATIONS) })
    .parse(input);
  return finishExecution(
    database,
    {
      organizationId: parsed.organizationId,
      userId: parsed.userId,
      jobId: parsed.jobId,
      token: parsed.token,
      outcome: 'succeeded',
    },
    async (tx, job) => {
      if (!('importId' in job.payload)) throw new IngestionError(409, 'state_conflict');
      const scope = {
        organizationId: parsed.organizationId,
        userId: parsed.userId,
        importId: job.payload.importId,
      };
      const row = await importFor(tx, scope);
      checkBinding(row, job);
      if (parsed.observations.length)
        await tx.insert(auditObservation).values(
          parsed.observations.map((observation, ordinal) => ({
            organizationId: scope.organizationId,
            importId: row.id,
            ordinal,
            observation,
          })),
        );
      const [updated] = await tx
        .update(auditImport)
        .set({ observationCount: parsed.observations.length, completedAt: sql`clock_timestamp()` })
        .where(importCondition(scope))
        .returning();
      if (!updated) throw new IngestionError(409, 'state_conflict');
    },
  );
}
