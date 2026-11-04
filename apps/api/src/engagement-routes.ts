import {
  engagementActionSchema,
  engagementRevisionInputSchema,
  engagementTargetSchema,
} from '@bump/contracts';
import {
  amendEngagement,
  approveEngagement,
  authorizeEngagement,
  createEngagement,
  listEngagements,
  readEngagement,
  readEngagementVersion,
  revokeEngagement,
} from '@bump/core';
import type { Database } from '@bump/db';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

const organizationParams = z.strictObject({ organizationId: z.uuid() });
const selectedParams = organizationParams.extend({ engagementId: z.uuid() });
const expectedRevision = z.number().int().min(1).max(2_147_483_646);

export async function registerEngagementRoutes(
  app: FastifyInstance,
  database: Database,
  sessionFor: (request: FastifyRequest) => Promise<{ user: { id: string } }>,
) {
  const base = '/organizations/:organizationId/engagements';
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
    const revision = engagementRevisionInputSchema.parse(request.body);
    return reply
      .code(201)
      .send(await createEngagement(database, { ...scope, requestId: request.id, revision }));
  });
  app.get(base, async (request) => listEngagements(database, await scopeFor(request)));
  app.get(`${base}/:engagementId`, async (request) =>
    readEngagement(database, await selectedFor(request)),
  );
  app.get(`${base}/:engagementId/versions/:revision`, async (request) => {
    const { user } = await sessionFor(request);
    const params = selectedParams
      .extend({ revision: z.coerce.number().pipe(expectedRevision) })
      .parse(request.params);
    return readEngagementVersion(database, { ...params, userId: user.id });
  });
  app.post(`${base}/:engagementId/versions`, async (request, reply) => {
    const scope = await selectedFor(request);
    const body = z
      .strictObject({ expectedRevision, revision: engagementRevisionInputSchema })
      .parse(request.body);
    return reply
      .code(201)
      .send(await amendEngagement(database, { ...scope, ...body, requestId: request.id }));
  });
  app.post(`${base}/:engagementId/approve`, async (request, reply) => {
    const scope = await selectedFor(request);
    const body = z
      .strictObject({ expectedRevision, authorizationSha256: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(request.body);
    return reply
      .code(201)
      .send(await approveEngagement(database, { ...scope, ...body, requestId: request.id }));
  });
  app.post(`${base}/:engagementId/revoke`, async (request) => {
    const scope = await selectedFor(request);
    const body = z
      .strictObject({ expectedRevision, reason: z.string().trim().min(1).max(2_000) })
      .parse(request.body);
    return revokeEngagement(database, { ...scope, ...body, requestId: request.id });
  });
  app.post(`${base}/:engagementId/authorize`, async (request) => {
    const scope = await selectedFor(request);
    const body = z
      .strictObject({
        expectedRevision,
        target: engagementTargetSchema,
        action: engagementActionSchema,
      })
      .parse(request.body);
    return authorizeEngagement(database, { ...scope, ...body });
  });
}
