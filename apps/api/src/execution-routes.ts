import { executionControlInputSchema, executionJobInputSchema } from '@bump/contracts';
import {
  cancelExecution,
  configureExecution,
  listExecutions,
  readExecution,
  readExecutionControl,
  submitExecution,
} from '@bump/core';
import type { Database } from '@bump/db';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

const organizationParams = z.strictObject({ organizationId: z.uuid() });
const selectedParams = organizationParams.extend({ jobId: z.uuid() });

function publicJob<T extends { leaseToken: string | null; requestHash: string }>(job: T) {
  const { leaseToken: _leaseToken, requestHash: _requestHash, ...visible } = job;
  return visible;
}

export async function registerExecutionRoutes(
  app: FastifyInstance,
  database: Database,
  sessionFor: (request: FastifyRequest) => Promise<{ user: { id: string } }>,
) {
  const base = '/organizations/:organizationId/executions';
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
    const job = executionJobInputSchema.parse(request.body);
    return reply
      .code(201)
      .send(publicJob(await submitExecution(database, { ...scope, requestId: request.id, job })));
  });
  app.get(base, async (request) =>
    (await listExecutions(database, await scopeFor(request))).map(publicJob),
  );
  app.get(`${base}/:jobId`, async (request) => {
    const job = await readExecution(database, await selectedFor(request));
    return {
      ...publicJob(job),
      attempts: job.attempts.map(({ token: _token, ...attempt }) => attempt),
    };
  });
  app.post(`${base}/:jobId/cancel`, async (request) => {
    const scope = await selectedFor(request);
    z.strictObject({}).parse(request.body ?? {});
    return publicJob(await cancelExecution(database, { ...scope, requestId: request.id }));
  });
  const control = '/organizations/:organizationId/execution-control';
  app.get(control, async (request) => readExecutionControl(database, await scopeFor(request)));
  app.put(control, async (request) => {
    const scope = await scopeFor(request);
    return configureExecution(database, {
      ...scope,
      requestId: request.id,
      control: executionControlInputSchema.parse(request.body),
    });
  });
}
