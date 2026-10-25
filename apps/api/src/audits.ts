import { randomUUID } from 'node:crypto';
import {
  type CreateLoi25Audit,
  CreateLoi25AuditSchema,
  type Loi25AuditReport,
  type UpdateLoi25Finding,
  UpdateLoi25FindingSchema,
} from '@bump/contracts';
import { createAuditRepository, type createDatabase } from '@bump/db';
import { runLoi25Audit } from '@bump/worker/loi25';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export interface AuditService {
  create(input: CreateLoi25Audit): Promise<Loi25AuditReport>;
  get(id: string): Promise<Loi25AuditReport | undefined>;
  update(id: string, findingId: string, patch: UpdateLoi25Finding): Promise<boolean>;
  storage: 'postgres' | 'memory';
}

export function createAuditService(
  database: ReturnType<typeof createDatabase> | undefined,
  scan: (input: CreateLoi25Audit, auditId: string) => Promise<Loi25AuditReport> = runLoi25Audit,
  enqueue?: (id: string) => Promise<void>,
): AuditService {
  const repository = database ? createAuditRepository(database.db) : undefined;
  // ponytail: process-local fallback holds at most 100 reports for 24h; use PostgreSQL for durable/shared access.
  const memory = new Map<string, { report: Loi25AuditReport; expires: number }>();
  // ponytail: one scan per API process; add shared tenant quotas before multi-operator use.
  let scanning = false;
  function prune() {
    for (const [id, item] of memory) if (item.expires <= Date.now()) memory.delete(id);
  }
  return {
    storage: repository ? 'postgres' : 'memory',
    async create(input) {
      prune();
      if (scanning) throw Object.assign(new Error('Audit in progress'), { statusCode: 429 });
      if (!repository && memory.size >= 100)
        throw Object.assign(new Error('Local storage full'), { statusCode: 507 });
      const id = randomUUID();
      scanning = true;
      try {
        if (repository) {
          await repository.create(input, id);
          if (enqueue) {
            await enqueue(id);
            const report = await repository.get(id);
            if (!report || !['COMPLETED', 'FAILED'].includes(report.status))
              throw new Error('Audit unfinished');
            return report;
          }
          await repository.status(id, 'RUNNING');
        }
        const report = await scan(input, id);
        if (repository)
          await repository.save(report, {
            checks: report.findings.map((finding) => finding.evidence),
          });
        else memory.set(id, { report, expires: Date.now() + 86_400_000 });
        return report;
      } catch {
        if (repository) await repository.status(id, 'FAILED');
        throw new Error('Audit failed');
      } finally {
        scanning = false;
      }
    },
    async get(id) {
      if (repository) return repository.get(id);
      prune();
      return memory.has(id) ? structuredClone(memory.get(id)!.report) : undefined;
    },
    async update(id, findingId, patch) {
      if (repository) return repository.updateFinding(id, findingId, patch);
      prune();
      const finding = memory.get(id)?.report.findings.find((finding) => finding.id === findingId);
      if (!finding) return false;
      Object.assign(finding, patch);
      return true;
    },
  };
}

export function registerAuditRoutes(
  app: FastifyInstance,
  service: () => Promise<AuditService>,
  enabled: boolean,
) {
  const params = z.strictObject({ id: z.uuid() });
  app.register(async (routes) => {
    routes.addHook('onRequest', async (request, reply) => {
      // Identity/tenant/mandate modules do not exist yet. Never expose customer evidence publicly.
      if (!enabled || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.ip)) {
        return reply
          .code(403)
          .send({ error: 'Audits réservés au développement local.', requestId: request.id });
      }
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(request.headers.host ?? '')) {
        return reply.code(403).send({ error: 'Hôte local requis', requestId: request.id });
      }
      if (request.headers.origin || request.headers['sec-fetch-site'] === 'cross-site') {
        return reply
          .code(403)
          .send({ error: 'Utiliser la console locale.', requestId: request.id });
      }
      reply.header('x-audit-storage', (await service()).storage);
    });
    routes.post(
      '/api/audits/loi25',
      { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
      async (request) => {
        const input = CreateLoi25AuditSchema.parse(request.body);
        return (await service()).create(input);
      },
    );
    routes.get('/api/audits/:id', async (request, reply) => {
      const { id } = params.parse(request.params);
      const report = await (await service()).get(id);
      return report ?? reply.code(404).send({ error: 'Audit introuvable', requestId: request.id });
    });
    routes.patch('/api/audits/:id/findings/:findingId', async (request, reply) => {
      const { id, findingId } = params.extend({ findingId: z.uuid() }).parse(request.params);
      const patch = UpdateLoi25FindingSchema.parse(request.body);
      const audits = await service();
      if (!(await audits.update(id, findingId, patch)))
        return reply.code(404).send({ error: 'Constat introuvable', requestId: request.id });
      return audits.get(id);
    });
  });
}
