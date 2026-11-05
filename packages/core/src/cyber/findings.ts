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
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import {
  CyberError,
  type CyberMutation,
  type CyberScope,
  cyberEventIn,
  requireCyberRole,
  withCyber,
} from './context.js';
import { compareCyberCoverage, conflictsWithAbsentCyberRetest } from './policy.js';
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
      )
      .for('update');
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
export async function updateCyberTask(
  database: Database,
  scope: CyberMutation,
  id: string,
  input: unknown,
) {
  const data = z
    .strictObject({
      status: z.enum(['planned', 'in_progress', 'to_retest']),
      note: z.string().trim().min(1).max(4000),
    })
    .parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'analyst']);
    // This reference read must stay unlocked: retests lock finding then tasks.
    // Recheck the task association after taking the same finding-first locks.
    const [reference] = await tx
      .select({ findingId: cyberTask.findingId, clientId: cyberTask.clientId })
      .from(cyberTask)
      .where(and(eq(cyberTask.organizationId, scope.organizationId), eq(cyberTask.id, id)));
    if (!reference) throw new CyberError(404, 'task_not_found');
    const [finding] = await tx
      .select()
      .from(cyberFinding)
      .where(
        and(
          eq(cyberFinding.organizationId, scope.organizationId),
          eq(cyberFinding.id, reference.findingId),
          eq(cyberFinding.clientId, reference.clientId),
        ),
      )
      .for('update');
    if (!finding) throw new CyberError(409, 'confirmed_finding_required');
    const [task] = await tx
      .select()
      .from(cyberTask)
      .where(
        and(
          eq(cyberTask.organizationId, scope.organizationId),
          eq(cyberTask.id, id),
          eq(cyberTask.findingId, finding.id),
          eq(cyberTask.clientId, finding.clientId),
        ),
      )
      .for('update');
    if (!task) throw new CyberError(404, 'task_not_found');
    if (!['confirmed', 'planned', 'in_progress', 'to_retest'].includes(finding.status))
      throw new CyberError(409, 'confirmed_finding_required');
    const [updated] = await tx
      .update(cyberTask)
      .set({ status: data.status })
      .where(eq(cyberTask.id, id))
      .returning();
    await cyberEventIn(
      tx,
      scope,
      `remediation.${data.status}`,
      task.findingId,
      task.clientId,
      data.note,
    );
    return updated;
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
    if (!scans.length || scans.some((s) => ['queued', 'running', 'retry_wait'].includes(s.status)))
      throw new CyberError(409, 'completed_asset_audit_required');
    if (data.conclusion !== 'inconclusive') {
      if (!scans.length || scans.some((s) => s.status !== 'succeeded'))
        throw new CyberError(409, 'comparable_completed_coverage_required');
      // Choose the latest verified native positive before comparing the retest.
      // Filtering by its version, coverage or date first could reuse an old baseline.
      const positiveScan = alias(cyberScan, 'positive_native_scan');
      const [baseline] = await tx
        .select({
          engine: positiveScan.engine,
          engineVersion: positiveScan.engineVersion,
          coverageHash: positiveScan.coverageHash,
          scanCreatedAt: positiveScan.createdAt,
          observedAt: cyberObservation.createdAt,
        })
        .from(cyberObservation)
        .innerJoin(
          positiveScan,
          and(
            eq(positiveScan.id, cyberObservation.scanId),
            eq(positiveScan.organizationId, cyberObservation.organizationId),
            eq(positiveScan.clientId, cyberObservation.clientId),
            eq(positiveScan.assetId, cyberObservation.assetId),
            eq(positiveScan.auditId, cyberObservation.auditId),
          ),
        )
        .innerJoin(
          executionJob,
          and(
            eq(executionJob.id, positiveScan.executionJobId),
            eq(executionJob.organizationId, positiveScan.organizationId),
            eq(executionJob.status, 'succeeded'),
          ),
        )
        .where(
          and(
            eq(cyberObservation.organizationId, scope.organizationId),
            eq(cyberObservation.clientId, finding.clientId),
            eq(cyberObservation.assetId, finding.assetId),
            eq(cyberObservation.findingId, finding.id),
            inArray(positiveScan.engine, ['semgrep', 'trivy', 'gitleaks', 'web-passive']),
            eq(positiveScan.engine, sql<string>`${cyberObservation.data}->>'engine'`),
            eq(positiveScan.engineVersion, sql<string>`${cyberObservation.data}->>'engineVersion'`),
            ne(positiveScan.coverageHash, ''),
          ),
        )
        .orderBy(desc(cyberObservation.createdAt), desc(cyberObservation.id))
        .limit(1);
      if (
        !baseline?.coverageHash ||
        !scans.some(
          ({ scan }) =>
            scan.engine === baseline.engine &&
            scan.engineVersion === baseline.engineVersion &&
            scan.coverageHash === baseline.coverageHash &&
            scan.createdAt > baseline.scanCreatedAt &&
            scan.createdAt > baseline.observedAt,
        )
      )
        throw new CyberError(409, 'comparable_completed_coverage_required');
    }
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
    const observationScope = and(
      eq(cyberObservation.organizationId, scope.organizationId),
      eq(cyberObservation.clientId, finding.clientId),
      eq(cyberObservation.auditId, data.auditId),
      eq(cyberObservation.assetId, finding.assetId),
    );
    if (data.conclusion === 'absent') {
      // At most six engines with 1,000 observations each for this audit/asset.
      const candidates = await tx
        .select({ fingerprint: cyberObservation.fingerprint, data: cyberObservation.data })
        .from(cyberObservation)
        .where(observationScope)
        .limit(6001);
      if (candidates.length > 6000) throw new CyberError(409, 'retest_observation_limit');
      if (candidates.some((candidate) => conflictsWithAbsentCyberRetest(finding, candidate)))
        throw new CyberError(409, 'retest_evidence_conflict');
    } else if (data.conclusion === 'present') {
      const observed = await tx
        .select({ id: cyberObservation.id })
        .from(cyberObservation)
        .where(and(observationScope, eq(cyberObservation.fingerprint, finding.fingerprint)))
        .limit(1);
      if (!observed.length) throw new CyberError(409, 'retest_evidence_conflict');
    }
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
    if (data.conclusion === 'absent')
      await tx
        .update(cyberTask)
        .set({ status: 'verified_fixed' })
        .where(
          and(
            eq(cyberTask.organizationId, scope.organizationId),
            eq(cyberTask.findingId, finding.id),
          ),
        );
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
