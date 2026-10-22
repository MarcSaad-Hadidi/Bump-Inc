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
  field = 'DATABASE_URL',
) {
  if (env.NODE_ENV !== 'production' || !URL.canParse(env.DATABASE_URL)) return;
  const database = new URL(env.DATABASE_URL);
  const sslModes = database.searchParams.getAll('sslmode');
  if (sslModes.length !== 1 || sslModes[0] !== 'verify-full') {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: 'Production PostgreSQL requires sslmode=verify-full',
    });
  }
  if (
    ['bump_local_development_only', 'bump_local_runtime_only'].includes(database.password) ||
    !database.password
  ) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
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

export const databaseEnvSchema = z
  .object({
    NODE_ENV: serviceEnvSchema.shape.NODE_ENV,
    MIGRATION_DATABASE_URL: databaseUrl,
  })
  .superRefine((env, ctx) =>
    requireDatabaseTransport(
      { NODE_ENV: env.NODE_ENV, DATABASE_URL: env.MIGRATION_DATABASE_URL },
      ctx,
      'MIGRATION_DATABASE_URL',
    ),
  );

const origin = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    url.pathname === '/' &&
    !url.search &&
    !url.hash
  );
}, 'Must be an HTTP(S) origin');

export const apiEnvSchema = serviceEnvSchema
  .extend({
    API_PORT: port.default(3001),
    AUTH_SECRET: z.string().min(32).default('local-development-only-change-this-secret'),
    AUTH_BASE_URL: origin.default('http://127.0.0.1:3001'),
    AUTH_ALLOW_SIGNUP: z.stringbool({ truthy: ['true'], falsy: ['false'] }).default(false),
    SMTP_HOST: z
      .string()
      .min(1)
      .max(253)
      .regex(/^[a-zA-Z0-9.:-]+$/)
      .default('127.0.0.1'),
    SMTP_PORT: port.default(1025),
    SMTP_SECURE: z.stringbool({ truthy: ['true'], falsy: ['false'] }).default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.email().default('noreply@bump.local'),
  })
  .superRefine((env, ctx) => {
    requireProductionTransport(env, ctx);
    if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP credentials must be provided together',
      });
    }
    if (env.NODE_ENV !== 'production') return;
    for (const [field, valid] of [
      ['AUTH_SECRET', !env.AUTH_SECRET.startsWith('local-')],
      ['AUTH_BASE_URL', env.AUTH_BASE_URL.startsWith('https://')],
      ['AUTH_ALLOW_SIGNUP', !env.AUTH_ALLOW_SIGNUP],
      ['SMTP_SECURE', env.SMTP_SECURE],
      ['SMTP_USER', Boolean(env.SMTP_USER && env.SMTP_PASSWORD)],
      ['MAIL_FROM', env.MAIL_FROM !== 'noreply@bump.local'],
    ] as const) {
      if (!valid)
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'Production identity requires secure explicit configuration',
        });
    }
  });
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
