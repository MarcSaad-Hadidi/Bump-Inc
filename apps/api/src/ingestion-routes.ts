import { auditImportInputSchema } from '@bump/contracts';
import {
  listAuditImports,
  queueAuditImport,
  readAuditImport,
  readAuditObservations,
  reserveAuditImport,
} from '@bump/core';
import type { Database } from '@bump/db';
import type { ArtifactStore } from '@bump/integrations';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

const organizationParams = z.strictObject({ organizationId: z.uuid() });
const selectedParams = organizationParams.extend({ importId: z.uuid() });

function publicReceipt(receipt: Awaited<ReturnType<typeof readAuditImport>>) {
  return {
    id: receipt.id,
    actorUserId: receipt.actorUserId,
    engagementId: receipt.engagementId,
    expectedRevision: receipt.expectedRevision,
    target: receipt.target,
    format: receipt.format,
    importerVersion: receipt.importerVersion,
    sourceName: receipt.sourceName,
    sourceSha256: receipt.sourceSha256,
    byteCount: receipt.byteCount,
    status: receipt.status,
    executionJobId: receipt.executionJobId,
    executionStatus: receipt.executionStatus,
    observationCount: receipt.observationCount,
    createdAt: receipt.createdAt,
    readyAt: receipt.readyAt,
    completedAt: receipt.completedAt,
  };
}

export async function registerIngestionRoutes(
  app: FastifyInstance,
  database: Database,
  store: ArtifactStore,
  sessionFor: (request: FastifyRequest) => Promise<{ user: { id: string } }>,
) {
  const base = '/organizations/:organizationId/audit-imports';
  async function scopeFor(request: FastifyRequest) {
    const { user } = await sessionFor(request);
    return { ...organizationParams.parse(request.params), userId: user.id };
  }
  async function selectedFor(request: FastifyRequest) {
    const { user } = await sessionFor(request);
    return { ...selectedParams.parse(request.params), userId: user.id };
  }
  app.post(base, async (request, reply) => {
    const scope = await scopeFor(request);
    const input = auditImportInputSchema.parse(request.body);
    const reserved = await reserveAuditImport(database, {
      ...scope,
      requestId: request.id,
      input,
      storageBackend: store.backend,
    });
    if (reserved.status === 'staging') {
      await store.put(
        reserved.storageKey,
        Buffer.from(input.sourceText, 'utf8'),
        reserved.sourceSha256,
      );
      await queueAuditImport(database, { ...scope, requestId: request.id, importId: reserved.id });
    }
    return reply
      .code(201)
      .send(publicReceipt(await readAuditImport(database, { ...scope, importId: reserved.id })));
  });
  app.get(base, async (request) =>
    (await listAuditImports(database, await scopeFor(request))).map(publicReceipt),
  );
  app.get(`${base}/:importId`, async (request) =>
    publicReceipt(await readAuditImport(database, await selectedFor(request))),
  );
  app.get(`${base}/:importId/observations`, async (request) => {
    const scope = await selectedFor(request);
    const page = z
      .strictObject({
        offset: z.coerce.number().int().min(0).max(1000).default(0),
        limit: z.coerce.number().int().min(1).max(100).default(100),
      })
      .parse(request.query);
    return readAuditObservations(database, { ...scope, ...page });
  });
}
