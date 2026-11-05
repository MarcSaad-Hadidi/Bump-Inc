import { randomUUID } from 'node:crypto';
import { cyberRoleSchema } from '@bump/contracts';
import { authSchema, cyberEvidence, cyberRole, cyberSource, type Database } from '@bump/db';
import { and, eq, sql } from 'drizzle-orm';
import {
  CyberError,
  type CyberMutation,
  type CyberScope,
  cyberEventIn,
  requireCyberRole,
  withCyber,
} from './context.js';
export async function readCyberRoles(database: Database, scope: CyberScope) {
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin']);
    const rows = await tx
      .select({
        userId: authSchema.member.userId,
        tenantRole: authSchema.member.role,
        cyberRole: cyberRole.role,
      })
      .from(authSchema.member)
      .leftJoin(
        cyberRole,
        and(
          eq(cyberRole.organizationId, authSchema.member.organizationId),
          eq(cyberRole.userId, authSchema.member.userId),
        ),
      )
      .where(eq(authSchema.member.organizationId, scope.organizationId))
      .limit(100);
    return rows.map((r) => ({
      userId: r.userId,
      role: ['owner', 'admin'].includes(r.tenantRole) ? 'admin' : (r.cyberRole ?? 'analyst'),
    }));
  });
}
export async function purgeCyberArtifacts(database: Database, scope: CyberMutation) {
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin']);
    const evidence = await tx
      .update(cyberEvidence)
      .set({ ciphertext: '', purgedAt: new Date() })
      .where(
        and(
          eq(cyberEvidence.organizationId, scope.organizationId),
          sql`${cyberEvidence.purgedAt} IS NULL`,
          sql`${cyberEvidence.expiresAt}<=clock_timestamp()`,
        ),
      )
      .returning({ id: cyberEvidence.id });
    const sources = await tx
      .update(cyberSource)
      .set({ ciphertext: '', purgedAt: new Date() })
      .where(
        and(
          eq(cyberSource.organizationId, scope.organizationId),
          sql`${cyberSource.purgedAt} IS NULL`,
          sql`${cyberSource.expiresAt}<=clock_timestamp()`,
        ),
      )
      .returning({ id: cyberSource.id });
    await cyberEventIn(
      tx,
      scope,
      'retention.purged',
      randomUUID(),
      null,
      `${evidence.length} evidence; ${sources.length} sources`,
    );
    return { evidence: evidence.length, sources: sources.length };
  });
}
export async function assignCyberRole(
  database: Database,
  scope: CyberMutation,
  userId: string,
  input: unknown,
) {
  const role = cyberRoleSchema.parse(input);
  return withCyber(database, scope, async (tx, actorRole) => {
    requireCyberRole(actorRole, ['admin']);
    // Tenant transactions hold the actor's membership FOR SHARE. Serialize a
    // grant/revocation with those transactions, including the default analyst
    // case where no cyber_role row exists to lock yet.
    const memberWhere = and(
      eq(authSchema.member.organizationId, scope.organizationId),
      eq(authSchema.member.userId, userId),
    );
    const [target] = await tx
      .select({ id: authSchema.member.id })
      .from(authSchema.member)
      .where(and(memberWhere, eq(authSchema.member.role, 'member')))
      .for('update');
    if (!target) {
      const [inherited] = await tx
        .select({ id: authSchema.member.id })
        .from(authSchema.member)
        .where(memberWhere);
      throw new CyberError(403, inherited ? 'inherited_admin_role' : 'current_member_required');
    }
    const [existing] = await tx
      .select()
      .from(cyberRole)
      .where(and(eq(cyberRole.organizationId, scope.organizationId), eq(cyberRole.userId, userId)));
    if (existing) await tx.update(cyberRole).set({ role }).where(eq(cyberRole.id, existing.id));
    else await tx.insert(cyberRole).values({ organizationId: scope.organizationId, userId, role });
    await cyberEventIn(tx, scope, 'role.assigned', userId, null, role);
    return { userId, role };
  });
}
