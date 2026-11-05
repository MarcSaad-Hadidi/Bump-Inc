import { type CyberEngine, cyberEngineSchema, cyberId, cyberText } from '@bump/contracts';
import {
  approveCyberMandate,
  approveCyberReport,
  assignCyberRole,
  CyberError,
  cancelExecution,
  compareCyberAudits,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  createCyberReport,
  createCyberSource,
  createCyberTask,
  launchCyberAudit,
  purgeCyberArtifacts,
  readCyberFinding,
  readCyberReport,
  readCyberRoles,
  readCyberSnapshot,
  recordCyberRetest,
  renderCyberReportHtml,
  reviewCyberFinding,
  saveCyberSource,
  updateCyberClient,
  updateCyberTask,
} from '@bump/core';
import type { Database } from '@bump/db';
import { type CyberVault, loadCyberVault } from '@bump/integrations';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { renderCyberPdf } from './cyber-pdf.js';

const params = z.object({ organizationId: cyberId });
const selected = params.extend({ id: cyberId });
const descriptor = z.object({
  id: cyberEngineSchema,
  available: z.boolean(),
  version: z.string().max(100),
  reason: z.string().max(100).nullable().optional(),
});
export async function cyberCapabilities() {
  try {
    const origin = new URL(process.env.CYBER_WORKER_URL ?? 'http://127.0.0.1:3002');
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    )
      throw new Error();
    const response = await fetch(new URL('/cyber/scanners', origin), {
      signal: AbortSignal.timeout(2000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error();
    return z
      .array(descriptor)
      .max(6)
      .parse(await response.json());
  } catch {
    return (['semgrep', 'trivy', 'gitleaks', 'web-passive', 'json', 'sarif'] as const).map(
      (id) => ({ id, available: false, version: 'unavailable' }),
    );
  }
}
export async function registerCyberRoutes(
  app: FastifyInstance,
  database: Database,
  sessionFor: (request: FastifyRequest) => Promise<{ user: { id: string } }>,
  injectedVault?: CyberVault,
) {
  const base = '/organizations/:organizationId/cyber';
  let vaultPromise: Promise<CyberVault> | undefined;
  const vault = () =>
    injectedVault
      ? Promise.resolve(injectedVault)
      : (vaultPromise ??= loadCyberVault().catch(() => {
          vaultPromise = undefined;
          throw new CyberError(503, 'cyber_vault_unavailable');
        }));
  let renderingPdf = false;
  async function scopeFor(request: FastifyRequest) {
    const { user } = await sessionFor(request);
    return { ...params.parse(request.params), userId: user.id, requestId: request.id };
  }
  async function selectFor(request: FastifyRequest) {
    const scope = await scopeFor(request);
    return { ...scope, ...selected.parse(request.params) };
  }
  app.get(`${base}/snapshot`, async (req) => readCyberSnapshot(database, await scopeFor(req)));
  app.get(`${base}/engines`, async (req) => {
    await readCyberSnapshot(database, await scopeFor(req));
    return cyberCapabilities();
  });
  app.post(`${base}/clients`, async (req, reply) =>
    reply.code(201).send(await createCyberClient(database, await scopeFor(req), req.body)),
  );
  app.patch(`${base}/clients/:id`, async (req) => {
    const scope = await selectFor(req);
    return updateCyberClient(database, scope, scope.id, req.body);
  });
  app.post(`${base}/assets`, async (req, reply) =>
    reply.code(201).send(await createCyberAsset(database, await scopeFor(req), req.body)),
  );
  app.post(`${base}/mandates`, async (req, reply) =>
    reply.code(201).send(await createCyberMandate(database, await scopeFor(req), req.body)),
  );
  app.post(`${base}/mandates/:id/approve`, async (req) => {
    const scope = await selectFor(req);
    z.strictObject({ confirm: z.literal(true) }).parse(req.body);
    return approveCyberMandate(database, scope, scope.id);
  });
  app.post(`${base}/sources`, async (req, reply) => {
    const scope = await scopeFor(req);
    return reply.code(201).send(await createCyberSource(database, await vault(), scope, req.body));
  });
  app.post(`${base}/imports`, async (req, reply) => {
    const scope = await scopeFor(req);
    const data = z
      .strictObject({
        assetId: cyberId,
        name: cyberText(160),
        format: z.enum(['json', 'sarif']),
        sourceText: z.string().min(2).max(524288),
      })
      .parse(req.body);
    if (Buffer.byteLength(data.sourceText) > 524288)
      return reply.code(413).send({ error: 'Source too large' });
    // Parsing/normalization takes place in the authorized worker. Nothing imported is treated as confirmed.
    try {
      JSON.parse(data.sourceText);
    } catch {
      return reply.code(400).send({ error: 'Malformed report JSON' });
    }
    return reply
      .code(201)
      .send(
        await saveCyberSource(
          database,
          await vault(),
          scope,
          data.assetId,
          data.name,
          data.format,
          data.sourceText,
        ),
      );
  });
  app.post(`${base}/audits`, async (req, reply) => {
    const scope = await scopeFor(req);
    await vault();
    const available = (await cyberCapabilities())
      .filter((c) => c.available)
      .map((c) => c.id) as CyberEngine[];
    return reply.code(201).send(await launchCyberAudit(database, scope, req.body, available));
  });
  app.post(`${base}/jobs/:id/cancel`, async (req) => {
    const scope = await selectFor(req);
    z.strictObject({ confirm: z.literal(true) }).parse(req.body);
    const job = await cancelExecution(database, {
      organizationId: scope.organizationId,
      userId: scope.userId,
      requestId: scope.requestId,
      jobId: scope.id,
    });
    return { id: job.id, status: job.status, cancelRequestedAt: job.cancelRequestedAt };
  });
  app.get(`${base}/findings/:id`, async (req) => {
    const scope = await selectFor(req);
    return readCyberFinding(database, scope, scope.id);
  });
  app.patch(`${base}/findings/:id`, async (req) => {
    const scope = await selectFor(req);
    return reviewCyberFinding(database, scope, scope.id, req.body);
  });
  app.post(`${base}/tasks`, async (req, reply) =>
    reply.code(201).send(await createCyberTask(database, await scopeFor(req), req.body)),
  );
  app.patch(`${base}/tasks/:id`, async (req) => {
    const scope = await selectFor(req);
    return updateCyberTask(database, scope, scope.id, req.body);
  });
  app.post(`${base}/retests`, async (req, reply) =>
    reply.code(201).send(await recordCyberRetest(database, await scopeFor(req), req.body)),
  );
  app.post(`${base}/reports`, async (req, reply) =>
    reply.code(201).send(await createCyberReport(database, await scopeFor(req), req.body)),
  );
  app.get(`${base}/reports/:id`, async (req) => {
    const scope = await selectFor(req);
    return readCyberReport(database, scope, scope.id);
  });
  app.post(`${base}/reports/:id/approve`, async (req) => {
    const scope = await selectFor(req);
    const data = z
      .strictObject({
        confirm: z.literal(true),
        expectedSha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .parse(req.body);
    return approveCyberReport(database, scope, scope.id, data.expectedSha256);
  });
  app.get(`${base}/reports/:id/html`, async (req, reply) => {
    const scope = await selectFor(req);
    const report = await readCyberReport(database, scope, scope.id);
    return reply
      .type('text/html; charset=utf-8')
      .header('cache-control', 'private, no-store')
      .header('x-frame-options', 'SAMEORIGIN')
      .header(
        'content-security-policy',
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
      )
      .send(renderCyberReportHtml(report.snapshot, !!report.approvedAt));
  });
  app.get(`${base}/reports/:id/pdf`, async (req, reply) => {
    const scope = await selectFor(req);
    const report = await readCyberReport(database, scope, scope.id);
    if (!report.approvedAt) throw new CyberError(409, 'report_approval_required');
    if (renderingPdf) throw new CyberError(503, 'report_generation_busy');
    renderingPdf = true;
    try {
      const pdf = await renderCyberPdf(report.snapshot);
      return reply
        .type('application/pdf')
        .header('cache-control', 'private, no-store')
        .header('content-disposition', `attachment; filename="Bump-Cyber-${report.id}.pdf"`)
        .send(pdf);
    } finally {
      renderingPdf = false;
    }
  });
  app.get(`${base}/comparison`, async (req) => {
    const scope = await scopeFor(req);
    const q = z.strictObject({ before: cyberId, after: cyberId }).parse(req.query);
    return compareCyberAudits(database, scope, q.before, q.after);
  });
  app.post(`${base}/retention/purge`, async (req) => {
    const scope = await scopeFor(req);
    z.strictObject({ confirm: z.literal(true) }).parse(req.body);
    return purgeCyberArtifacts(database, scope);
  });
  app.put(`${base}/roles/:id`, async (req) => {
    const scope = await selectFor(req);
    const { role } = z
      .strictObject({ role: z.enum(['consultant', 'analyst', 'reviewer']) })
      .parse(req.body);
    return assignCyberRole(database, scope, scope.id, role);
  });
  app.get(`${base}/roles`, async (req) => readCyberRoles(database, await scopeFor(req)));
}
