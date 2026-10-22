import { randomUUID } from 'node:crypto';
import {
  engagementActionSchema,
  engagementRevisionInputSchema,
  engagementTargetSchema,
} from '@bump/contracts';
import {
  authSchema,
  type Database,
  engagement,
  engagementApproval,
  engagementVersion,
  organizationAudit,
  type TenantRole,
  type Transaction,
  withTenant,
} from '@bump/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authorizationDigest, evaluateEngagementPolicy } from './policy.js';

const scopeSchema = z.strictObject({ organizationId: z.uuid(), userId: z.uuid() });
const selectedSchema = scopeSchema.extend({ engagementId: z.uuid() });
const revisionSchema = z.number().int().min(1).max(2_147_483_646);
const mutationSchema = selectedSchema.extend({
  expectedRevision: revisionSchema,
  requestId: z.uuid(),
});
type Scope = z.infer<typeof scopeSchema>;
type Selected = z.infer<typeof selectedSchema>;
type Mutation = z.infer<typeof mutationSchema>;

export class EngagementError extends Error {
  constructor(public readonly statusCode: 403 | 404 | 409) {
    super('Engagement request denied');
  }
}

function adminOnly(role: TenantRole) {
  if (role !== 'owner' && role !== 'admin') throw new EngagementError(403);
}

function headCondition(scope: Selected) {
  return and(
    eq(engagement.organizationId, scope.organizationId),
    eq(engagement.id, scope.engagementId),
  );
}

async function headFor(tx: Transaction, scope: Selected) {
  // Row-locking SELECT also applies UPDATE RLS, hiding member-readable/revoked heads.
  // All service operations instead serialize on the same transaction advisory lock.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope.engagementId}, 2))`);
  const [head] = await tx.select().from(engagement).where(headCondition(scope));
  if (!head) throw new EngagementError(404);
  return head;
}

function currentRevision(head: typeof engagement.$inferSelect, expectedRevision: number) {
  if (head.currentRevision !== expectedRevision) throw new EngagementError(409);
}

async function currentVersion(tx: Transaction, scope: Selected, revision: number) {
  const [version] = await tx
    .select()
    .from(engagementVersion)
    .where(
      and(
        eq(engagementVersion.organizationId, scope.organizationId),
        eq(engagementVersion.engagementId, scope.engagementId),
        eq(engagementVersion.revision, revision),
      ),
    );
  if (!version) throw new EngagementError(409);
  return version;
}

async function record(tx: Transaction, scope: Selected, requestId: string, action: string) {
  await tx.insert(organizationAudit).values({
    organizationId: scope.organizationId,
    actorUserId: scope.userId,
    requestId,
    action,
    targetId: scope.engagementId,
  });
}

async function insertVersion(tx: Transaction, scope: Selected, revision: number, input: unknown) {
  const data = engagementRevisionInputSchema.parse(input);
  const [responsible] = await tx
    .select({ role: authSchema.member.role })
    .from(authSchema.member)
    .where(
      and(
        eq(authSchema.member.organizationId, scope.organizationId),
        eq(authSchema.member.userId, data.responsibleUserId),
      ),
    )
    .for('share');
  if (!responsible || !['owner', 'admin', 'member'].includes(responsible.role))
    throw new EngagementError(403);
  const [version] = await tx
    .insert(engagementVersion)
    .values({
      ...data,
      organizationId: scope.organizationId,
      engagementId: scope.engagementId,
      revision,
      createdBy: scope.userId,
      authorizationSha256: authorizationDigest(data.authorizationText),
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
    })
    .returning();
  if (!version) throw new EngagementError(409);
  return version;
}

