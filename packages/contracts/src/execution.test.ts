import { describe, expect, it } from 'vitest';
import { executionControlInputSchema, executionJobInputSchema } from './execution.js';

const input = {
  engagementId: '123e4567-e89b-42d3-a456-426614174000',
  expectedRevision: 1,
  target: { kind: 'hostname', value: 'EXAMPLE.TEST' },
  action: 'configuration.read',
  kind: 'synthetic',
  payload: {},
  idempotencyKey: 'example_1',
};

describe('execution trust boundaries', () => {
  it('canonicalizes targets and bounds the synthetic work and retry policy', () => {
    expect(executionJobInputSchema.parse(input)).toMatchObject({
      target: { value: 'example.test' },
      maxAttempts: 3,
      timeoutMs: 5_000,
      payload: { durationMs: 0, failUntilAttempt: 0 },
    });
    for (const change of [
      { maxAttempts: 6 },
      { timeoutMs: 0 },
      { backoffMs: 99 },
      { payload: { durationMs: 30_001 } },
      { payload: { command: 'echo unsafe' } },
      { kind: 'shell' },
      { userId: input.engagementId },
    ])
      expect(executionJobInputSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });

  it('rejects unbounded control values and unknown control fields', () => {
    const control = { emergencyStop: true, concurrencyLimit: 2, rateLimit: 30 };
    expect(executionControlInputSchema.safeParse(control).success).toBe(true);
    for (const change of [{ concurrencyLimit: 33 }, { rateLimit: 0 }, { global: true }])
      expect(executionControlInputSchema.safeParse({ ...control, ...change }).success).toBe(false);
  });
});
