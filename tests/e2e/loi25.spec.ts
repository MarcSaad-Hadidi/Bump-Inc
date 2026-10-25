import { randomUUID } from 'node:crypto';
import { createAuditRepository, createDatabase, migrateDatabase } from '@bump/db';
import { expect, test } from '@playwright/test';

test('operator validation persists and controls the printable client proposal', async ({
  page,
}) => {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('_test'))
    throw new Error('Dedicated test database required');
  const database = createDatabase(url);
  const repository = createAuditRepository(database.db);
  const auditId = randomUUID();
  const findingId = randomUUID();
  const companyName = 'Entreprise synthétique';
  try {
    await migrateDatabase(url);
    await repository.create({ companyName, domain: 'example.com' }, auditId);
    await repository.save({
      auditId,
      companyName,
      domain: 'example.com',
      status: 'COMPLETED',
      score: 90,
      grade: 'A',
      summaryFr: 'Diagnostic synthétique à valider.',
      scannedAt: '2026-10-23T12:00:00.000Z',
      findings: [
        {
          id: findingId,
          category: 'SECURITE_COURRIEL_DNS',
          severity: 'ELEVE',
          titleFr: 'Protection DMARC à vérifier',
          lawArticle: 'Loi 25, art. 10',
          descriptionFr: 'Le domaine annonce p=none.',
          evidence: { records: ['v=DMARC1; p=none'] },
          businessRiskFr: 'Risque d’usurpation',
          remediationPitchFr: 'Déployer DMARC progressivement.',
          estimatedFixCad: 350,
          humanVerified: false,
        },
      ],
    });
    await page.goto(`/loi-25/rapport/${auditId}`);
    await expect(
      page.getByText('Aucun constat validé pour livraison.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Protection DMARC à vérifier' })).toHaveCount(0);
    await page.goto(`/loi-25?audit=${auditId}`);
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
    await page.getByLabel('Vérifié par un expert Bump (Human-in-the-loop)').check();
    await page.getByLabel('Estimation (CAD)').fill('525');
    await page
      .getByLabel('Intervention proposée')
      .fill('Inventorier les expéditeurs et activer DMARC.');
    await page.getByRole('button', { name: 'Enregistrer la validation' }).click();
    await expect(page.getByText('1 / 1 constats validés', { exact: false })).toBeVisible();
    expect((await repository.get(auditId))?.findings[0]).toMatchObject({
      humanVerified: true,
      estimatedFixCad: 525,
    });
    await page.getByRole('link', { name: 'Ouvrir le rapport client (PDF / Partage)' }).click();
    await expect(page.getByRole('heading', { name: 'Protection DMARC à vérifier' })).toBeVisible();
    await expect(page.locator('.proposal-total')).toContainText('525');
    await page.getByText('Preuve technique vérifiée', { exact: true }).click();
    await expect(page.getByText('v=DMARC1; p=none', { exact: false }).last()).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Imprimer / Enregistrer en PDF' })).toBeHidden();
    await page.screenshot({ path: '.artifacts/loi25-report.png', fullPage: true });
    await page.pdf({ path: '.artifacts/loi25-report.pdf', format: 'A4', printBackground: true });
  } finally {
    await database.pool.query('DELETE FROM audits WHERE id = $1', [auditId]);
    await database.pool.end();
  }
});