export async function createEngagement(
  database: Database,
  input: Scope & { requestId: string; revision: unknown },
) {
  const parsed = scopeSchema
    .extend({ requestId: z.uuid(), revision: engagementRevisionInputSchema })
    .parse(input);
  return withTenant(database, parsed, async (tx, role) => {
    adminOnly(role);
    const engagementId = randomUUID();
    const [head] = await tx
      .insert(engagement)
      .values({
        id: engagementId,
        organizationId: parsed.organizationId,
        createdBy: parsed.userId,
        currentRevision: 1,
      })
      .returning();
    if (!head) throw new EngagementError(409);
    const selected = { ...parsed, engagementId };
    const version = await insertVersion(tx, selected, 1, parsed.revision);
    await record(tx, selected, parsed.requestId, 'engagement.created');
    return { ...head, version };
  });
}

export async function amendEngagement(database: Database, input: Mutation & { revision: unknown }) {
  const parsed = mutationSchema.extend({ revision: engagementRevisionInputSchema }).parse(input);
  return withTenant(database, parsed, async (tx, role) => {
    adminOnly(role);
    const head = await headFor(tx, parsed);
    currentRevision(head, parsed.expectedRevision);
    if (head.revokedAt) throw new EngagementError(409);
    const revision = head.currentRevision + 1;
    const version = await insertVersion(tx, parsed, revision, parsed.revision);
    const [updated] = await tx
      .update(engagement)
      .set({ currentRevision: revision })
      .where(and(headCondition(parsed), eq(engagement.currentRevision, parsed.expectedRevision)))
      .returning({ id: engagement.id });
    if (!updated) throw new EngagementError(409);
    await record(tx, parsed, parsed.requestId, 'engagement.amended');
    return { ...head, currentRevision: revision, version };
  });
}

