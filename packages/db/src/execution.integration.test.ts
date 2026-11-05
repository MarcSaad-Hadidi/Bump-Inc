import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertRuntimeRole,
  authSchema,
  createDatabase,
  engagement,
  engagementVersion,
  executionAttempt,
  executionControl,
  executionEvent,
  executionJob,
  executionOutbox,
  migrateDatabase,
  withTenant,
} from './index.js';

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !runtimeUrl || !migrationUrl) {
  throw new Error('Execution integration requires test runtime and migration URLs');
}
const runtimeLocation = new URL(runtimeUrl);
const migrationLocation = new URL(migrationUrl);
if (
  !runtimeLocation.pathname.endsWith('_test') ||
  runtimeLocation.host !== migrationLocation.host ||
  runtimeLocation.pathname !== migrationLocation.pathname
) {
  throw new Error('Execution fixtures require the same dedicated _test database');
}
const runtime = createDatabase(runtimeUrl);
const admin = createDatabase(migrationUrl);
const organizations = [randomUUID(), randomUUID()];
const actors = [randomUUID(), randomUUID(), randomUUID()];
const organizationA = organizations[0]!;
const organizationB = organizations[1]!;
const ownerA = actors[0]!;
const ownerB = actors[1]!;
const memberA = actors[2]!;
const scopeA = { organizationId: organizationA, userId: ownerA };
const scopeB = { organizationId: organizationB, userId: ownerB };
const engagementIds = [randomUUID(), randomUUID()];

function job(
  organizationId = organizationA,
  actorUserId = ownerA,
): typeof executionJob.$inferInsert {
  return {
    id: randomUUID(),
    organizationId,
    actorUserId,
    engagementId: organizationId === organizationA ? engagementIds[0]! : engagementIds[1]!,
    expectedRevision: 1,
    target: { kind: 'hostname', value: 'example.invalid' },
    action: 'configuration.read',
    kind: 'synthetic',
    payload: { durationMs: 0, failUntilAttempt: 0 },
    idempotencyKey: randomUUID(),
    requestHash: 'a'.repeat(64),
    requestId: randomUUID(),
    maxAttempts: 2,
    timeoutMs: 1000,
    backoffMs: 100,
  };
}

