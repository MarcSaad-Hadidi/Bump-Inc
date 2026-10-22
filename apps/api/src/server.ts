import { randomUUID } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import type { ApiEnv } from '@bump/contracts';
import { loggerOptions } from '@bump/observability';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { createDependencies, type Dependencies } from './dependencies.js';
import { registerIdentityRoutes } from './identity-routes.js';

export function buildServer(env: ApiEnv, injectedDependencies?: Dependencies) {
  const app = Fastify({
    logger: loggerOptions('api', env.LOG_LEVEL),
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    trustProxy: false,
    bodyLimit: 1_048_576,
    requestTimeout: 15_000,
    connectionTimeout: 15_000,
    keepAliveTimeout: 5_000,
    forceCloseConnections: 'idle',
  });
  const dependencies = injectedDependencies ?? createDependencies(env, app.log);

  app.register(helmet);
  // shortcut: per-process limits, add a shared store before horizontally scaling public routes.
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onReady', () => dependencies.start());
  app.addHook('onClose', () => dependencies.close());
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    reply.header('cache-control', 'no-store');
  });

  app.setErrorHandler((error, request, reply) => {
    const proposedStatus =
      error instanceof ZodError
        ? 400
        : error instanceof Error && 'statusCode' in error
          ? error.statusCode
          : 500;
    const statusCode =
      typeof proposedStatus === 'number' &&
      Number.isInteger(proposedStatus) &&
      proposedStatus >= 400 &&
      proposedStatus < 600
        ? proposedStatus
        : 500;
    if (statusCode >= 500) {
      request.log.error({ statusCode }, 'Request failed');
    }
    reply.code(statusCode).send({
      error: STATUS_CODES[statusCode] ?? 'Request failed',
      requestId: request.id,
    });
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'Not Found', requestId: request.id });
  });

  app.register(async (routes) => {
    routes.get('/health/live', { config: { rateLimit: false } }, async () => ({ status: 'ok' }));
    routes.get('/health/ready', async (_request, reply) => {
      const results = await Promise.allSettled([dependencies.database(), dependencies.redis()]);
      if (results.some((result) => result.status === 'rejected')) {
        return reply.code(503).send({ status: 'not_ready' });
      }
      return { status: 'ok' };
    });
  });
  if (dependencies.identity) {
    const identity = dependencies.identity;
    app.register(async (routes) => registerIdentityRoutes(routes, identity));
  }

  return app;
}