export async function approveEngagement(
  database: Database,
  input: Mutation & { authorizationSha256: string },
) {
  const parsed = mutationSchema
    .extend({ authorizationSha256: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(input);
  return withTenant(database, parsed, async (tx, role) => {
    if (role !== 'owner') throw new EngagementError(403);
    const head = await headFor(tx, parsed);
    currentRevision(head, parsed.expectedRevision);
    if (head.revokedAt) throw new EngagementError(409);
    const version = await currentVersion(tx, parsed, head.currentRevision);
    if (
      version.authorizationSha256 !== parsed.authorizationSha256 ||
      authorizationDigest(version.authorizationText) !== version.authorizationSha256
    )
      throw new EngagementError(409);
    const [existing] = await tx
      .select({ id: engagementApproval.id })
      .from(engagementApproval)
      .where(
        and(
          eq(engagementApproval.organizationId, parsed.organizationId),
          eq(engagementApproval.engagementId, parsed.engagementId),
          eq(engagementApproval.revision, head.currentRevision),
        ),
      );
    if (existing) throw new EngagementError(409);
    const [approval] = await tx
      .insert(engagementApproval)
      .values({
        organizationId: parsed.organizationId,
        engagementId: parsed.engagementId,
        revision: head.currentRevision,
        approverUserId: parsed.userId,
      })
      .returning();
    if (!approval) throw new EngagementError(409);
    await record(tx, parsed, parsed.requestId, 'engagement.approved');
    return approval;
  });
}

export async function revokeEngagement(database: Database, input: Mutation & { reason: string }) {
  const parsed = mutationSchema
    .extend({ reason: z.string().trim().min(1).max(2_000) })
    .parse(input);
  return withTenant(database, parsed, async (tx, role) => {
    adminOnly(role);
    const head = await headFor(tx, parsed);
    currentRevision(head, parsed.expectedRevision);
    if (head.revokedAt) return head;
    const [revoked] = await tx
      .update(engagement)
      .set({ revokedAt: new Date(), revokedBy: parsed.userId, revocationReason: parsed.reason })
      .where(headCondition(parsed))
      .returning();
    if (!revoked) throw new EngagementError(409);
    await record(tx, parsed, parsed.requestId, 'engagement.revoked');
    return revoked;
  });
}

export async function listEngagements(database: Database, input: Scope) {
  const scope = scopeSchema.parse(input);
  return withTenant(database, scope, (tx) =>
    tx
      .select()
      .from(engagement)
      .where(eq(engagement.organizationId, scope.organizationId))
      .orderBy(desc(engagement.createdAt))
      .limit(100),
  );
}

export async function readEngagement(database: Database, input: Selected) {
  const scope = selectedSchema.parse(input);
  return withTenant(database, scope, async (tx) => {
    const head = await headFor(tx, scope);
    const versions = await tx
      .select()
      .from(engagementVersion)
      .where(
        and(
          eq(engagementVersion.organizationId, scope.organizationId),
          eq(engagementVersion.engagementId, scope.engagementId),
        ),
      )
      .orderBy(desc(engagementVersion.revision))
      .limit(50);
    const approvals = await tx
      .select()
      .from(engagementApproval)
      .where(
        and(
          eq(engagementApproval.organizationId, scope.organizationId),
          eq(engagementApproval.engagementId, scope.engagementId),
        ),
      )
      .orderBy(desc(engagementApproval.revision))
      .limit(50);
    return { ...head, versions, approvals };
  });
}

export async function readEngagementVersion(
  database: Database,
  input: Selected & { revision: number },
) {
  const scope = selectedSchema.extend({ revision: revisionSchema }).parse(input);
  return withTenant(database, scope, async (tx) => {
    const head = await headFor(tx, scope);
    if (scope.revision > head.currentRevision) throw new EngagementError(404);
    const version = await currentVersion(tx, scope, scope.revision);
    const [approval] = await tx
      .select()
      .from(engagementApproval)
      .where(
        and(
          eq(engagementApproval.organizationId, scope.organizationId),
          eq(engagementApproval.engagementId, scope.engagementId),
          eq(engagementApproval.revision, scope.revision),
        ),
      );
    return { version, approval: approval ?? null };
  });
}

const authorizeSchema = selectedSchema.extend({
  expectedRevision: revisionSchema,
  target: engagementTargetSchema,
  action: engagementActionSchema,
});
export type AuthorizeEngagementInput = z.infer<typeof authorizeSchema>;

// This decision is a snapshot, not a reusable permit. Future executors must call at execution time.
export async function authorizeEngagement(database: Database, input: AuthorizeEngagementInput) {
  const parsed = authorizeSchema.parse(input);
  return withTenant(database, parsed, async (tx) => {
    const head = await headFor(tx, parsed);
    const version = await currentVersion(tx, parsed, head.currentRevision);
    const metadata = () => ({
      revision: head.currentRevision,
      evaluatedAt: new Date(),
      validUntil: version.validUntil,
    });
    const deny = (reason: string) => ({ allowed: false as const, reason, ...metadata() });
    if (head.currentRevision !== parsed.expectedRevision) return deny('revision_conflict');
    if (head.revokedAt) return deny('revoked');
    const [approval] = await tx
      .select()
      .from(engagementApproval)
      .where(
        and(
          eq(engagementApproval.organizationId, parsed.organizationId),
          eq(engagementApproval.engagementId, parsed.engagementId),
          eq(engagementApproval.revision, head.currentRevision),
        ),
      );
    if (!approval) return deny('not_approved');
    const [approver] = await tx
      .select({ role: authSchema.member.role })
      .from(authSchema.member)
      .where(
        and(
          eq(authSchema.member.organizationId, parsed.organizationId),
          eq(authSchema.member.userId, approval.approverUserId),
        ),
      )
      .for('share');
    if (approver?.role !== 'owner') return deny('approver_not_authorized');
    const evaluated = metadata();
    const decision = evaluateEngagementPolicy(
      {
        scope: version.scope,
        responsibleUserId: version.responsibleUserId,
        actorUserId: parsed.userId,
        validFrom: version.validFrom,
        validUntil: version.validUntil,
        authorizationText: version.authorizationText,
        authorizationSha256: version.authorizationSha256,
        target: parsed.target,
        action: parsed.action,
      },
      evaluated.evaluatedAt,
    );
    return { ...decision, ...evaluated };
  });
}
