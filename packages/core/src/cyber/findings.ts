import { cyberRetestInputSchema, cyberReviewSchema, cyberTaskInputSchema } from '@bump/contracts';
import {
  cyberAudit,
  cyberEvent,
  cyberFinding,
  cyberObservation,
  cyberRetest,
  cyberScan,
  cyberTask,
  type Database,
  executionJob,
} from '@bump/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  CyberError,
  type CyberMutation,
  type CyberScope,
  cyberEventIn,
  requireCyberRole,
  withCyber,
} from './context.js';
import { compareCyberCoverage } from './policy.js';
export async function reviewCyberFinding(
  database: Database,
  scope: CyberMutation,
  id: string,
  input: unknown,
) {
  const data = cyberReviewSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'reviewer']);
    const [finding] = await tx
      .select()
      .from(cyberFinding)
      .where(and(eq(cyberFinding.id, id), eq(cyberFinding.organizationId, scope.organizationId)))
      .for('update');
    if (!finding) throw new CyberError(404, 'finding_not_found');
    if (data.status === 'verified_fixed') throw new CyberError(409, 'verified_retest_required');
    if (
      data.status === 'closed' &&
      !['false_positive', 'verified_fixed', 'accepted_risk'].includes(finding.status)
    )
      throw new CyberError(409, 'closure_requires_resolution');
    const { note, ...patch } = data;
    const [updated] = await tx
      .update(cyberFinding)
      .set({ ...patch, reviewedBy: scope.userId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(cyberFinding.id, id))
      .returning();
    await cyberEventIn(tx, scope, `finding.${data.status}`, id, finding.clientId, note);
    return updated;
  });
}
export async function createCyberTask(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberTaskInputSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'analyst']);
    const [f] = await tx
      .select()
      .from(cyberFinding)
      .where(
        and(
          eq(cyberFinding.id, data.findingId),
          eq(cyberFinding.organizationId, scope.organizationId),
        ),
      );
    if (!f || !['confirmed', 'planned', 'in_progress', 'to_retest'].includes(f.status))
      throw new CyberError(409, 'confirmed_finding_required');
    const [v] = await tx
      .insert(cyberTask)
      .values({
        ...data,
        dueAt: new Date(data.dueAt),
        clientId: f.clientId,
        organizationId: scope.organizationId,
      })
      .returning();
    await cyberEventIn(tx, scope, 'remediation.assigned', data.findingId, f.clientId);
    return v;
  });
}
export async function recordCyberRetest(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberRetestInputSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'reviewer', 'consultant']);
    const [finding] = await tx
      .select()
      .from(cyberFinding)
      .where(
        and(
          eq(cyberFinding.id, data.findingId),
          eq(cyberFinding.organizationId, scope.organizationId),
        ),
      )
      .for('update');
    if (!finding) throw new CyberError(404, 'finding_not_found');
    const scans = await tx
      .select({ scan: cyberScan, status: executionJob.status })
      .from(cyberScan)
      .innerJoin(executionJob, eq(executionJob.id, cyberScan.executionJobId))
      .where(
        and(
          eq(cyberScan.organizationId, scope.organizationId),
          eq(cyberScan.clientId, finding.clientId),
          eq(cyberScan.auditId, data.auditId),
          eq(cyberScan.assetId, finding.assetId),
        ),
      );
    const initialScans = await tx
      .select()
      .from(cyberScan)
      .where(
        and(
          eq(cyberScan.organizationId, scope.organizationId),
          eq(cyberScan.auditId, finding.firstAuditId),
          eq(cyberScan.assetId, finding.assetId),
        ),
      );
    if (
      !scans.length ||
      scans.some((s) => s.status !== 'succeeded') ||
      !scans.some(
        (s) =>
          s.scan.engine === finding.observation.engine &&
          s.scan.engineVersion === finding.observation.engineVersion &&
          s.scan.coverageHash &&
          initialScans.some(
            (initial) =>
              initial.engine === s.scan.engine &&
              initial.engineVersion === s.scan.engineVersion &&
              initial.coverageHash === s.scan.coverageHash,
          ),
      )
    )
      throw new CyberError(409, 'comparable_completed_coverage_required');
    const [latestPositive] = await tx
      .select({ createdAt: cyberObservation.createdAt })
      .from(cyberObservation)
      .where(
        and(
          eq(cyberObservation.organizationId, scope.organizationId),
          eq(cyberObservation.findingId, finding.id),
        ),
      )
      .orderBy(desc(cyberObservation.createdAt))
      .limit(1);
    if (
      data.conclusion === 'absent' &&
      (!latestPositive || scans.some((s) => s.scan.createdAt <= latestPositive.createdAt))
    )
      throw new CyberError(409, 'retest_predates_latest_detection');
    const observed = await tx
      .select()
      .from(cyberObservation)
      .where(
        and(
          eq(cyberObservation.organizationId, scope.organizationId),
          eq(cyberObservation.auditId, data.auditId),
          eq(cyberObservation.fingerprint, finding.fingerprint),
        ),
      );
    if (
      (data.conclusion === 'absent' && observed.length) ||
      (data.conclusion === 'present' && !observed.length)
    )
      throw new CyberError(409, 'retest_evidence_conflict');
    const [v] = await tx
      .insert(cyberRetest)
      .values({
        ...data,
        clientId: finding.clientId,
        organizationId: scope.organizationId,
        reviewerId: scope.userId,
      })
      .returning();
    if (data.conclusion !== 'inconclusive')
      await tx
        .update(cyberFinding)
        .set({
          status: data.conclusion === 'absent' ? 'verified_fixed' : 'confirmed',
          reviewedAt: new Date(),
          reviewedBy: scope.userId,
          updatedAt: new Date(),
        })
        .where(eq(cyberFinding.id, finding.id));
    await cyberEventIn(
      tx,
      scope,
      `retest.${data.conclusion}`,
      finding.id,
      finding.clientId,
      data.note,
    );
    return v;
  });
}
export async function compareCyberAudits(
  database: Database,
  scope: CyberScope,
  beforeId: string,
  afterId: string,
) {
  return withCyber(database, scope, async (tx) => {
    const audits = await tx
      .select()
      .from(cyberAudit)
      .where(
        and(
          eq(cyberAudit.organizationId, scope.organizationId),
          inArray(cyberAudit.id, [beforeId, afterId]),
        ),
      );
    if (audits.length !== 2 || audits[0]?.clientId !== audits[1]?.clientId)
      throw new CyberError(403, 'same_client_audits_required');
    const scans = await tx
      .select({ scan: cyberScan, status: executionJob.status })
      .from(cyberScan)
      .innerJoin(executionJob, eq(executionJob.id, cyberScan.executionJobId))
      .where(
        and(
          eq(cyberScan.organizationId, scope.organizationId),
          inArray(cyberScan.auditId, [beforeId, afterId]),
        ),
      );
    const observations = await tx
      .select()
      .from(cyberObservation)
      .where(
        and(
          eq(cyberObservation.organizationId, scope.organizationId),
          inArray(cyberObservation.auditId, [beforeId, afterId]),
        ),
      );
    const coverage = (id: string) =>
      scans
        .filter((s) => s.scan.auditId === id && s.status === 'succeeded')
        .map(
          (s) =>
            `${s.scan.assetId}:${s.scan.engine}:${s.scan.engineVersion}:${s.scan.coverageHash}`,
        );
    return {
      ...compareCyberCoverage(
        coverage(beforeId),
        coverage(afterId),
        observations.filter((o) => o.auditId === beforeId).map((o) => o.fingerprint),
        observations.filter((o) => o.auditId === afterId).map((o) => o.fingerprint),
      ),
      incomplete: scans.some((s) => s.status !== 'succeeded'),
      interpretation:
        'Not observed is not proof of remediation. Compare completed test coverage and human-validated retests.',
    };
  });
}
export async function readCyberFinding(database: Database, scope: CyberScope, id: string) {
  return withCyber(database, scope, async (tx) => {
    const [finding] = await tx
      .select()
      .from(cyberFinding)
      .where(and(eq(cyberFinding.organizationId, scope.organizationId), eq(cyberFinding.id, id)));
    if (!finding) throw new CyberError(404, 'finding_not_found');
    const observations = await tx
      .select()
      .from(cyberObservation)
      .where(
        and(
          eq(cyberObservation.organizationId, scope.organizationId),
          eq(cyberObservation.findingId, id),
        ),
      )
      .orderBy(desc(cyberObservation.createdAt))
      .limit(100);
    const history = await tx
      .select()
      .from(cyberEvent)
      .where(and(eq(cyberEvent.organizationId, scope.organizationId), eq(cyberEvent.targetId, id)))
      .orderBy(desc(cyberEvent.createdAt))
      .limit(100);
    return { finding, observations, history };
  });
}
