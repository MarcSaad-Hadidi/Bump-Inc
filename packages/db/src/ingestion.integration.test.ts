import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertRuntimeRole,
  auditImport,
  auditImportRequest,
  auditObservation,
  authSchema,
  createDatabase,
  engagement,
  engagementVersion,
  executionJob,
  migrateDatabase,
  withTenant,
} from './index.js';

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !runtimeUrl || !migrationUrl) {
  throw new Error('Ingestion integration requires test runtime and migration URLs');
}
const runtimeLocation = new URL(runtimeUrl);
const migrationLocation = new URL(migrationUrl);
if (
  !runtimeLocation.pathname.endsWith('_test') ||
  runtimeLocation.host !== migrationLocation.host ||
  runtimeLocation.pathname !== migrationLocation.pathname
) {
  throw new Error('Ingestion fixtures require the same dedicated _test database');
}
const runtime = createDatabase(runtimeUrl);
const admin = createDatabase(migrationUrl);
const organizations = [randomUUID(), randomUUID()];
const actors = [randomUUID(), randomUUID(), randomUUID()];
const scopeA = { organizationId: organizations[0]!, userId: actors[0]! };
const scopeB = { organizationId: organizations[1]!, userId: actors[1]! };
const memberScope = { organizationId: organizations[0]!, userId: actors[2]! };
const engagementIds = [randomUUID(), randomUUID()];
const observation = {
  kind: 'issue' as const,
  title: 'Synthetic reported issue',
  reportedSeverity: 'unknown' as const,
  sourcePointer: '/observations/0',
};

function source(scope = scopeA): typeof auditImport.$inferInsert {
  const id = randomUUID();
  return {
    id,
    organizationId: scope.organizationId,
    actorUserId: scope.userId,
    engagementId: engagementIds[scope.organizationId === scopeA.organizationId ? 0 : 1]!,
    expectedRevision: 1,
    target: { kind: 'hostname', value: 'example.invalid' },
    format: 'bump-json-v1',
    importerVersion: 'bump-ingestion-v1',
    sourceName: 'synthetic.json',
    sourceSha256: 'a'.repeat(64),
    byteCount: 42,
    storageBackend: 'local',
    storageKey: `${scope.organizationId}/${id}.json`,
    fingerprint: createHash('sha256').update(randomUUID()).digest('hex'),
    requestId: randomUUID(),
  };
}

async function reserve(scope = scopeA) {
  const values = source(scope);
  await withTenant(runtime, scope, (tx) => tx.insert(auditImport).values(values));
  return values;
}

async function ready(scope = scopeA) {
  const values = await reserve(scope);
  const jobId = randomUUID();
  await withTenant(runtime, scope, async (tx) => {
    await tx.insert(executionJob).values({
      id: jobId,
      organizationId: scope.organizationId,
      actorUserId: scope.userId,
      engagementId: values.engagementId,
      expectedRevision: values.expectedRevision,
      target: values.target,
      action: 'audit.import',
      kind: 'audit.import',
      payload: { importId: values.id! },
      idempotencyKey: randomUUID(),
      requestHash: 'b'.repeat(64),
      requestId: values.requestId,
      maxAttempts: 2,
      timeoutMs: 1000,
      backoffMs: 100,
    });
    await tx
      .update(auditImport)
      .set({ status: 'ready', executionJobId: jobId, readyAt: new Date() })
      .where(eq(auditImport.id, values.id!));
  });
  return { values, jobId };
}

async function start(jobId: string, scope = scopeA) {
  await withTenant(runtime, scope, (tx) =>
    tx
      .update(executionJob)
      .set({
        status: 'running',
        attempt: 1,
        leaseToken: randomUUID(),
        deadlineAt: new Date(Date.now() + 30_000),
      })
      .where(eq(executionJob.id, jobId)),
  );
}

