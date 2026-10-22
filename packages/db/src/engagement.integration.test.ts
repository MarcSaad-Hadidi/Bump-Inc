import { createHash, randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  authSchema,
  createDatabase,
  engagement,
  engagementApproval,
  engagementVersion,
  migrateDatabase,
  withTenant,
} from './index.js';

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !runtimeUrl || !migrationUrl) {
  throw new Error('Engagement integration requires test runtime and migration URLs');
}
const runtimeLocation = new URL(runtimeUrl);
const migrationLocation = new URL(migrationUrl);
if (
  !runtimeLocation.pathname.endsWith('_test') ||
  runtimeLocation.host !== migrationLocation.host ||
  runtimeLocation.pathname !== migrationLocation.pathname
) {
  throw new Error('Engagement fixtures require the same dedicated _test database');
}
const runtime = createDatabase(runtimeUrl);
const admin = createDatabase(migrationUrl);
const organizationA = randomUUID();
const organizationB = randomUUID();
const organizationIds = [organizationA, organizationB];
const ownerA = randomUUID();
const ownerB = randomUUID();
const adminA = randomUUID();
const memberA = randomUUID();
const userIds = [ownerA, ownerB, adminA, memberA];
const scopeA = { organizationId: organizationA, userId: ownerA };
const scopeB = { organizationId: organizationB, userId: ownerB };
const authorizationText = 'Synthetic authorization for a declared test asset.';

function version(
  engagementId: string,
  organizationId = organizationA,
  createdBy = ownerA,
  revision = 1,
): typeof engagementVersion.$inferInsert {
  return {
    organizationId,
    engagementId,
    revision,
    objective: 'Synthetic boundary test',
    responsibleUserId: createdBy,
    scope: {
      assets: [{ kind: 'hostname', value: 'example.invalid' }],
      actions: ['configuration.read'],
      exclusions: [],
    },
    authorizationText,
    authorizationSha256: createHash('sha256').update(authorizationText).digest('hex'),
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validUntil: new Date('2027-01-01T00:00:00Z'),
    createdBy,
  };
}

async function create(scope = scopeA) {
  const id = randomUUID();
  await withTenant(runtime, scope, async (tx) => {
    await tx
      .insert(engagement)
      .values({ id, organizationId: scope.organizationId, createdBy: scope.userId });
    await tx.insert(engagementVersion).values(version(id, scope.organizationId, scope.userId));
  });
  return id;
}

