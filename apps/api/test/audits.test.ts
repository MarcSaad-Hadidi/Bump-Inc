import { randomUUID } from 'node:crypto';
import { apiEnvSchema, type Loi25AuditReport } from '@bump/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuditService } from '../src/audits.js';
import { buildServer } from '../src/server.js';

const env = apiEnvSchema.parse({
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://bump:test@localhost/bump_test',
  REDIS_URL: 'redis://localhost/1',
});
const apps: ReturnType<typeof buildServer>[] = [];
function setup(overrides = {}) {
  const scan = vi.fn(
    async (
      input: { companyName: string; domain: string },
      auditId: string,
    ): Promise<Loi25AuditReport> => ({
      ...input,
      auditId,
      status: 'COMPLETED',
      score: 90,
      grade: 'A',
      summaryFr: 'Repérage à valider.',
      scannedAt: new Date().toISOString(),
      findings: [
        {
          id: randomUUID(),
          category: 'SECURITE_COURRIEL_DNS',
          severity: 'ELEVE',
          titleFr: 'DMARC',
          lawArticle: 'art. 10',
          descriptionFr: 'À vérifier',
          evidence: { records: [] },
          businessRiskFr: 'Usurpation',
          remediationPitchFr: 'Configurer DMARC',
          estimatedFixCad: 350,
          humanVerified: false,
        },
      ],
    }),
  );
  const service = createAuditService(undefined, scan);
  const app = buildServer(
    { ...env, ...overrides },
    {
      start: async () => {},
      close: async () => {},
      database: async () => {},
      redis: async () => {},
      audits: async () => service,
    },
  );
  apps.push(app);
  return { app, scan, service };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.useRealTimers();
});

describe('local audit API', () => {
  it('creates, retrieves, and edits a report without losing verification=false or price=0', async () => {
    const { app, scan } = setup();
    const created = await app.inject({
      method: 'POST',
      url: '/api/audits/loi25',
      payload: { companyName: 'Exemple', domain: 'https://EXAMPLE.COM/' },
    });
    expect(created.statusCode).toBe(200);
    expect(created.headers['x-audit-storage']).toBe('memory');
    const report = created.json<Loi25AuditReport>();
    expect(scan).toHaveBeenCalledWith(
      { companyName: 'Exemple', domain: 'example.com' },
      report.auditId,
    );
    expect((await app.inject(`/api/audits/${report.auditId}`)).json()).toEqual(report);
    const findingId = report.findings[0]!.id;
    const patch = (payload: object) =>
      app.inject({
        method: 'PATCH',
        url: `/api/audits/${report.auditId}/findings/${findingId}`,
        payload,
      });
    expect(
      (await patch({ humanVerified: true })).json<Loi25AuditReport>().findings[0]?.humanVerified,
    ).toBe(true);
    const updated = await patch({
      humanVerified: false,
      estimatedFixCad: 0,
      remediationPitchFr: 'Plan revu',
    });
    expect(updated.json<Loi25AuditReport>().findings[0]).toMatchObject({
      humanVerified: false,
      estimatedFixCad: 0,
      remediationPitchFr: 'Plan revu',
    });
    expect((await patch({ severity: 'CONFORME' })).statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/api/audits/${randomUUID()}/findings/${findingId}`,
          payload: { humanVerified: true },
        })
      ).statusCode,
    ).toBe(404);
  });
  it('rejects invalid inputs and missing reports', async () => {
    const { app, scan } = setup();
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/audits/loi25',
          payload: { companyName: '', domain: '127.0.0.1' },
        })
      ).statusCode,
    ).toBe(400);
    expect(scan).not.toHaveBeenCalled();
    expect((await app.inject('/api/audits/invalid')).statusCode).toBe(400);
    expect((await app.inject(`/api/audits/${randomUUID()}`)).statusCode).toBe(404);
  });
  it('denies non-local, cross-origin, rebound-host and production access', async () => {
    const { app } = setup();
    for (const options of [
      { remoteAddress: '203.0.113.5' },
      { headers: { origin: 'https://evil.example' } },
      { headers: { host: 'evil.example' } },
      { headers: { 'sec-fetch-site': 'cross-site' } },
    ])
      expect(
        (await app.inject({ url: `/api/audits/${randomUUID()}`, ...options })).statusCode,
      ).toBe(403);
    const production = setup({ NODE_ENV: 'production' });
    expect((await production.app.inject(`/api/audits/${randomUUID()}`)).statusCode).toBe(403);
  });
  it('expires temporary evidence and prevents concurrent scans', async () => {
    const { service, scan } = setup();
    const input = { companyName: 'Exemple', domain: 'example.com' };
    const pending = service.create(input);
    await expect(service.create(input)).rejects.toMatchObject({ statusCode: 429 });
    const report = await pending;
    expect(scan).toHaveBeenCalledOnce();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 86_400_001);
    expect(await service.get(report.auditId)).toBeUndefined();
  });
});