describe('ingestion PostgreSQL boundary', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    await admin.db.insert(authSchema.user).values(
      actors.map((id) => ({
        id,
        name: 'Synthetic ingestion user',
        email: `${id}@example.invalid`,
      })),
    );
    await admin.db.insert(authSchema.organization).values(
      organizations.map((id) => ({
        id,
        name: 'Synthetic ingestion tenant',
        slug: id,
      })),
    );
    await admin.db.insert(authSchema.member).values([
      {
        id: randomUUID(),
        organizationId: scopeA.organizationId,
        userId: scopeA.userId,
        role: 'owner',
      },
      {
        id: randomUUID(),
        organizationId: scopeB.organizationId,
        userId: scopeB.userId,
        role: 'owner',
      },
      {
        id: randomUUID(),
        organizationId: memberScope.organizationId,
        userId: memberScope.userId,
        role: 'member',
      },
    ]);
    for (const [index, scope] of [scopeA, scopeB].entries()) {
      const id = engagementIds[index]!;
      await admin.db
        .insert(engagement)
        .values({ id, organizationId: scope.organizationId, createdBy: scope.userId });
      const authorizationText = 'Synthetic passive import authorization.';
      await admin.db.insert(engagementVersion).values({
        organizationId: scope.organizationId,
        engagementId: id,
        revision: 1,
        objective: 'Synthetic ingestion database fixture',
        responsibleUserId: scope.userId,
        createdBy: scope.userId,
        scope: {
          assets: [{ kind: 'hostname', value: 'example.invalid' }],
          actions: ['audit.import'],
          exclusions: [],
        },
        authorizationText,
        authorizationSha256: createHash('sha256').update(authorizationText).digest('hex'),
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2027-01-01'),
      });
    }
  });

  afterAll(async () => {
    try {
      for (const table of [auditObservation, auditImportRequest, auditImport, executionJob]) {
        await admin.db.delete(table).where(inArray(table.organizationId, organizations));
      }
      await admin.db
        .delete(engagementVersion)
        .where(inArray(engagementVersion.organizationId, organizations));
      await admin.db.delete(engagement).where(inArray(engagement.organizationId, organizations));
      await admin.db
        .delete(authSchema.organization)
        .where(inArray(authSchema.organization.id, organizations));
      await admin.db.delete(authSchema.user).where(inArray(authSchema.user.id, actors));
    } finally {
      await Promise.all([runtime.pool.end(), admin.pool.end()]);
    }
  });

  it('forces RLS, rejects elevated runtime roles and isolates all tables without predicates', async () => {
    await assertRuntimeRole(runtime.pool);
    await expect(assertRuntimeRole(admin.pool)).rejects.toThrow('Database runtime role');
    const flags = await admin.pool.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('audit_import'::regclass,'audit_import_request'::regclass,'audit_observation'::regclass)",
    );
    expect(flags.rows).toHaveLength(3);
    expect(flags.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
    for (const scope of [scopeA, scopeB]) {
      const { values, jobId } = await ready(scope);
      await start(jobId, scope);
      await withTenant(runtime, scope, async (tx) => {
        await tx.insert(auditImportRequest).values({
          organizationId: scope.organizationId,
          actorUserId: scope.userId,
          idempotencyKey: randomUUID(),
          requestHash: 'c'.repeat(64),
          importId: values.id!,
        });
        await tx.insert(auditObservation).values({
          organizationId: scope.organizationId,
          importId: values.id!,
          ordinal: 0,
          observation,
        });
      });
    }
    for (const table of [auditImport, auditImportRequest, auditObservation]) {
      expect(await runtime.db.select().from(table)).toEqual([]);
    }
    await Promise.all(
      Array.from({ length: 8 }, (_, index) => {
        const scope = index % 2 ? scopeA : scopeB;
        return withTenant(runtime, scope, async (tx) => {
          for (const table of [auditImport, auditImportRequest, auditObservation]) {
            const rows = await tx.select().from(table);
            expect(rows.length).toBeGreaterThan(0);
            expect(rows.every((row) => row.organizationId === scope.organizationId)).toBe(true);
          }
        });
      }),
    );
    await runtime.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.tenant_id', ${scopeB.organizationId}, true), set_config('app.user_id', ${scopeA.userId}, true)`,
      );
      for (const table of [auditImport, auditImportRequest, auditObservation]) {
        expect(await tx.select().from(table)).toEqual([]);
      }
    });
  });

  it('denies missing context, forged actors and cross-tenant writes and aliases', async () => {
    await expect(runtime.db.insert(auditImport).values(source())).rejects.toMatchObject({
      cause: { code: '42501' },
    });
    for (const values of [source(scopeB), { ...source(), actorUserId: scopeB.userId }]) {
      await expect(
        withTenant(runtime, scopeA, (tx) => tx.insert(auditImport).values(values)),
      ).rejects.toMatchObject({ cause: { code: '42501' } });
    }
    const other = await reserve(scopeB);
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(auditImportRequest).values({
          organizationId: scopeA.organizationId,
          actorUserId: scopeA.userId,
          idempotencyKey: randomUUID(),
          requestHash: 'c'.repeat(64),
          importId: other.id!,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    const own = await reserve();
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(auditImportRequest).values({
          organizationId: scopeA.organizationId,
          actorUserId: scopeB.userId,
          idempotencyKey: randomUUID(),
          requestHash: 'c'.repeat(64),
          importId: own.id!,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    await withTenant(runtime, scopeA, async (tx) => {
      expect(
        await tx
          .update(auditImport)
          .set({ status: 'ready', readyAt: new Date() })
          .where(eq(auditImport.id, other.id!))
          .returning(),
      ).toEqual([]);
    });
  });

  it('protects immutable provenance, aliases and observations with column and table grants', async () => {
    for (const column of [
      'id',
      'organization_id',
      'actor_user_id',
      'engagement_id',
      'expected_revision',
      'target',
      'format',
      'importer_version',
      'source_name',
      'source_sha256',
      'byte_count',
      'storage_backend',
      'storage_key',
      'fingerprint',
      'request_id',
      'created_at',
    ]) {
      await expect(
        runtime.pool.query(`UPDATE audit_import SET ${column} = ${column}`),
      ).rejects.toMatchObject({ code: '42501' });
    }
    for (const table of ['audit_import', 'audit_import_request', 'audit_observation']) {
      await expect(runtime.pool.query(`DELETE FROM ${table}`)).rejects.toMatchObject({
        code: '42501',
      });
      await expect(runtime.pool.query(`TRUNCATE ${table}`)).rejects.toMatchObject({
        code: '42501',
      });
    }
    await expect(
      runtime.pool.query('UPDATE audit_import_request SET request_hash = request_hash'),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      runtime.pool.query('UPDATE audit_observation SET observation = observation'),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('enforces same-organization foreign keys even for migration fixtures', async () => {
    const own = await reserve();
    const invalid = source(scopeB);
    await expect(
      admin.db.insert(auditImport).values({ ...invalid, engagementId: own.engagementId }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
    const { values: other, jobId } = await ready(scopeB);
    await admin.db
      .update(auditImport)
      .set({ status: 'staging', executionJobId: null, readyAt: null })
      .where(eq(auditImport.id, other.id!));
    await expect(
      admin.db
        .update(auditImport)
        .set({ status: 'ready', executionJobId: jobId, readyAt: new Date() })
        .where(eq(auditImport.id, own.id!)),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
    await expect(
      admin.db.insert(auditImportRequest).values({
        organizationId: scopeB.organizationId,
        actorUserId: scopeB.userId,
        idempotencyKey: randomUUID(),
        requestHash: 'a'.repeat(64),
        importId: own.id!,
      }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
    await expect(
      admin.db.insert(auditObservation).values({
        organizationId: scopeB.organizationId,
        importId: own.id!,
        ordinal: 0,
        observation,
      }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
  });

  it('bounds sources, keys, digests, formats, state and observation ordinals', async () => {
    for (const change of [
      { byteCount: 0 },
      { byteCount: 524289 },
      { sourceName: '' },
      { sourceName: 'x'.repeat(256) },
      { sourceSha256: 'A'.repeat(64) },
      { fingerprint: 'x' },
      { storageKey: '../source.json' },
      { importerVersion: 'future' },
    ]) {
      await expect(
        admin.db.insert(auditImport).values({ ...source(), ...change }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    }
    const own = await reserve();
    for (const statement of [
      "format = 'unknown'",
      "storage_backend = 'unknown'",
      "status = 'ready'",
      'completed_at = now()',
      'observation_count = 1001',
    ]) {
      await expect(
        admin.pool.query(`UPDATE audit_import SET ${statement} WHERE id = $1`, [own.id]),
      ).rejects.toMatchObject({ code: '23514' });
    }
    for (const ordinal of [-1, 1000]) {
      await expect(
        admin.db.insert(auditObservation).values({
          organizationId: scopeA.organizationId,
          importId: own.id!,
          ordinal,
          observation,
        }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    }
    for (const invalid of [
      {},
      { ...observation, kind: null },
      { ...observation, reportedSeverity: 'risk' },
      { ...observation, title: 12 },
      { ...observation, sourcePointer: null },
    ]) {
      await expect(
        admin.pool.query(
          'INSERT INTO audit_observation(organization_id,import_id,ordinal,observation) VALUES($1,$2,0,$3::jsonb)',
          [scopeA.organizationId, own.id, JSON.stringify(invalid)],
        ),
      ).rejects.toMatchObject({ code: '23514' });
    }
    const alias = {
      organizationId: scopeA.organizationId,
      actorUserId: scopeA.userId,
      idempotencyKey: randomUUID(),
      requestHash: 'a'.repeat(64),
      importId: own.id!,
    };
    await withTenant(runtime, scopeA, (tx) => tx.insert(auditImportRequest).values(alias));
    await expect(
      withTenant(runtime, scopeA, (tx) => tx.insert(auditImportRequest).values(alias)),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
    await expect(
      admin.db.insert(auditImportRequest).values({ ...alias, idempotencyKey: 'bad key' }),
    ).rejects.toMatchObject({ cause: { code: '23514' } });
    await expect(
      admin.db.insert(auditImport).values({ ...source(), fingerprint: own.fingerprint }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('requires the original actor and running job, seals completed imports and rolls back partial observations', async () => {
    const { values, jobId } = await ready();
    const insert = (scope = scopeA) =>
      withTenant(runtime, scope, (tx) =>
        tx.insert(auditObservation).values({
          organizationId: scopeA.organizationId,
          importId: values.id!,
          ordinal: 0,
          observation,
        }),
      );
    await expect(insert()).rejects.toMatchObject({ cause: { code: '42501' } });
    await start(jobId);
    await expect(insert(memberScope)).rejects.toMatchObject({ cause: { code: '42501' } });
    await expect(
      withTenant(runtime, scopeA, async (tx) => {
        await tx.insert(auditObservation).values({
          organizationId: scopeA.organizationId,
          importId: values.id!,
          ordinal: 0,
          observation,
        });
        await tx
          .update(auditImport)
          .set({ completedAt: new Date(), observationCount: 2 })
          .where(eq(auditImport.id, values.id!));
      }),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    expect(
      await withTenant(runtime, scopeA, (tx) =>
        tx.select().from(auditObservation).where(eq(auditObservation.importId, values.id!)),
      ),
    ).toEqual([]);
    await withTenant(runtime, scopeA, async (tx) => {
      await tx.insert(auditObservation).values({
        organizationId: scopeA.organizationId,
        importId: values.id!,
        ordinal: 0,
        observation,
      });
      await tx
        .update(auditImport)
        .set({ completedAt: new Date(), observationCount: 1 })
        .where(eq(auditImport.id, values.id!));
      await tx
        .update(executionJob)
        .set({
          status: 'succeeded',
          leaseToken: null,
          deadlineAt: null,
          result: { completed: true },
          finishedAt: new Date(),
        })
        .where(eq(executionJob.id, jobId));
    });
    await expect(insert()).rejects.toMatchObject({ cause: { code: '42501' } });
    await withTenant(runtime, scopeA, async (tx) => {
      expect(
        await tx
          .update(auditImport)
          .set({ completedAt: null, observationCount: null })
          .where(eq(auditImport.id, values.id!))
          .returning(),
      ).toEqual([]);
    });
  });
});