describe('engagement PostgreSQL authorization', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    await admin.db
      .insert(authSchema.user)
      .values(
        userIds.map((id) => ({ id, name: 'Synthetic user', email: `${id}@example.invalid` })),
      );
    await admin.db
      .insert(authSchema.organization)
      .values(organizationIds.map((id) => ({ id, name: 'Synthetic organization', slug: id })));
    await admin.db.insert(authSchema.member).values([
      { id: randomUUID(), organizationId: organizationA, userId: ownerA, role: 'owner' },
      { id: randomUUID(), organizationId: organizationB, userId: ownerB, role: 'owner' },
      { id: randomUUID(), organizationId: organizationA, userId: adminA, role: 'admin' },
      { id: randomUUID(), organizationId: organizationA, userId: memberA, role: 'member' },
    ]);
  });

  afterAll(async () => {
    try {
      await admin.db
        .delete(engagementApproval)
        .where(inArray(engagementApproval.organizationId, organizationIds));
      await admin.db
        .delete(engagementVersion)
        .where(inArray(engagementVersion.organizationId, organizationIds));
      await admin.db.delete(engagement).where(inArray(engagement.organizationId, organizationIds));
      await admin.db
        .delete(authSchema.organization)
        .where(inArray(authSchema.organization.id, organizationIds));
      await admin.db.delete(authSchema.user).where(inArray(authSchema.user.id, userIds));
    } finally {
      await Promise.all([runtime.pool.end(), admin.pool.end()]);
    }
  });

  it('filters all three tables without application predicates and isolates concurrent tenants', async () => {
    const idA = await create();
    const idB = await create(scopeB);
    for (const [scope, id] of [
      [scopeA, idA],
      [scopeB, idB],
    ] as const) {
      await withTenant(runtime, scope, (tx) =>
        tx.insert(engagementApproval).values({
          organizationId: scope.organizationId,
          engagementId: id,
          revision: 1,
          approverUserId: scope.userId,
        }),
      );
    }
    expect(await runtime.db.select().from(engagement)).toEqual([]);
    expect(await runtime.db.select().from(engagementVersion)).toEqual([]);
    expect(await runtime.db.select().from(engagementApproval)).toEqual([]);
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        withTenant(runtime, index % 2 ? scopeA : scopeB, async (tx) => {
          const organizationId = index % 2 ? organizationA : organizationB;
          for (const rows of [
            await tx.select().from(engagement),
            await tx.select().from(engagementVersion),
            await tx.select().from(engagementApproval),
          ]) {
            expect(rows.length).toBeGreaterThan(0);
            expect(rows.every((row) => row.organizationId === organizationId)).toBe(true);
          }
        }),
      ),
    );
    await runtime.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.tenant_id', ${organizationB}, true), set_config('app.user_id', ${ownerA}, true)`,
      );
      expect(await tx.select().from(engagement)).toEqual([]);
      expect(await tx.select().from(engagementVersion)).toEqual([]);
      expect(await tx.select().from(engagementApproval)).toEqual([]);
    });
  });

  it('denies cross-tenant writes and forged creator identities', async () => {
    const idB = await create(scopeB);
    await withTenant(runtime, scopeA, async (tx) => {
      expect(
        await tx
          .update(engagement)
          .set({ currentRevision: 2 })
          .where(eq(engagement.id, idB))
          .returning(),
      ).toEqual([]);
    });
    for (const values of [
      { organizationId: organizationB, createdBy: ownerA },
      { organizationId: organizationA, createdBy: ownerB },
    ]) {
      await expect(
        withTenant(runtime, scopeA, (tx) => tx.insert(engagement).values(values)),
      ).rejects.toMatchObject({ cause: { code: '42501' } });
    }
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(engagementVersion).values(version(idB, organizationB, ownerA, 2)),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  it('permits member reads and administrator drafts, but requires an owner for approval', async () => {
    const id = await create({ organizationId: organizationA, userId: adminA });
    await withTenant(runtime, { organizationId: organizationA, userId: memberA }, async (tx) => {
      expect(await tx.select().from(engagement).where(eq(engagement.id, id))).toHaveLength(1);
      expect(
        await tx.select().from(engagementVersion).where(eq(engagementVersion.engagementId, id)),
      ).toHaveLength(1);
      expect(
        await tx
          .update(engagement)
          .set({ currentRevision: 2 })
          .where(eq(engagement.id, id))
          .returning(),
      ).toEqual([]);
    });
    await expect(create({ organizationId: organizationA, userId: memberA })).rejects.toMatchObject({
      cause: { code: '42501' },
    });
    for (const actor of [adminA, memberA]) {
      await expect(
        withTenant(runtime, { organizationId: organizationA, userId: actor }, (tx) =>
          tx.insert(engagementApproval).values({
            organizationId: organizationA,
            engagementId: id,
            revision: 1,
            approverUserId: actor,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: '42501' } });
    }
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(engagementApproval).values({
          organizationId: organizationA,
          engagementId: id,
          revision: 1,
          approverUserId: ownerB,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    await withTenant(runtime, scopeA, (tx) =>
      tx.insert(engagementApproval).values({
        organizationId: organizationA,
        engagementId: id,
        revision: 1,
        approverUserId: ownerA,
      }),
    );
    await withTenant(runtime, { organizationId: organizationA, userId: memberA }, async (tx) => {
      expect(
        await tx.select().from(engagementApproval).where(eq(engagementApproval.engagementId, id)),
      ).toHaveLength(1);
    });
  });

  it('enforces same-organization foreign keys even for privileged fixtures', async () => {
    const id = await create();
    await expect(
      admin.db.insert(engagementVersion).values(version(id, organizationB, ownerB)),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
    await expect(
      admin.db.insert(engagementApproval).values({
        organizationId: organizationB,
        engagementId: id,
        revision: 1,
        approverUserId: ownerB,
      }),
    ).rejects.toMatchObject({ cause: { code: '23503' } });
  });

  it('rejects mutation and truncation of immutable versions and approvals', async () => {
    for (const statement of [
      'UPDATE engagement_version SET objective = objective',
      'DELETE FROM engagement_version',
      'TRUNCATE engagement_version',
      'UPDATE engagement_approval SET approver_user_id = approver_user_id',
      'DELETE FROM engagement_approval',
      'TRUNCATE engagement_approval',
      'UPDATE engagement SET created_by = created_by',
      'UPDATE engagement SET organization_id = organization_id',
      'DELETE FROM engagement',
      'TRUNCATE engagement',
    ]) {
      await expect(runtime.pool.query(statement)).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('rejects stale or duplicate approvals and keeps revoked heads readable but unchangeable', async () => {
    const id = await create();
    await withTenant(runtime, scopeA, async (tx) => {
      await tx.insert(engagementVersion).values(version(id, organizationA, ownerA, 2));
      await tx.update(engagement).set({ currentRevision: 2 }).where(eq(engagement.id, id));
    });
    const approve = (revision: number) =>
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(engagementApproval).values({
          organizationId: organizationA,
          engagementId: id,
          revision,
          approverUserId: ownerA,
        }),
      );
    await expect(approve(1)).rejects.toMatchObject({ cause: { code: '42501' } });
    await approve(2);
    await expect(approve(2)).rejects.toMatchObject({ cause: { code: '23505' } });
    await withTenant(runtime, scopeA, (tx) =>
      tx
        .update(engagement)
        .set({ revokedAt: new Date(), revokedBy: ownerA, revocationReason: 'Synthetic revocation' })
        .where(eq(engagement.id, id)),
    );
    await expect(approve(2)).rejects.toMatchObject({ cause: { code: '42501' } });
    await withTenant(runtime, scopeA, async (tx) => {
      expect(
        await tx
          .update(engagement)
          .set({ revokedAt: null, revokedBy: null, revocationReason: null })
          .where(eq(engagement.id, id))
          .returning(),
      ).toEqual([]);
    });
    await withTenant(runtime, { organizationId: organizationA, userId: memberA }, async (tx) => {
      expect(
        (await tx.select().from(engagement).where(eq(engagement.id, id)))[0]?.revokedAt,
      ).toBeInstanceOf(Date);
    });
  });

  it('enforces positive revisions, complete revocation, validity and digest shape', async () => {
    const id = await create();
    for (const change of [
      { currentRevision: 0 },
      { revokedAt: new Date() },
      { revokedAt: new Date(), revokedBy: ownerA, revocationReason: ' ' },
    ]) {
      await expect(
        admin.db.update(engagement).set(change).where(eq(engagement.id, id)),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    }
    for (const change of [
      { revision: 0 },
      { authorizationSha256: 'A'.repeat(64) },
      { validUntil: new Date('2026-01-01T00:00:00Z') },
    ]) {
      await expect(
        admin.db
          .insert(engagementVersion)
          .values({ ...version(id, organizationA, ownerA, 2), ...change }),
      ).rejects.toMatchObject({ cause: { code: '23514' } });
    }
  });
});
