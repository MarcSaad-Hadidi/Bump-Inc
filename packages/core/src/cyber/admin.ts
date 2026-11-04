import { randomUUID } from 'node:crypto';
import { cyberRoleSchema } from '@bump/contracts';
import { cyberEvidence, cyberRole, cyberSource, type Database } from '@bump/db';
import { and, eq, sql } from 'drizzle-orm';
import {
  CyberError,
  type CyberMutation,
  cyberEventIn,
  requireCyberRole,
  withCyber,
} from './context.js';
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
    const members = await tx.execute<{ n: number }>(
      sql`select count(*)::int as n from member where organization_id=${scope.organizationId} and user_id=${userId}`,
    );
    if (members.rows[0]?.n !== 1) throw new CyberError(403, 'current_member_required');
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
