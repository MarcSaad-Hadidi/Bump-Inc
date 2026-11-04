import { randomUUID } from 'node:crypto';
import { type CyberEngine, type CyberObservation, cyberObservationSchema } from '@bump/contracts';
import {
  cyberAsset,
  cyberAudit,
  cyberClient,
  cyberEvidence,
  cyberFinding,
  cyberMandate,
  cyberObservation,
  cyberScan,
  cyberSource,
  type Database,
  executionJob,
} from '@bump/db';
import type { CyberVault } from '@bump/integrations';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { finishExecution } from '../execution.js';
import {
  CyberError,
  type CyberScope,
  clientFor,
  cyberEventIn,
  hashCyber,
  withCyber,
} from './context.js';
import { cyberFingerprint } from './policy.js';
export async function readCyberScanForExecution(
  database: Database,
  scope: CyberScope & { jobId: string; scanId: string; token: string },
) {
  return withCyber(database, scope, async (tx) => {
    const [joined] = await tx
      .select({
        scan: cyberScan,
        job: executionJob,
        asset: cyberAsset,
        audit: cyberAudit,
        mandate: cyberMandate,
        client: cyberClient,
      })
      .from(cyberScan)
      .innerJoin(executionJob, eq(executionJob.id, cyberScan.executionJobId))
      .innerJoin(cyberAsset, eq(cyberAsset.id, cyberScan.assetId))
      .innerJoin(cyberAudit, eq(cyberAudit.id, cyberScan.auditId))
      .innerJoin(cyberMandate, eq(cyberMandate.id, cyberAudit.mandateId))
      .innerJoin(cyberClient, eq(cyberClient.id, cyberScan.clientId))
      .where(
        and(eq(cyberScan.id, scope.scanId), eq(cyberScan.organizationId, scope.organizationId)),
      );
    if (
      !joined ||
      joined.job.id !== scope.jobId ||
      joined.job.kind !== 'cyber.scan' ||
      joined.job.status !== 'running' ||
      joined.job.actorUserId !== scope.userId ||
      joined.job.leaseToken !== scope.token ||
      joined.job.cancelRequestedAt ||
      joined.client.archivedAt ||
      joined.asset.archivedAt ||
      joined.job.engagementId !== joined.mandate.engagementId ||
      !joined.mandate.engines.includes(joined.scan.engine as CyberEngine) ||
      !joined.mandate.assetIds.includes(joined.asset.id) ||
      joined.mandate.excludedAssetIds.includes(joined.asset.id)
    )
      throw new CyberError(403, 'scan_binding_denied');
    const [source] = joined.scan.sourceId
      ? await tx
          .select()
          .from(cyberSource)
          .where(
            and(
              eq(cyberSource.id, joined.scan.sourceId),
              eq(cyberSource.organizationId, scope.organizationId),
              eq(cyberSource.assetId, joined.asset.id),
              sql`${cyberSource.purgedAt} IS NULL`,
              sql`${cyberSource.expiresAt}>clock_timestamp()`,
            ),
          )
      : [];
    if (joined.scan.engine !== 'web-passive' && !source)
      throw new CyberError(409, 'source_unavailable');
    return { ...joined, source: source ?? null };
  });
}
export async function stageCyberScan(
  database: Database,
  scope: CyberScope & { scanId: string; jobId: string; token: string },
  stage: 'preparing' | 'running' | 'parsing',
) {
  await readCyberScanForExecution(database, scope);
  return withCyber(database, scope, async (tx) => {
    await tx
      .update(cyberScan)
      .set({ stage })
      .where(
        and(eq(cyberScan.id, scope.scanId), eq(cyberScan.organizationId, scope.organizationId)),
      );
  });
}
export async function finishCyberScan(
  database: Database,
  vault: CyberVault,
  scope: CyberScope & { jobId: string; scanId: string; token: string },
  result: {
    observations: CyberObservation[];
    raw: string;
    engineVersion: string;
    coverageHash: string;
  },
) {
  const observations = z.array(cyberObservationSchema).max(1000).parse(result.observations);
  if (Buffer.byteLength(result.raw) > 1048576) throw new CyberError(409, 'evidence_limit');
  return finishExecution(database, { ...scope, outcome: 'succeeded' }, async (tx, job) => {
    if (
      job.kind !== 'cyber.scan' ||
      !('scanId' in job.payload) ||
      job.payload.scanId !== scope.scanId
    )
      throw new CyberError(409, 'scan_binding_denied');
    const [scan] = await tx
      .select()
      .from(cyberScan)
      .where(
        and(
          eq(cyberScan.organizationId, scope.organizationId),
          eq(cyberScan.id, scope.scanId),
          eq(cyberScan.executionJobId, job.id),
        ),
      );
    if (!scan) throw new CyberError(404, 'scan_not_found');
    const client = await clientFor(tx, scope, scan.clientId);
    if (client.archivedAt) throw new CyberError(403, 'client_archived');
    const [mandate] = await tx
      .select({ mandate: cyberMandate })
      .from(cyberAudit)
      .innerJoin(cyberMandate, eq(cyberMandate.id, cyberAudit.mandateId))
      .where(eq(cyberAudit.id, scan.auditId));
    if (!mandate || !mandate.mandate.engines.includes(scan.engine as CyberEngine))
      throw new CyberError(403, 'scan_binding_denied');
    const seen = new Set<string>();
    for (const data of observations) {
      const fingerprint = cyberFingerprint({ assetId: scan.assetId, ...data });
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      const [existing] = await tx
        .select()
        .from(cyberFinding)
        .where(
          and(
            eq(cyberFinding.organizationId, scope.organizationId),
            eq(cyberFinding.clientId, scan.clientId),
            eq(cyberFinding.fingerprint, fingerprint),
          ),
        )
        .for('update');
      let findingId: string;
      if (existing) {
        findingId = existing.id;
        const reopen = ['verified_fixed', 'closed'].includes(existing.status);
        await tx
          .update(cyberFinding)
          .set({
            lastAuditId: scan.auditId,
            observation: data,
            updatedAt: new Date(),
            ...(reopen ? { status: 'to_review', reviewedBy: null, reviewedAt: null } : {}),
          })
          .where(eq(cyberFinding.id, findingId));
        if (reopen) await cyberEventIn(tx, scope, 'finding.reopened', findingId, scan.clientId);
      } else {
        const [f] = await tx
          .insert(cyberFinding)
          .values({
            organizationId: scope.organizationId,
            clientId: scan.clientId,
            assetId: scan.assetId,
            firstAuditId: scan.auditId,
            lastAuditId: scan.auditId,
            fingerprint,
            observation: data,
            recommendation: data.recommendation,
          })
          .returning();
        if (!f) throw new CyberError(409, 'state_conflict');
        findingId = f.id;
      }
      await tx.insert(cyberObservation).values({
        organizationId: scope.organizationId,
        clientId: scan.clientId,
        assetId: scan.assetId,
        auditId: scan.auditId,
        scanId: scan.id,
        findingId,
        fingerprint,
        data,
      });
    }
    const evidenceId = randomUUID();
    await tx.insert(cyberEvidence).values({
      id: evidenceId,
      organizationId: scope.organizationId,
      clientId: scan.clientId,
      scanId: scan.id,
      ciphertext: vault.seal(`${scope.organizationId}/${evidenceId}`, result.raw),
      sha256: hashCyber(result.raw),
      expiresAt: new Date(Date.now() + client.retentionDays * 86400000),
    });
    await tx
      .update(cyberScan)
      .set({
        stage: 'completed',
        engineVersion: result.engineVersion,
        coverageHash: result.coverageHash,
        observationCount: seen.size,
      })
      .where(eq(cyberScan.id, scan.id));
    await cyberEventIn(
      tx,
      scope,
      'scan.completed',
      scan.id,
      scan.clientId,
      `${seen.size} observations`,
    );
  });
}
