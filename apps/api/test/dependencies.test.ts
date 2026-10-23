import { randomUUID } from 'node:crypto';
import { apiEnvSchema } from '@bump/contracts';
import { createAuditRepository, createDatabase } from '@bump/db';
import { runLoi25Audit } from '@bump/worker/loi25';
import type { FastifyBaseLogger } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDependencies } from '../src/dependencies.js';

vi.mock('@bump/db', () => ({ createDatabase: vi.fn(), createAuditRepository: vi.fn() }));
vi.mock('@bump/worker/loi25', () => ({ runLoi25Audit: vi.fn() }));
vi.mock('ioredis', () => ({
  Redis: class {
    on() {
      return this;
    }
    async connect() {}
    async ping() {
      throw new Error('Redis unavailable');
    }
    disconnect() {}
  },
}));

const logger = { warn: vi.fn(), error: vi.fn() } as unknown as FastifyBaseLogger;
const query = vi.fn();
const close = vi.fn(async () => {});
const repository = {
  create: vi.fn(async (_input: unknown, id: string = randomUUID()) => id),
  status: vi.fn(async () => {}),
  save: vi.fn(async () => {}),
  get: vi.fn(async () => undefined),
  updateFinding: vi.fn(async () => false),
};
const instances: ReturnType<typeof createDependencies>[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createDatabase).mockReturnValue({
    db: {},
    pool: { query, on() {}, end: close },
  } as unknown as ReturnType<typeof createDatabase>);
  vi.mocked(createAuditRepository).mockReturnValue(repository);
  vi.mocked(runLoi25Audit).mockImplementation(async (input, auditId = randomUUID()) => ({
    ...input,
    auditId,
    status: 'COMPLETED',
    score: 100,
    grade: 'A',
    summaryFr: 'Synthétique',
    findings: [],
    scannedAt: new Date().toISOString(),
  }));
});
afterEach(async () => {
  await Promise.all(instances.splice(0).map((instance) => instance.close()));
});

describe('development audit dependencies', () => {
  it.each(['connection refused', 'relation audits does not exist'])(
    'runs and retains a memory report without environment configuration: %s',
    async (error) => {
      query.mockRejectedValue(new Error(error));
      const dependencies = createDependencies(apiEnvSchema.parse({}), logger);
      instances.push(dependencies);
      await dependencies.start();
      const service = await dependencies.audits!();
      expect(service.storage).toBe('memory');
      const report = await service.create({ companyName: 'Exemple', domain: 'example.com' });
      expect(report.status).toBe('COMPLETED');
      expect(await (await dependencies.audits!()).get(report.auditId)).toEqual(report);
      expect(createAuditRepository).not.toHaveBeenCalled();
    },
  );
  it('uses PostgreSQL directly in development even when Redis and the queue worker are unavailable', async () => {
    query.mockResolvedValue({ rows: [] });
    const dependencies = createDependencies(apiEnvSchema.parse({}), logger);
    instances.push(dependencies);
    const service = await dependencies.audits!();
    expect(service.storage).toBe('postgres');
    const report = await service.create({ companyName: 'Exemple', domain: 'example.com' });
    expect(runLoi25Audit).toHaveBeenCalledWith(
      { companyName: 'Exemple', domain: 'example.com' },
      report.auditId,
    );
    expect(repository.save).toHaveBeenCalledWith(report, { checks: [] });
  });
});
