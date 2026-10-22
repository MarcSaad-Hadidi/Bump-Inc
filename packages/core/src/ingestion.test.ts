import { randomUUID } from 'node:crypto';
import type { Database } from '@bump/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  finishAuditImport,
  queueAuditImport,
  readAuditImportForExecution,
  readAuditObservations,
  reserveAuditImport,
} from './ingestion.js';

const scope = { organizationId: randomUUID(), userId: randomUUID() };
const transaction = vi.fn();
const database = { db: { transaction } } as unknown as Database;
const input = {
  engagementId: randomUUID(),
  expectedRevision: 1,
  target: { kind: 'hostname' as const, value: 'example.invalid' },
  format: 'bump-json-v1' as const,
  sourceName: 'synthetic.json',
  sourceText: JSON.stringify({ version: 1, observations: [] }),
  idempotencyKey: 'synthetic',
};

describe('ingestion trust boundaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unsupported source profiles before reserving storage or entering a transaction', async () => {
    await expect(
      reserveAuditImport(database, {
        ...scope,
        requestId: randomUUID(),
        input: { ...input, sourceText: '{"version":2,"secret":"synthetic-sensitive"}' },
        storageBackend: 'local',
      }),
    ).rejects.toThrow('Invalid audit source');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects server provenance spoofing, invalid source names, and unsupported backends', async () => {
    for (const request of [
      { input: { ...input, storageKey: 'forged' }, storageBackend: 'local' },
      { input: { ...input, sourceName: '../source.json' }, storageBackend: 'local' },
      { input, storageBackend: 'public' },
    ]) {
      await expect(
        reserveAuditImport(database, {
          ...scope,
          requestId: randomUUID(),
          ...request,
        } as Parameters<typeof reserveAuditImport>[1]),
      ).rejects.toThrow(z.ZodError);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('bounds pagination and requires UUIDs for internal pointers and tokens', async () => {
    for (const page of [
      { offset: -1, limit: 1 },
      { offset: 1001, limit: 1 },
      { offset: 0, limit: 101 },
    ]) {
      await expect(
        readAuditObservations(database, { ...scope, importId: randomUUID(), ...page }),
      ).rejects.toThrow(z.ZodError);
    }
    await expect(
      queueAuditImport(database, { ...scope, requestId: randomUUID(), importId: 'forged' }),
    ).rejects.toThrow(z.ZodError);
    await expect(
      readAuditImportForExecution(database, {
        ...scope,
        jobId: randomUUID(),
        importId: randomUUID(),
        token: 'forged',
      }),
    ).rejects.toThrow(z.ZodError);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('validates canonical observations and the count before finalization', async () => {
    const attempt = { ...scope, jobId: randomUUID(), token: randomUUID() };
    await expect(
      finishAuditImport(database, {
        ...attempt,
        observations: [
          {
            kind: 'issue',
            title: 'Synthetic',
            reportedSeverity: 'unknown',
            sourcePointer: '/0',
            command: 'forged',
          },
        ],
      } as unknown as Parameters<typeof finishAuditImport>[1]),
    ).rejects.toThrow(z.ZodError);
    await expect(
      finishAuditImport(database, {
        ...attempt,
        observations: Array.from({ length: 1001 }, () => ({
          kind: 'issue' as const,
          title: 'Synthetic',
          reportedSeverity: 'unknown' as const,
          sourcePointer: '/0',
        })),
      }),
    ).rejects.toThrow(z.ZodError);
    expect(transaction).not.toHaveBeenCalled();
  });
});
