import { randomUUID } from 'node:crypto';
import type { Loi25AuditReport } from '@bump/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuditRepository, createDatabase, migrateDatabase } from './index.js';

const url = process.env.DATABASE_URL;
if (process.env.NODE_ENV !== 'test' || !url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error('Dedicated test database required');
}
const database = createDatabase(url);
const repository = createAuditRepository(database.db);
const ids: string[] = [];
describe('audit persistence', () => {
  beforeAll(() => migrateDatabase(url));
  afterAll(async () => {
    await database.pool.query('DELETE FROM audits WHERE id = ANY($1::uuid[])', [ids]);
    await database.pool.end();
  });
  it('persists, scopes patches, rolls back failed replacement and cascades deletion', async () => {
    const input = { companyName: 'Exemple synthétique', domain: 'example.com' };
    const id = await repository.create(input);
    const other = await repository.create(input);
    ids.push(id, other);
    expect((await repository.get(id))?.status).toBe('PENDING');
    await repository.status(id, 'RUNNING');
    const finding = {
      id: randomUUID(),
      category: 'SECURITE_COURRIEL_DNS' as const,
      severity: 'ELEVE' as const,
      titleFr: 'DMARC à vérifier',
      lawArticle: 'Loi 25, art. 10',
      descriptionFr: 'Observation synthétique',
      evidence: { records: ['v=DMARC1; p=none'] },
      businessRiskFr: 'Usurpation',
      remediationPitchFr: 'Configurer DMARC',
      estimatedFixCad: 350,
      humanVerified: false,
    };
    const report: Loi25AuditReport = {
      ...input,
      auditId: id,
      status: 'COMPLETED',
      score: 90,
      grade: 'A',
      summaryFr: 'Synthétique',
      scannedAt: '2026-10-23T12:00:00.000Z',
      findings: [finding],
    };
    await repository.save(report, { source: 'synthetic' });
    expect(await repository.get(id)).toEqual(report);
    expect(await repository.updateFinding(other, finding.id, { humanVerified: true })).toBe(false);
    expect(
      await repository.updateFinding(id, finding.id, { humanVerified: true, estimatedFixCad: 0 }),
    ).toBe(true);
    expect((await repository.get(id))?.findings[0]).toMatchObject({
      humanVerified: true,
      estimatedFixCad: 0,
    });
    await expect(
      repository.save({ ...report, score: 0, findings: [finding, finding] }),
    ).rejects.toThrow();
    expect((await repository.get(id))?.score).toBe(90);
    expect((await repository.get(id))?.findings[0]?.humanVerified).toBe(true);
    await database.pool.query('DELETE FROM audits WHERE id = $1', [id]);
    expect(await repository.get(id)).toBeUndefined();
    expect(
      (await database.pool.query('SELECT id FROM audit_findings WHERE audit_id = $1', [id])).rows,
    ).toEqual([]);
  });
});
