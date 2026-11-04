import { randomUUID } from 'node:crypto';
import {
  cyberAssetInputSchema,
  cyberClientInputSchema,
  cyberMandateInputSchema,
  cyberSourceInputSchema,
} from '@bump/contracts';
import {
  cyberAsset,
  cyberClient,
  cyberMandate,
  cyberSource,
  type Database,
  engagementVersion,
} from '@bump/db';
import type { CyberVault } from '@bump/integrations';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { approveEngagement, createEngagementInTransaction } from '../engagements.js';
import {
  CyberError,
  type CyberMutation,
  clientFor,
  clientWhere,
  cyberEventIn,
  hashCyber,
  requireCyberRole,
  withCyber,
} from './context.js';
import { engineAction } from './policy.js';
export async function createCyberClient(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberClientInputSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant']);
    const [v] = await tx
      .insert(cyberClient)
      .values({ ...data, organizationId: scope.organizationId })
      .returning();
    if (!v) throw new CyberError(409, 'state_conflict');
    await cyberEventIn(tx, scope, 'client.created', v.id, v.id);
    return v;
  });
}
export async function updateCyberClient(
  database: Database,
  scope: CyberMutation,
  id: string,
  input: unknown,
) {
  const data = cyberClientInputSchema.extend({ archived: z.boolean().default(false) }).parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant']);
    await clientFor(tx, scope, id);
    const { archived, ...fields } = data;
    const [v] = await tx
      .update(cyberClient)
      .set({ ...fields, archivedAt: archived ? new Date() : null })
      .where(clientWhere(scope, id))
      .returning();
    await cyberEventIn(tx, scope, 'client.updated', id, id);
    return v;
  });
}
export async function createCyberAsset(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberAssetInputSchema.parse(input);
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant']);
    const client = await clientFor(tx, scope, data.clientId);
    if (client.archivedAt) throw new CyberError(409, 'client_archived');
    const [v] = await tx
      .insert(cyberAsset)
      .values({ ...data, organizationId: scope.organizationId })
      .returning();
    if (!v) throw new CyberError(409, 'state_conflict');
    await cyberEventIn(tx, scope, 'asset.created', v.id, v.clientId);
    return v;
  });
}
export async function createCyberMandate(database: Database, scope: CyberMutation, input: unknown) {
  const data = cyberMandateInputSchema.parse(input);
  // Existing engagement administration requires the organization administrator.
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin']);
    const client = await clientFor(tx, scope, data.clientId);
    if (client.archivedAt) throw new CyberError(409, 'client_archived');
    const ids = [...new Set([...data.assetIds, ...data.excludedAssetIds])];
    const found = await tx
      .select()
      .from(cyberAsset)
      .where(
        and(
          eq(cyberAsset.organizationId, scope.organizationId),
          eq(cyberAsset.clientId, data.clientId),
          inArray(cyberAsset.id, ids),
        ),
      );
    if (found.length !== ids.length || found.some((a) => a.archivedAt))
      throw new CyberError(403, 'invalid_asset_scope');
    const assets = found;
    const head = await createEngagementInTransaction(tx, 'admin', {
      ...scope,
      revision: {
        objective: `Bump Cyber — ${data.reference}`,
        responsibleUserId: data.responsibleUserId,
        scope: {
          assets: assets.filter((a) => data.assetIds.includes(a.id)).map((a) => a.target),
          exclusions: assets
            .filter((a) => data.excludedAssetIds.includes(a.id))
            .map((a) => a.target),
          actions: [...new Set(data.engines.map(engineAction))],
        },
        authorizationText: data.authorizationText,
        sourceReference: data.reference,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
    });
    const [v] = await tx
      .insert(cyberMandate)
      .values({
        organizationId: scope.organizationId,
        clientId: data.clientId,
        engagementId: head.id,
        reference: data.reference,
        signedBy: data.signedBy,
        authorizedAt: new Date(data.authorizedAt),
        emergencyContact: data.emergencyContact,
        engines: data.engines,
        assetIds: data.assetIds,
        excludedAssetIds: data.excludedAssetIds,
        limitations: data.limitations,
      })
      .returning();
    if (!v) throw new CyberError(409, 'state_conflict');
    await cyberEventIn(tx, scope, 'mandate.recorded', v.id, v.clientId);
    return { ...v, version: head.version };
  });
}
export async function approveCyberMandate(database: Database, scope: CyberMutation, id: string) {
  const row = await withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin']);
    const [v] = await tx
      .select({ mandate: cyberMandate, version: engagementVersion })
      .from(cyberMandate)
      .innerJoin(
        engagementVersion,
        and(
          eq(engagementVersion.engagementId, cyberMandate.engagementId),
          eq(engagementVersion.organizationId, cyberMandate.organizationId),
          eq(engagementVersion.revision, 1),
        ),
      )
      .where(and(eq(cyberMandate.organizationId, scope.organizationId), eq(cyberMandate.id, id)));
    if (!v) throw new CyberError(404, 'mandate_not_found');
    return v;
  });
  return approveEngagement(database, {
    ...scope,
    engagementId: row.mandate.engagementId,
    expectedRevision: 1,
    authorizationSha256: row.version.authorizationSha256,
  });
}
export async function createCyberSource(
  database: Database,
  vault: CyberVault,
  scope: CyberMutation,
  input: unknown,
) {
  const data = cyberSourceInputSchema.parse(input);
  return saveCyberSource(
    database,
    vault,
    scope,
    data.assetId,
    data.name,
    'files',
    JSON.stringify(data.files),
  );
}
export async function saveCyberSource(
  database: Database,
  vault: CyberVault,
  scope: CyberMutation,
  assetId: string,
  name: string,
  kind: string,
  source: string,
) {
  if (Buffer.byteLength(source) > 524288) throw new CyberError(409, 'source_too_large');
  return withCyber(database, scope, async (tx, role) => {
    requireCyberRole(role, ['admin', 'consultant', 'analyst']);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${scope.organizationId},3))`,
    );
    const [asset] = await tx
      .select()
      .from(cyberAsset)
      .where(and(eq(cyberAsset.id, assetId), eq(cyberAsset.organizationId, scope.organizationId)));
    if (!asset || asset.archivedAt) throw new CyberError(404, 'asset_not_found');
    const client = await clientFor(tx, scope, asset.clientId);
    if (client.archivedAt) throw new CyberError(409, 'client_archived');
    const [quota] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(cyberSource)
      .where(
        and(
          eq(cyberSource.organizationId, scope.organizationId),
          sql`${cyberSource.purgedAt} IS NULL`,
        ),
      );
    if ((quota?.n ?? 200) >= 200) throw new CyberError(409, 'source_quota');
    const id = randomUUID();
    await tx.insert(cyberSource).values({
      id,
      organizationId: scope.organizationId,
      clientId: asset.clientId,
      assetId,
      name,
      kind,
      ciphertext: vault.seal(`${scope.organizationId}/${id}`, source),
      sha256: hashCyber(source),
      createdBy: scope.userId,
      expiresAt: new Date(Date.now() + client.retentionDays * 86400000),
    });
    await cyberEventIn(tx, scope, 'source.uploaded', id, asset.clientId);
    return { id, assetId, name, kind, sha256: hashCyber(source) };
  });
}
