import { randomUUID } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authSchema } from './auth-schema.js';
import {
  assertRuntimeRole,
  createDatabase,
  migrateDatabase,
  schema,
  setTenantContext,
  TenantAccessError,
  withTenant,
} from './index.js';
import { organizationAudit, organizationSettings } from './schema.js';

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !runtimeUrl || !migrationUrl) {
  throw new Error('Tenant integration requires NODE_ENV=test and separate runtime/migration URLs');
}
const runtimeLocation = new URL(runtimeUrl);
const migrationLocation = new URL(migrationUrl);
if (
  !runtimeLocation.pathname.endsWith('_test') ||
  !migrationLocation.pathname.endsWith('_test') ||
  runtimeLocation.host !== migrationLocation.host ||
  runtimeLocation.pathname !== migrationLocation.pathname
) {
  throw new Error('Runtime and migration URLs must target the same dedicated _test database');
}
const runtime = createDatabase(runtimeUrl);
const admin = createDatabase(migrationUrl);
const organizationA = randomUUID();
const organizationB = randomUUID();
const organizationIds = [organizationA, organizationB];
const userA = randomUUID();
const userB = randomUUID();
const memberA = randomUUID();
const userIds = [userA, userB, memberA];
const scopeA = { organizationId: organizationA, userId: userA };
const scopeB = { organizationId: organizationB, userId: userB };
let migrationCount = 0;

