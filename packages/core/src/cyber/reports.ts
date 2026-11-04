import { randomUUID } from 'node:crypto';
import {
  type CyberReportSnapshot,
  cyberReportInputSchema,
  cyberReportSnapshotSchema,
} from '@bump/contracts';
import {
  authSchema,
  cyberAsset,
  cyberAudit,
  cyberClient,
  cyberFinding,
  cyberMandate,
  cyberObservation,
  cyberReport,
  cyberRetest,
  cyberScan,
  cyberSource,
  cyberTask,
  type Database,
  engagementVersion,
  executionJob,
} from '@bump/db';
import { and, eq, inArray } from 'drizzle-orm';
import {
  CyberError,
  type CyberMutation,
  type CyberScope,
  cyberEventIn,
  hashCyber,
  requireCyberRole,
  withCyber,
} from './context.js';
import { prioritizeCyber } from './policy.js';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
export function cyberReportDigest(snapshot: CyberReportSnapshot) {
  return hashCyber(JSON.stringify(stable(cyberReportSnapshotSchema.parse(snapshot))));
}
export async function createCyberReport(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberReportInputSchema.parse(input);
  return withCyber(
    database,
    scope,
    async (tx, role) => {
      requireCyberRole(role, ['admin', 'consultant', 'reviewer']);
      const [head] = await tx
        .select({
          audit: cyberAudit,
          client: cyberClient,
          mandate: cyberMandate,
          version: engagementVersion,
        })
        .from(cyberAudit)
        .innerJoin(cyberClient, eq(cyberClient.id, cyberAudit.clientId))
        .innerJoin(cyberMandate, eq(cyberMandate.id, cyberAudit.mandateId))
        .innerJoin(
          engagementVersion,
          and(
            eq(engagementVersion.engagementId, cyberMandate.engagementId),
            eq(engagementVersion.revision, 1),
          ),
        )
        .where(
          and(eq(cyberAudit.organizationId, scope.organizationId), eq(cyberAudit.id, data.auditId)),
        );
      if (!head) throw new CyberError(404, 'audit_not_found');
      const scans = await tx
        .select({ scan: cyberScan, job: executionJob, sourceSha256: cyberSource.sha256 })
        .from(cyberScan)
        .innerJoin(executionJob, eq(executionJob.id, cyberScan.executionJobId))
        .leftJoin(cyberSource, eq(cyberSource.id, cyberScan.sourceId))
        .where(
          and(
            eq(cyberScan.organizationId, scope.organizationId),
            eq(cyberScan.auditId, data.auditId),
          ),
        )
        .orderBy(cyberScan.createdAt, cyberScan.id);
      if (
        !scans.length ||
        scans.some((s) => ['queued', 'running', 'retry_wait'].includes(s.job.status))
      )
        throw new CyberError(409, 'audit_not_finished');
      const assets = await tx
        .select()
        .from(cyberAsset)
        .where(
          and(
            eq(cyberAsset.organizationId, scope.organizationId),
            inArray(cyberAsset.id, [...new Set(scans.map((s) => s.scan.assetId))]),
          ),
        )
        .orderBy(cyberAsset.label, cyberAsset.id);
      const records = await tx
        .select({ finding: cyberFinding, observation: cyberObservation })
        .from(cyberObservation)
        .innerJoin(cyberFinding, eq(cyberFinding.id, cyberObservation.findingId))
        .where(
          and(
            eq(cyberObservation.organizationId, scope.organizationId),
            eq(cyberObservation.auditId, data.auditId),
          ),
        )
        .orderBy(cyberObservation.createdAt, cyberObservation.id)
        .limit(1001);
      if (records.length > 1000) throw new CyberError(409, 'report_observation_limit');
      const grouped = new Map<string, typeof records>();
      for (const record of records)
        grouped.set(record.finding.id, [...(grouped.get(record.finding.id) ?? []), record]);
      const [responsible] = await tx
        .select({ name: authSchema.user.name })
        .from(authSchema.user)
        .where(eq(authSchema.user.id, head.version.responsibleUserId));
      const exclusions = head.mandate.excludedAssetIds.length
        ? await tx
            .select({ label: cyberAsset.label, target: cyberAsset.target })
            .from(cyberAsset)
            .where(
              and(
                eq(cyberAsset.organizationId, scope.organizationId),
                inArray(cyberAsset.id, head.mandate.excludedAssetIds),
              ),
            )
        : [];
      const findings = [...grouped.values()]
        .filter((v) =>
          [
            'confirmed',
            'planned',
            'in_progress',
            'to_retest',
            'verified_fixed',
            'accepted_risk',
          ].includes(v[0]!.finding.status),
        )
        .map((rows) => {
          const f = rows[0]!.finding;
          const observation = rows[0]!.observation.data;
          const asset = assets.find((a) => a.id === f.assetId);
          return {
            id: f.id,
            assetId: f.assetId,
            status: f.status,
            observation,
            businessImpact: f.businessImpact,
            recommendation: f.recommendation,
            reviewedBy: f.reviewedBy,
            reviewedAt: f.reviewedAt?.toISOString() ?? null,
            priority: prioritizeCyber({
              severity: observation.severity,
              cvss: observation.cvss,
              epss: null,
              kev: null,
              exposure:
                asset?.exposure === 'public'
                  ? 'public'
                  : asset?.exposure === 'restricted'
                    ? 'restricted'
                    : 'internal',
              criticality: head.client.criticality,
              confidence: observation.confidence,
              humanAdjustment: f.humanAdjustment,
              compensatingControls: f.compensatingControls,
            }),
            sources: rows.map((r) => ({
              engine: r.observation.data.engine,
              version: r.observation.data.engineVersion,
              detectedAt: r.observation.createdAt.toISOString(),
            })),
          };
        })
        .sort((a, b) => b.priority.score - a.priority.score || a.id.localeCompare(b.id));
      const tasks = await tx
        .select()
        .from(cyberTask)
        .where(
          and(
            eq(cyberTask.organizationId, scope.organizationId),
            eq(cyberTask.clientId, head.client.id),
          ),
        );
      const retests = await tx
        .select()
        .from(cyberRetest)
        .where(
          and(
            eq(cyberRetest.organizationId, scope.organizationId),
            eq(cyberRetest.clientId, head.client.id),
          ),
        );
      const ids = new Set(findings.map((f) => f.id));
      const id = randomUUID();
      const snapshot = cyberReportSnapshotSchema.parse({
        version: 'cyber-report-v1',
        reportId: id,
        organizationId: scope.organizationId,
        locale: data.locale,
        createdAt: new Date().toISOString(),
        client: { id: head.client.id, name: head.client.name, contact: head.client.contact },
        audit: {
          id: head.audit.id,
          title: head.audit.title,
          createdAt: head.audit.createdAt.toISOString(),
          responsible: responsible?.name ?? 'Internal consultant',
        },
        mandate: {
          reference: head.mandate.reference,
          signedBy: head.mandate.signedBy,
          authorizedAt: head.mandate.authorizedAt.toISOString(),
          validFrom: head.version.validFrom.toISOString(),
          validUntil: head.version.validUntil.toISOString(),
          limitations: head.mandate.limitations,
          emergencyContact: head.mandate.emergencyContact,
          exclusions: exclusions.map((a) => ({ label: a.label, target: a.target.value })),
        },
        executiveSummary: data.executiveSummary,
        reviewNotes: data.reviewNotes,
        assets: assets.map((a) => ({
          id: a.id,
          label: a.label,
          kind: a.target.kind,
          target: a.target.value,
          exposure: a.exposure,
        })),
        scans: scans.map((s) => ({
          id: s.scan.id,
          assetId: s.scan.assetId,
          engine: s.scan.engine,
          version: s.scan.engineVersion,
          state: s.job.status,
          stage: s.scan.stage,
          observationCount: s.scan.observationCount,
          errorCode: s.job.errorCode,
          sourceSha256: s.sourceSha256,
          coverageHash: s.scan.coverageHash,
        })),
        findings,
        unreviewedCount: [...grouped.values()].filter((r) => r[0]?.finding.status === 'to_review')
          .length,
        falsePositiveCount: [...grouped.values()].filter(
          (r) => r[0]?.finding.status === 'false_positive',
        ).length,
        tasks: tasks
          .filter((t) => ids.has(t.findingId))
          .map((t) => ({
            findingId: t.findingId,
            assignee: t.assignee,
            dueAt: t.dueAt.toISOString(),
            description: t.description,
            status: t.status,
          })),
        retests: retests
          .filter((r) => ids.has(r.findingId))
          .map((r) => ({
            findingId: r.findingId,
            auditId: r.auditId,
            conclusion: r.conclusion,
            note: r.note,
            reviewerId: r.reviewerId,
            createdAt: r.createdAt.toISOString(),
          })),
      });
      const sha256 = cyberReportDigest(snapshot);
      await tx.insert(cyberReport).values({
        id,
        organizationId: scope.organizationId,
        clientId: head.client.id,
        auditId: head.audit.id,
        locale: data.locale,
        snapshot,
        sha256,
      });
      await cyberEventIn(tx, scope, 'report.drafted', id, head.client.id);
      return { id, sha256, snapshot, approvedAt: null };
    },
    { isolationLevel: 'repeatable read' },
  );
}
export async function readCyberReport(database: Database, scope: CyberScope, id: string) {
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'reviewer']);
    const [report] = await tx
      .select()
      .from(cyberReport)
      .where(and(eq(cyberReport.organizationId, scope.organizationId), eq(cyberReport.id, id)));
    if (!report) throw new CyberError(404, 'report_not_found');
    const snapshot = cyberReportSnapshotSchema.parse(report.snapshot);
    if (cyberReportDigest(snapshot) !== report.sha256)
      throw new CyberError(409, 'report_integrity_failed');
    return { ...report, snapshot };
  });
}
export async function approveCyberReport(
  database: Database,
  scope: CyberMutation,
  id: string,
  expectedSha256: string,
) {
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'reviewer']);
    const [report] = await tx
      .select()
      .from(cyberReport)
      .where(and(eq(cyberReport.organizationId, scope.organizationId), eq(cyberReport.id, id)))
      .for('update');
    if (!report) throw new CyberError(404, 'report_not_found');
    const snapshot = cyberReportSnapshotSchema.parse(report.snapshot);
    if (report.sha256 !== expectedSha256 || cyberReportDigest(snapshot) !== expectedSha256)
      throw new CyberError(409, 'report_integrity_failed');
    if (report.approvedAt) return { id, approvedAt: report.approvedAt, sha256: report.sha256 };
    const approvedAt = new Date();
    await tx
      .update(cyberReport)
      .set({ approvedBy: scope.userId, approvedAt })
      .where(eq(cyberReport.id, id));
    await cyberEventIn(tx, scope, 'report.approved', id, report.clientId, report.sha256);
    return { id, approvedAt, sha256: report.sha256 };
  });
}
