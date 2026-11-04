import { and, eq, sql } from 'drizzle-orm';
import { member } from './auth-schema.js';
import type { Database } from './index.js';

export type Transaction = Parameters<Parameters<Database['db']['transaction']>[0]>[0];
export type TenantRole = 'owner' | 'admin' | 'member';
type TenantScope = { organizationId: string; userId: string };

export class TenantAccessError extends Error {
  readonly statusCode = 403;

  constructor() {
    super('Organization access denied');
    this.name = 'TenantAccessError';
  }
}

export async function setTenantContext(tx: Transaction, scope: TenantScope): Promise<TenantRole> {
  const [membership] = await tx
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, scope.organizationId), eq(member.userId, scope.userId)))
    .for('share');
  if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
    throw new TenantAccessError();
  }
  // The shared row lock prevents membership revocation until this transaction finishes.
  await tx.execute(
    sql`SELECT set_config('app.tenant_id', ${scope.organizationId}, true), set_config('app.user_id', ${scope.userId}, true)`,
  );
  return membership.role as TenantRole;
}

export async function withTenant<T>(
  database: Database,
  scope: TenantScope,
  callback: (tx: Transaction, role: TenantRole) => Promise<T>,
): Promise<T> {
  return database.db.transaction(async (tx) => callback(tx, await setTenantContext(tx, scope)));
}

export async function assertRuntimeRole(pool: Database['pool']): Promise<void> {
  const result = await pool.query<{ unsafe: boolean }>(`
    SELECT r.rolsuper OR r.rolbypassrls OR r.rolcreaterole
      OR EXISTS (
        SELECT 1 FROM pg_class c
        WHERE c.oid IN (
          'public.organization_settings'::regclass, 'public.organization_audit'::regclass,
          'public.engagement'::regclass, 'public.engagement_version'::regclass,
          'public.engagement_approval'::regclass,
          'public.execution_job'::regclass, 'public.execution_event'::regclass,
          'public.execution_attempt'::regclass, 'public.execution_control'::regclass,
          'public.execution_outbox'::regclass,
          'public.audit_import'::regclass, 'public.audit_import_request'::regclass,
          'public.audit_observation'::regclass,
          to_regclass('public.cyber_client'), to_regclass('public.cyber_asset'),
          to_regclass('public.cyber_source'), to_regclass('public.cyber_evidence'),
          to_regclass('public.cyber_mandate'), to_regclass('public.cyber_audit'),
          to_regclass('public.cyber_scan'), to_regclass('public.cyber_finding'),
          to_regclass('public.cyber_observation'), to_regclass('public.cyber_event'),
          to_regclass('public.cyber_role'), to_regclass('public.cyber_report'),
          to_regclass('public.cyber_task'), to_regclass('public.cyber_retest')
        )
          AND pg_has_role(current_user, c.relowner, 'MEMBER')
      )
      OR EXISTS (
        SELECT 1 FROM pg_roles privileged
        WHERE (privileged.rolsuper OR privileged.rolbypassrls OR privileged.rolcreaterole)
          AND pg_has_role(current_user, privileged.oid, 'MEMBER')
      ) AS unsafe
    FROM pg_roles r WHERE r.rolname = current_user
  `);
  if (result.rows.length !== 1 || result.rows[0]?.unsafe !== false) {
    throw new Error('Database runtime role must not own tenant tables or hold elevated privileges');
  }
}
