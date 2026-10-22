import { z } from 'zod';

const databaseUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
    url.hostname.length > 0 &&
    url.pathname.startsWith('/') &&
    url.pathname.length > 1
  );
}, 'Must be a PostgreSQL connection URL with a database');
const redisUrl = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ['redis:', 'rediss:'].includes(url.protocol) &&
    url.hostname.length > 0 &&
    /^(\/\d*)?$/.test(url.pathname)
  );
}, 'Must be a Redis connection URL');
const port = z.coerce.number().int().min(1).max(65535);

export const serviceEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
});

function requireDatabaseTransport(
  env: { NODE_ENV: string; DATABASE_URL: string },
  ctx: z.RefinementCtx,
) {
  if (env.NODE_ENV !== 'production' || !URL.canParse(env.DATABASE_URL)) return;
  const database = new URL(env.DATABASE_URL);
  const sslModes = database.searchParams.getAll('sslmode');
  if (sslModes.length !== 1 || sslModes[0] !== 'verify-full') {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: 'Production PostgreSQL requires sslmode=verify-full',
    });
  }
  if (database.password === 'bump_local_development_only' || !database.password) {
    ctx.addIssue({
      code: 'custom',
      path: ['DATABASE_URL'],
      message: 'Production PostgreSQL requires a non-example credential',
    });
  }
}

function requireProductionTransport(env: z.infer<typeof serviceEnvSchema>, ctx: z.RefinementCtx) {
  requireDatabaseTransport(env, ctx);
  if (
    env.NODE_ENV === 'production' &&
    URL.canParse(env.REDIS_URL) &&
    new URL(env.REDIS_URL).protocol !== 'rediss:'
  ) {
    ctx.addIssue({ code: 'custom', path: ['REDIS_URL'], message: 'Production Redis requires TLS' });
  }
}

export const databaseEnvSchema = serviceEnvSchema
  .pick({ NODE_ENV: true, DATABASE_URL: true })
  .superRefine(requireDatabaseTransport);

export const apiEnvSchema = serviceEnvSchema
  .extend({ API_PORT: port.default(3001) })
  .superRefine(requireProductionTransport);
export const workerEnvSchema = serviceEnvSchema
  .extend({
    WORKER_PORT: port.default(3002),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(2),
  })
  .superRefine(requireProductionTransport);

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function parseEnv<T extends z.ZodType>(schema: T, input: unknown = process.env): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return parsed.data;
}

export const PROBE_QUEUE_NAME = 'bump-system-probes';
export const probeJobSchema = z.strictObject({ id: z.uuid() });
export type ProbeJob = z.infer<typeof probeJobSchema>;