describe('execution PostgreSQL boundary', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    await admin.db.insert(authSchema.user).values(
      actors.map((id) => ({
        id,
        name: 'Synthetic execution user',
        email: `${id}@example.invalid`,
      })),
    );
    await admin.db
      .insert(authSchema.organization)
      .values(organizations.map((id) => ({ id, name: 'Synthetic execution tenant', slug: id })));
    await admin.db.insert(authSchema.member).values([
      { id: randomUUID(), organizationId: organizationA, userId: ownerA, role: 'owner' },
      { id: randomUUID(), organizationId: organizationB, userId: ownerB, role: 'owner' },
      { id: randomUUID(), organizationId: organizationA, userId: memberA, role: 'member' },
    ]);
    for (const [index, organizationId] of organizations.entries()) {
      const createdBy = index === 0 ? ownerA : ownerB;
      const id = engagementIds[index]!;
      await admin.db.insert(engagement).values({ id, organizationId, createdBy });
      const authorizationText = 'Synthetic execution storage authorization.';
      await admin.db.insert(engagementVersion).values({
        organizationId,
        engagementId: id,
        revision: 1,
        objective: 'Synthetic storage fixture',
        responsibleUserId: createdBy,
        createdBy,
        scope: {
          assets: [{ kind: 'hostname', value: 'example.invalid' }],
          actions: ['configuration.read'],
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
      for (const table of [
        executionOutbox,
        executionEvent,
        executionAttempt,
        executionJob,
        executionControl,
      ]) {
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

  it('checks runtime ownership and requires current tenant membership for every table', async () => {
    await assertRuntimeRole(runtime.pool);
    await expect(assertRuntimeRole(admin.pool)).rejects.toThrow('Database runtime role');
    const first = job();
    const second = job(organizationB, ownerB);
    await withTenant(runtime, scopeA, (tx) => tx.insert(executionJob).values(first));
    await withTenant(runtime, scopeB, (tx) => tx.insert(executionJob).values(second));
    for (const table of [
      executionJob,
      executionEvent,
      executionAttempt,
      executionControl,
      executionOutbox,
    ]) {
      expect(await runtime.db.select().from(table)).toEqual([]);
    }
    await withTenant(runtime, scopeA, async (tx) => {
      const rows = await tx.select().from(executionJob);
      expect(rows.some((row) => row.id === first.id)).toBe(true);
      expect(rows.every((row) => row.organizationId === organizationA)).toBe(true);
    });
    await runtime.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.tenant_id',${organizationB},true),set_config('app.user_id',${ownerA},true)`,
      );
      expect(await tx.select().from(executionJob)).toEqual([]);
    });
  });

  it('rejects forged actors, cross-tenant versions and duplicate idempotency keys', async () => {
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(executionJob).values(job(organizationA, ownerB)),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    await expect(
      admin.db.insert(executionJob).values({ ...job(), engagementId: engagementIds[1]! }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
    const values = job();
    await withTenant(runtime, scopeA, (tx) => tx.insert(executionJob).values(values));
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(executionJob).values({ ...values, id: randomUUID() }),
      ),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('keeps events immutable and permits only a single attempt finalization', async () => {
    const values = job();
    await withTenant(runtime, scopeA, async (tx) => {
      await tx.insert(executionJob).values(values);
      await tx.insert(executionEvent).values({
        organizationId: organizationA,
        jobId: values.id!,
        attempt: 0,
        status: 'queued',
        requestId: values.requestId,
      });
      await tx.insert(executionAttempt).values({
        organizationId: organizationA,
        jobId: values.id!,
        attempt: 1,
        token: randomUUID(),
        deadlineAt: new Date(Date.now() + 1000),
      });
      await tx
        .update(executionAttempt)
        .set({ finishedAt: new Date(), outcome: 'succeeded' })
        .where(eq(executionAttempt.jobId, values.id!));
      expect(
        await tx
          .update(executionAttempt)
          .set({ outcome: 'denied' })
          .where(eq(executionAttempt.jobId, values.id!))
          .returning(),
      ).toEqual([]);
    });
    for (const statement of [
      'UPDATE execution_event SET status = status',
      'DELETE FROM execution_event',
      'TRUNCATE execution_event',
      'UPDATE execution_attempt SET token = token',
      'DELETE FROM execution_attempt',
      'TRUNCATE execution_attempt',
      'UPDATE execution_job SET target = target',
      'UPDATE execution_job SET actor_user_id = actor_user_id',
      'DELETE FROM execution_job',
      'TRUNCATE execution_job',
    ]) {
      await expect(runtime.pool.query(statement)).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('allows members to create default controls but reserves policy changes for administrators', async () => {
    const memberScope = { organizationId: organizationA, userId: memberA };
    await withTenant(runtime, memberScope, (tx) =>
      tx.insert(executionControl).values({ organizationId: organizationA }).onConflictDoNothing(),
    );
    await withTenant(runtime, memberScope, async (tx) => {
      expect(await tx.update(executionControl).set({ emergencyStop: true }).returning()).toEqual(
        [],
      );
    });
    await withTenant(runtime, scopeA, async (tx) => {
      expect(
        await tx.update(executionControl).set({ concurrencyLimit: 32 }).returning(),
      ).toHaveLength(1);
    });
  });

  it('exposes routing only, republishes outbox notifications and rejects removed actors', async () => {
    const values = job(organizationA, memberA);
    await withTenant(runtime, { organizationId: organizationA, userId: memberA }, async (tx) => {
      await tx.insert(executionJob).values(values);
      await tx.insert(executionOutbox).values({ organizationId: organizationA, jobId: values.id! });
    });
    const routing = await runtime.pool.query('SELECT * FROM public.execution_route($1::uuid)', [
      values.id,
    ]);
    expect(routing.rows).toEqual([
      { job_id: values.id, organization_id: organizationA, actor_user_id: memberA },
    ]);
    expect(Object.keys(routing.rows[0] as object)).toEqual([
      'job_id',
      'organization_id',
      'actor_user_id',
    ]);
    const due = () => runtime.pool.query('SELECT * FROM public.execution_routes(100)');
    expect((await due()).rows.some((row: { job_id: string }) => row.job_id === values.id)).toBe(
      true,
    );
    await runtime.pool.query('SELECT public.execution_dispatched($1::uuid)', [values.id]);
    expect((await due()).rows.some((row: { job_id: string }) => row.job_id === values.id)).toBe(
      false,
    );
    await admin.db
      .update(executionOutbox)
      .set({ publishAfter: new Date(Date.now() - 1000) })
      .where(eq(executionOutbox.jobId, values.id!));
    expect((await due()).rows.some((row: { job_id: string }) => row.job_id === values.id)).toBe(
      true,
    );
    await admin.db.delete(authSchema.member).where(eq(authSchema.member.userId, memberA));
    expect(
      (
        await runtime.pool.query(
          'SELECT public.execution_reject_removed_member($1::uuid) AS denied',
          [values.id],
        )
      ).rows[0]?.denied,
    ).toBe(true);
    expect(
      (
        await runtime.pool.query(
          'SELECT public.execution_reject_removed_member($1::uuid) AS denied',
          [values.id],
        )
      ).rows[0]?.denied,
    ).toBe(false);
    const [stored] = await admin.db
      .select()
      .from(executionJob)
      .where(eq(executionJob.id, values.id!));
    expect(stored).toMatchObject({ status: 'denied', errorCode: 'membership_removed' });
    expect(
      await admin.db.select().from(executionOutbox).where(eq(executionOutbox.jobId, values.id!)),
    ).toEqual([]);
  });
});
