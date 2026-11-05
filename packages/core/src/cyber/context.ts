import { createHash } from 'node:crypto';
import { type CyberRole, cyberRoleSchema } from '@bump/contracts';
import {
  cyberClient,
  cyberEvent,
  cyberRole,
  type Database,
  type TenantRole,
  type Transaction,
  withTenant,
} from '@bump/db';
import { and, eq } from 'drizzle-orm';

export type CyberScope = { organizationId: string; userId: string };
export type CyberMutation = CyberScope & { requestId: string };
export class CyberError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 503,
    public readonly code: string,
  ) {
    super(code);
  }
}
export const hashCyber = (v: string) => createHash('sha256').update(v).digest('hex');
export function requireCyberRole(role: CyberRole, allowed: CyberRole[]) {
  if (!allowed.includes(role)) throw new CyberError(403, 'cyber_permission_denied');
}
export async function withCyber<T>(
  database: Database,
  scope: CyberScope,
  run: (tx: Transaction, role: CyberRole) => Promise<T>,
): Promise<T> {
  return withTenant(database, scope, async (tx, tenantRole: TenantRole) => {
    const [assigned] = await tx
      .select()
      .from(cyberRole)
      .where(
        and(eq(cyberRole.organizationId, scope.organizationId), eq(cyberRole.userId, scope.userId)),
      );
    const role: CyberRole =
      tenantRole === 'owner' || tenantRole === 'admin'
        ? 'admin'
        : cyberRoleSchema.parse(assigned?.role ?? 'analyst');
    return run(tx, role);
  });
}
export async function cyberEventIn(
  tx: Transaction,
  scope: CyberScope,
  action: string,
  targetId: string,
  clientId: string | null,
  detail = '',
) {
  await tx.insert(cyberEvent).values({
    organizationId: scope.organizationId,
    actorId: scope.userId,
    action,
    targetId,
    clientId,
    detail,
  });
}
export const clientWhere = (scope: CyberScope, id: string) =>
  and(eq(cyberClient.organizationId, scope.organizationId), eq(cyberClient.id, id));
export async function clientFor(tx: Transaction, scope: CyberScope, id: string) {
  const [v] = await tx.select().from(cyberClient).where(clientWhere(scope, id));
  if (!v) throw new CyberError(404, 'client_not_found');
  return v;
}
