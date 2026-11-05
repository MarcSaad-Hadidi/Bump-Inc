import { randomUUID } from 'node:crypto';
import type { Database, Transaction } from '@bump/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { authorizeEngagementInTransaction } from './engagements.js';
import {
  claimExecution,
  configureExecution,
  executionCheckpoint,
  finishExecution,
  submitExecution,
} from './execution.js';
import { authorizationDigest } from './policy.js';

const scope = {
  organizationId: 'b31903b5-8335-40fa-a65d-b867797c52bc',
  userId: 'bb10e0d8-3fa1-46cf-84a9-88ea340cb792',
};
const jobId = '99c239cd-4283-46ec-b311-8ab3a6a4bf68';
const token = randomUUID();
const requestId = '8c3212cb-9d07-4ff5-9dbb-184a37c73d08';
const transaction = vi.fn();
const query = vi.fn();
const database = { db: { transaction }, pool: { query } } as unknown as Database;
const job = {
  engagementId: jobId,
  expectedRevision: 1,
  target: { kind: 'hostname', value: 'api.example.test' },
  action: 'configuration.read',
  kind: 'synthetic',
  payload: {},
  idempotencyKey: 'unit-validation',
};

describe('execution input trust boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects executable handlers and actor spoofing before entering a transaction', async () => {
    for (const unsafe of [
      { ...job, kind: 'shell', payload: { command: 'anything' } },
      { ...job, kind: 'audit.import', action: 'audit.import', payload: { importId: jobId } },
      { ...job, actorUserId: scope.userId },
      { ...job, payload: { durationMs: 30_001 } },
    ]) {
      await expect(submitExecution(database, { ...scope, requestId, job: unsafe })).rejects.toThrow(
        z.ZodError,
      );
    }
    expect(transaction).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects unbounded controls, invalid leases, and arbitrary handler results', async () => {
    await expect(
      configureExecution(database, {
        ...scope,
        requestId,
        control: { emergencyStop: false, concurrencyLimit: 33, rateLimit: 1 },
      }),
    ).rejects.toThrow(z.ZodError);
    await expect(
      executionCheckpoint(database, { ...scope, jobId, token: 'untrusted' }),
    ).rejects.toThrow(z.ZodError);
    await expect(
      finishExecution(database, {
        ...scope,
        jobId,
        token,
        outcome: 'succeeded',
        result: { completed: true, output: 'sensitive' } as { completed: true },
      }),
    ).rejects.toThrow(z.ZodError);
    await expect(
      claimExecution(database, { ...scope, organizationId: 'unknown', jobId }),
    ).rejects.toThrow(z.ZodError);
    expect(transaction).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});

describe('PostgreSQL clock decoding', () => {
  it('keeps a future job queued when Drizzle returns a raw timestamp string', async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce({
        from: () => ({ where: () => ({ for: async () => [{ role: 'member' }] }) }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [
            {
              id: jobId,
              organizationId: scope.organizationId,
              actorUserId: scope.userId,
              status: 'queued',
              availableAt: new Date('2026-10-22T12:01:00Z'),
            },
          ],
        }),
      });
    const tx = {
      select,
      execute: vi.fn().mockResolvedValue({ rows: [{ value: '2026-10-22 12:00:00+00' }] }),
    };
    transaction.mockImplementationOnce((callback) => callback(tx));
    await expect(claimExecution(database, { ...scope, jobId })).resolves.toBeNull();
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('evaluates mandate validity using a decoded database date', async () => {
    const authorizationText = 'Synthetic written permission for the declared test hostname.';
    const rows = [
      [{ currentRevision: 1, revokedAt: null }],
      [
        {
          responsibleUserId: scope.userId,
          scope: { assets: [job.target], exclusions: [], actions: [job.action] },
          authorizationText,
          authorizationSha256: authorizationDigest(authorizationText),
          validFrom: new Date('2026-10-22T11:00:00Z'),
          validUntil: new Date('2026-10-22T13:00:00Z'),
        },
      ],
      [{ approverUserId: scope.userId }],
      [{ role: 'owner' }],
    ];
    const select = vi.fn().mockImplementation(() => ({
      from: () => ({
        where: () => {
          const result = Promise.resolve(rows.shift());
          return Object.assign(result, { for: () => result });
        },
      }),
    }));
    const tx = {
      select,
      execute: vi.fn().mockResolvedValue({ rows: [{ evaluated_at: '2026-10-22 12:00:00+00' }] }),
    } as unknown as Transaction;
    const decision = await authorizeEngagementInTransaction(tx, {
      ...scope,
      engagementId: jobId,
      expectedRevision: 1,
      target: { kind: 'hostname', value: 'api.example.test' },
      action: 'configuration.read',
    });
    expect(decision.allowed).toBe(true);
    expect(decision.evaluatedAt).toEqual(new Date('2026-10-22T12:00:00Z'));
  });
});
