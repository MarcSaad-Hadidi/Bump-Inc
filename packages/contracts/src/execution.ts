import { z } from 'zod';
import { engagementActionSchema, engagementTargetSchema } from './engagement.js';

export const EXECUTION_QUEUE_NAME = 'bump-executions';
export const executionNotificationSchema = z.strictObject({ jobId: z.uuid() });
export const executionJobInputSchema = z.strictObject({
  engagementId: z.uuid().transform((value) => value.toLowerCase()),
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
  target: engagementTargetSchema,
  action: engagementActionSchema,
  kind: z.literal('synthetic'),
  payload: z.strictObject({
    durationMs: z.number().int().min(0).max(30_000).default(0),
    failUntilAttempt: z.number().int().min(0).max(5).default(0),
  }),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  timeoutMs: z.number().int().min(100).max(30_000).default(5_000),
  backoffMs: z.number().int().min(100).max(60_000).default(1_000),
});
export type ExecutionJobInput = z.infer<typeof executionJobInputSchema>;

export const auditImportPayloadSchema = z.strictObject({
  importId: z.uuid().transform((value) => value.toLowerCase()),
});
export const executionWorkInputSchema = z.discriminatedUnion('kind', [
  executionJobInputSchema,
  executionJobInputSchema.extend({
    kind: z.literal('audit.import'),
    action: z.literal('audit.import'),
    payload: auditImportPayloadSchema,
  }),
]);
export type ExecutionWorkInput = z.infer<typeof executionWorkInputSchema>;

export const executionControlInputSchema = z.strictObject({
  emergencyStop: z.boolean(),
  concurrencyLimit: z.number().int().min(1).max(32),
  rateLimit: z.number().int().min(1).max(1_000),
});
export type ExecutionControlInput = z.infer<typeof executionControlInputSchema>;
