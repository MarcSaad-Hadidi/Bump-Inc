import { randomUUID } from 'node:crypto';
import { type CyberEngine, cyberAuditInputSchema } from '@bump/contracts';
import {
  cyberAsset,
  cyberAudit,
  cyberClient,
  cyberEvent,
  cyberFinding,
  cyberMandate,
  cyberReport,
  cyberRetest,
  cyberScan,
  cyberSource,
  cyberTask,
  type Database,
  engagement,
  engagementApproval,
  engagementVersion,
  executionJob,
} from '@bump/db';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { authorizeEngagementInTransaction } from '../engagements.js';
import { submitExecutionInTransaction } from '../execution.js';
import {
  CyberError,
  type CyberMutation,
  type CyberScope,
  clientFor,
  cyberEventIn,
  hashCyber,
  requireCyberRole,
  withCyber,
} from './context.js';
import { engineAction, prioritizeCyber } from './policy.js';
export async function launchCyberAudit(
  database: Database,
  scope: CyberMutation,
  input: unknown,
  available: CyberEngine[],
) {
  const data = cyberAuditInputSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'analyst']);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${scope.organizationId},3))`,
    );
    const client = await clientFor(tx, scope, data.clientId);
    if (client.archivedAt) throw new CyberError(409, 'client_archived');
    const [mandate] = await tx
      .select()
      .from(cyberMandate)
      .where(
        and(
          eq(cyberMandate.id, data.mandateId),
          eq(cyberMandate.organizationId, scope.organizationId),
          eq(cyberMandate.clientId, data.clientId),
        ),
      );
    if (!mandate) throw new CyberError(403, 'mandate_not_found');
    if (
      new Set(data.assetIds).size !== data.assetIds.length ||
      new Set(data.engines).size !== data.engines.length
    )
      throw new CyberError(409, 'duplicate_scope');
    if (
      data.assetIds.some(
        (id) => !mandate.assetIds.includes(id) || mandate.excludedAssetIds.includes(id),
      ) ||
      data.engines.some((e) => !mandate.engines.includes(e))
    )
      throw new CyberError(403, 'outside_mandate');
    if (data.engines.some((e) => !available.includes(e)))
      throw new CyberError(503, 'engine_unavailable');
    const assets = await tx
      .select()
      .from(cyberAsset)
      .where(
        and(
          eq(cyberAsset.organizationId, scope.organizationId),
          eq(cyberAsset.clientId, data.clientId),
          inArray(cyberAsset.id, data.assetIds),
        ),
      );
    if (assets.length !== data.assetIds.length || assets.some((a) => a.archivedAt))
      throw new CyberError(403, 'invalid_asset_scope');
    for (const asset of assets)
      for (const engine of data.engines) {
        const decision = await authorizeEngagementInTransaction(tx, {
          ...scope,
          engagementId: mandate.engagementId,
          expectedRevision: 1,
          target: asset.target,
          action: engineAction(engine),
        });
        if (!decision.allowed) throw new CyberError(403, `mandate_${decision.reason}`);
        if (
          engine === 'web-passive'
            ? asset.target.kind !== 'hostname'
            : !['json', 'sarif'].includes(engine) && asset.target.kind !== 'repository'
        )
          throw new CyberError(403, 'incompatible_engine');
      }
    const requestHash = hashCyber(JSON.stringify(data));
    const [existing] = await tx
      .select()
      .from(cyberAudit)
      .where(
        and(
          eq(cyberAudit.organizationId, scope.organizationId),
          eq(cyberAudit.idempotencyKey, data.idempotencyKey),
        ),
      );
    if (existing) {
      if (existing.requestHash !== requestHash) throw new CyberError(409, 'idempotency_conflict');
      return existing;
    }
    const [audit] = await tx
      .insert(cyberAudit)
      .values({
        organizationId: scope.organizationId,
        clientId: data.clientId,
        mandateId: data.mandateId,
        requestedBy: scope.userId,
        title: data.title,
        idempotencyKey: data.idempotencyKey,
        requestHash,
      })
      .returning();
    if (!audit) throw new CyberError(409, 'state_conflict');
    for (const asset of assets)
      for (const engine of data.engines) {
        let sourceId: string | null = null;
        if (engine !== 'web-passive') {
          const [source] = await tx
            .select()
            .from(cyberSource)
            .where(
              and(
                eq(cyberSource.organizationId, scope.organizationId),
                eq(cyberSource.assetId, asset.id),
                eq(cyberSource.kind, ['json', 'sarif'].includes(engine) ? engine : 'files'),
                sql`${cyberSource.purgedAt} IS NULL`,
                sql`${cyberSource.expiresAt}>clock_timestamp()`,
              ),
            )
            .orderBy(desc(cyberSource.createdAt))
            .limit(1);
          if (!source) throw new CyberError(409, 'source_required');
          sourceId = source.id;
        }
        const scanId = randomUUID();
        const job = await submitExecutionInTransaction(tx, {
          ...scope,
          job: {
            engagementId: mandate.engagementId,
            expectedRevision: 1,
            target: asset.target,
            action: engineAction(engine),
            kind: 'cyber.scan',
            payload: { scanId },
            idempotencyKey: `cyber-${scanId}`,
            maxAttempts: 1,
            timeoutMs: 30000,
            backoffMs: 1000,
          },
        });
        await tx.insert(cyberScan).values({
          id: scanId,
          organizationId: scope.organizationId,
          clientId: client.id,
          auditId: audit.id,
          assetId: asset.id,
          sourceId,
          executionJobId: job.id,
          engine,
        });
      }
    await cyberEventIn(tx, scope, 'audit.launched', audit.id, audit.clientId);
    return audit;
  });
}
export async function readCyberSnapshot(database: Database, scope: CyberScope) {
  return withCyber(database, scope, async (tx, role) => {
    const org = scope.organizationId;
    const clients = await tx
      .select()
      .from(cyberClient)
      .where(eq(cyberClient.organizationId, org))
      .orderBy(desc(cyberClient.createdAt))
      .limit(200);
    const assets = await tx
      .select()
      .from(cyberAsset)
      .where(eq(cyberAsset.organizationId, org))
      .limit(1000);
    const mandates = await tx
      .select({
        mandate: cyberMandate,
        version: engagementVersion,
        approved: engagementApproval.id,
        revokedAt: engagement.revokedAt,
        currentRevision: engagement.currentRevision,
      })
      .from(cyberMandate)
      .innerJoin(engagement, eq(engagement.id, cyberMandate.engagementId))
      .innerJoin(
        engagementVersion,
        and(
          eq(engagementVersion.engagementId, cyberMandate.engagementId),
          eq(engagementVersion.revision, 1),
        ),
      )
      .leftJoin(
        engagementApproval,
        and(
          eq(engagementApproval.engagementId, cyberMandate.engagementId),
          eq(engagementApproval.revision, 1),
        ),
      )
      .where(eq(cyberMandate.organizationId, org))
      .limit(200);
    const audits = await tx
      .select()
      .from(cyberAudit)
      .where(eq(cyberAudit.organizationId, org))
      .orderBy(desc(cyberAudit.createdAt))
      .limit(200);
    const scans = await tx
      .select({
        scan: cyberScan,
        status: executionJob.status,
        errorCode: executionJob.errorCode,
        attempt: executionJob.attempt,
        startedAt: executionJob.updatedAt,
        finishedAt: executionJob.finishedAt,
        cancelRequestedAt: executionJob.cancelRequestedAt,
      })
      .from(cyberScan)
      .innerJoin(executionJob, eq(executionJob.id, cyberScan.executionJobId))
      .where(eq(cyberScan.organizationId, org))
      .orderBy(desc(cyberScan.createdAt))
      .limit(2000);
    const findings = await tx
      .select()
      .from(cyberFinding)
      .where(eq(cyberFinding.organizationId, org))
      .orderBy(desc(cyberFinding.updatedAt))
      .limit(1000);
    const sources = await tx
      .select({
        id: cyberSource.id,
        assetId: cyberSource.assetId,
        name: cyberSource.name,
        kind: cyberSource.kind,
        createdAt: cyberSource.createdAt,
        expiresAt: cyberSource.expiresAt,
        purgedAt: cyberSource.purgedAt,
      })
      .from(cyberSource)
      .where(eq(cyberSource.organizationId, org))
      .orderBy(desc(cyberSource.createdAt))
      .limit(200);
    const statsResult = await tx.execute<{
      clients: number;
      ongoing: number;
      completed: number;
      critical: number;
      fixed: number;
      failed: number;
      to_review: number;
    }>(sql`SELECT
      (SELECT count(*)::int FROM cyber_client WHERE organization_id=${org} AND archived_at IS NULL) AS clients,
      (SELECT count(DISTINCT s.audit_id)::int FROM cyber_scan s JOIN execution_job j ON j.id=s.execution_job_id WHERE s.organization_id=${org} AND j.status IN ('queued','running','retry_wait')) AS ongoing,
      (SELECT count(*)::int FROM cyber_audit a WHERE a.organization_id=${org} AND EXISTS(SELECT 1 FROM cyber_scan s WHERE s.audit_id=a.id) AND NOT EXISTS(SELECT 1 FROM cyber_scan s JOIN execution_job j ON j.id=s.execution_job_id WHERE s.audit_id=a.id AND j.status<>'succeeded')) AS completed,
      (SELECT count(*)::int FROM cyber_finding WHERE organization_id=${org} AND observation->>'severity'='critical' AND status NOT IN ('false_positive','verified_fixed','closed')) AS critical,
      (SELECT count(*)::int FROM cyber_finding WHERE organization_id=${org} AND status='verified_fixed') AS fixed,
      (SELECT count(*)::int FROM cyber_scan s JOIN execution_job j ON j.id=s.execution_job_id WHERE s.organization_id=${org} AND j.status IN ('dead_letter','denied')) AS failed,
      (SELECT count(*)::int FROM cyber_finding WHERE organization_id=${org} AND status='to_review') AS to_review`);
    return {
      stats: statsResult.rows[0]!,
      role,
      clients,
      assets,
      mandates,
      audits,
      scans,
      sources,
      findings: findings.map((f) => {
        const client = clients.find((c) => c.id === f.clientId);
        const asset = assets.find((a) => a.id === f.assetId);
        return {
          ...f,
          priority: prioritizeCyber({
            severity: f.observation.severity,
            cvss: f.observation.cvss,
            epss: null,
            kev: null,
            confidence: f.observation.confidence,
            criticality: client?.criticality ?? 3,
            exposure:
              asset?.exposure === 'public'
                ? 'public'
                : asset?.exposure === 'restricted'
                  ? 'restricted'
                  : 'internal',
            humanAdjustment: f.humanAdjustment,
            compensatingControls: f.compensatingControls,
          }),
        };
      }),
      tasks: await tx.select().from(cyberTask).where(eq(cyberTask.organizationId, org)).limit(1000),
      retests: await tx
        .select()
        .from(cyberRetest)
        .where(eq(cyberRetest.organizationId, org))
        .limit(1000),
      reports: await tx
        .select({
          id: cyberReport.id,
          auditId: cyberReport.auditId,
          clientId: cyberReport.clientId,
          createdAt: cyberReport.createdAt,
          approvedAt: cyberReport.approvedAt,
          approvedBy: cyberReport.approvedBy,
          locale: cyberReport.locale,
          sha256: cyberReport.sha256,
        })
        .from(cyberReport)
        .where(eq(cyberReport.organizationId, org))
        .limit(200),
      events: await tx
        .select()
        .from(cyberEvent)
        .where(eq(cyberEvent.organizationId, org))
        .orderBy(desc(cyberEvent.createdAt))
        .limit(50),
      limits: { clients: 200, audits: 200, findings: 1000, scans: 2000 },
    };
  });
}