describe('tenant PostgreSQL authorization', () => {
  beforeAll(async () => {
    await migrateDatabase(migrationUrl);
    migrationCount = Number(
      (
        await admin.pool.query<{ count: string }>(
          'SELECT count(*) FROM drizzle.__drizzle_migrations',
        )
      ).rows[0]?.count,
    );
    await migrateDatabase(migrationUrl);
    await assertRuntimeRole(runtime.pool);
    await admin.db.insert(authSchema.user).values(
      userIds.map((id) => ({
        id,
        name: 'Synthetic integration user',
        email: `${id}@example.invalid`,
      })),
    );
    await admin.db
      .insert(authSchema.organization)
      .values(organizationIds.map((id) => ({ id, name: 'Synthetic test organization', slug: id })));
    await admin.db.insert(authSchema.member).values([
      { id: randomUUID(), organizationId: organizationA, userId: userA, role: 'owner' },
      { id: randomUUID(), organizationId: organizationB, userId: userB, role: 'owner' },
      { id: randomUUID(), organizationId: organizationA, userId: memberA, role: 'member' },
    ]);
    await admin.db
      .insert(organizationSettings)
      .values(organizationIds.map((organizationId) => ({ organizationId, locale: 'en' as const })));
    await admin.db.insert(organizationAudit).values([
      {
        organizationId: organizationA,
        actorUserId: userA,
        action: 'fixture.created',
        requestId: randomUUID(),
      },
      {
        organizationId: organizationB,
        actorUserId: userB,
        action: 'fixture.created',
        requestId: randomUUID(),
      },
    ]);
  });

  afterAll(async () => {
    try {
      await admin.db
        .delete(organizationAudit)
        .where(inArray(organizationAudit.organizationId, organizationIds));
      await admin.db
        .delete(organizationSettings)
        .where(inArray(organizationSettings.organizationId, organizationIds));
      await admin.db
        .delete(authSchema.organization)
        .where(inArray(authSchema.organization.id, organizationIds));
      await admin.db.delete(authSchema.user).where(inArray(authSchema.user.id, userIds));
    } finally {
      await Promise.all([runtime.pool.end(), admin.pool.end()]);
    }
  });

  it('replays migrations without duplicating the journal and forces every tenant table', async () => {
    const result = await admin.pool.query<{ count: string }>(
      'SELECT count(*) FROM drizzle.__drizzle_migrations',
    );
    expect(migrationCount).toBeGreaterThan(0);
    expect(Number(result.rows[0]?.count)).toBe(migrationCount);
    const policies = await admin.pool.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid IN ('public.organization_settings'::regclass, 'public.organization_audit'::regclass, 'public.engagement'::regclass, 'public.engagement_version'::regclass, 'public.engagement_approval'::regclass)",
    );
    expect(policies.rows).toHaveLength(5);
    expect(policies.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity)).toBe(true);
  });

  it('rejects privileged application credentials and prevents the runtime from disabling RLS', async () => {
    await expect(assertRuntimeRole(runtime.pool)).resolves.toBeUndefined();
    await expect(assertRuntimeRole(admin.pool)).rejects.toThrow('runtime role');
    await expect(
      runtime.pool.query('ALTER TABLE organization_settings DISABLE ROW LEVEL SECURITY'),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('denies unscoped reads and inserts without relying on application filters', async () => {
    expect(await runtime.db.select().from(organizationSettings)).toEqual([]);
    expect(await runtime.db.select().from(organizationAudit)).toEqual([]);
    await expect(
      runtime.db.insert(organizationAudit).values({
        organizationId: organizationA,
        actorUserId: userA,
        action: 'forbidden',
        requestId: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  it('independently denies another tenant even when its context is set directly', async () => {
    await runtime.db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.tenant_id', ${organizationB}, true), set_config('app.user_id', ${userA}, true)`,
      );
      expect(await tx.select().from(organizationSettings)).toEqual([]);
      expect(await tx.select().from(organizationAudit)).toEqual([]);
    });
    await expect(
      withTenant(runtime, { organizationId: organizationB, userId: userA }, async () => {}),
    ).rejects.toBeInstanceOf(TenantAccessError);
  });

  it('scopes unfiltered reads and blocks cross-tenant update and insert', async () => {
    await withTenant(runtime, scopeA, async (tx, role) => {
      expect(role).toBe('owner');
      const settings = await tx.select().from(organizationSettings);
      expect(settings.map((row) => row.organizationId)).toEqual([organizationA]);
      const audit = await tx.select().from(organizationAudit);
      expect(audit.every((row) => row.organizationId === organizationA)).toBe(true);
      expect(
        await tx
          .update(organizationSettings)
          .set({ locale: 'fr' })
          .where(eq(organizationSettings.organizationId, organizationB))
          .returning(),
      ).toEqual([]);
    });
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx
          .insert(organizationSettings)
          .values({ organizationId: organizationB, locale: 'fr' })
          .onConflictDoUpdate({
            target: organizationSettings.organizationId,
            set: { locale: 'fr' },
          }),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });

  it('allows member reads but reserves settings writes and audit reads for administrators', async () => {
    await withTenant(
      runtime,
      { organizationId: organizationA, userId: memberA },
      async (tx, role) => {
        expect(role).toBe('member');
        expect(await tx.select().from(organizationSettings)).toHaveLength(1);
        expect(await tx.select().from(organizationAudit)).toEqual([]);
        expect(await tx.update(organizationSettings).set({ locale: 'fr' }).returning()).toEqual([]);
        await tx.insert(organizationAudit).values({
          organizationId: organizationA,
          actorUserId: memberA,
          action: 'fixture.member',
          requestId: randomUUID(),
        });
      },
    );
    await withTenant(runtime, scopeA, async (tx) => {
      const changed = await tx.update(organizationSettings).set({ locale: 'fr' }).returning();
      expect(changed[0]?.locale).toBe('fr');
      expect(
        (await tx.select().from(organizationAudit)).some((row) => row.action === 'fixture.member'),
      ).toBe(true);
    });
  });

  it('rejects audit actor forgery and runtime mutation or truncation of audit history', async () => {
    await expect(
      withTenant(runtime, scopeA, (tx) =>
        tx.insert(organizationAudit).values({
          organizationId: organizationA,
          actorUserId: userB,
          action: 'forged',
          requestId: randomUUID(),
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
    await expect(
      runtime.pool.query('UPDATE organization_audit SET action = $1 WHERE organization_id = $2', [
        'tampered',
        organizationA,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      runtime.pool.query('DELETE FROM organization_audit WHERE organization_id = $1', [
        organizationA,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(runtime.pool.query('TRUNCATE organization_audit')).rejects.toMatchObject({
      code: '42501',
    });
  });

  it('keeps concurrent tenants isolated on the same connection pool', async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        const scope = index % 2 === 0 ? scopeA : scopeB;
        return withTenant(runtime, scope, async (tx) => {
          await tx.execute(sql`SELECT pg_sleep(0.01)`);
          const rows = await tx.select().from(organizationSettings);
          expect(rows.map((row) => row.organizationId)).toEqual([scope.organizationId]);
        });
      }),
    );
  });

  it('clears tenant context after commit and rollback on the exact reused connection', async () => {
    const client = await runtime.pool.connect();
    const sameConnection = drizzle(client, { schema });
    try {
      await sameConnection.transaction(async (tx) => {
        await setTenantContext(tx, scopeA);
        expect(await tx.select().from(organizationSettings)).toHaveLength(1);
      });
      expect(
        (await client.query('SELECT organization_id FROM organization_settings')).rows,
      ).toEqual([]);
      await expect(
        sameConnection.transaction(async (tx) => {
          await setTenantContext(tx, scopeB);
          throw new Error('deliberate rollback');
        }),
      ).rejects.toThrow('deliberate rollback');
      expect(
        (await client.query('SELECT organization_id FROM organization_settings')).rows,
      ).toEqual([]);
    } finally {
      client.release();
    }
  });

  it('locks membership during an operation and rejects access after revocation', async () => {
    await runtime.db.transaction(async (tx) => {
      await setTenantContext(tx, { organizationId: organizationA, userId: memberA });
      await expect(
        admin.db.transaction(async (revocation) => {
          await revocation.execute(sql`SET LOCAL lock_timeout = '100ms'`);
          await revocation.delete(authSchema.member).where(eq(authSchema.member.userId, memberA));
        }),
      ).rejects.toMatchObject({ cause: { code: '55P03' } });
      expect(await tx.select().from(organizationSettings)).toHaveLength(1);
    });
    await admin.db.delete(authSchema.member).where(eq(authSchema.member.userId, memberA));
    await expect(
      withTenant(runtime, { organizationId: organizationA, userId: memberA }, async () => {}),
    ).rejects.toBeInstanceOf(TenantAccessError);
  });
});
