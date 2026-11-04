import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Snapshot } from '../../apps/web/src/app/cyber/types.js';
import { createCyberBrowserPerson } from './cyber-fixture.js';

test.use({ actionTimeout: 10000, reducedMotion: 'reduce' });

test('synthetic private Cyber workflow uses a real worker, human review and approved PDF', async ({
  page,
}) => {
  test.setTimeout(150000);
  const person = await createCyberBrowserPerson();
  let organizationId = '';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.name));
  const navigation = (name: string) =>
    page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('button', { name: new RegExp(`^${name}(?:\\s*\\d+)?$`) });
  const dialog = () => page.getByRole('dialog');
  async function snapshot(): Promise<Snapshot> {
    const response = await page.request.get(
      `/api/cyber/organizations/${organizationId}/cyber/snapshot`,
    );
    expect(response.status()).toBe(200);
    return (await response.json()) as Snapshot;
  }
  async function save() {
    await dialog().getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
  }
  async function close() {
    await dialog().getByRole('button', { name: 'Fermer / Close' }).click();
    await expect(dialog()).toHaveCount(0);
  }
  async function upload(native: boolean, clean: boolean) {
    await navigation('Clients').click();
    await page.getByRole('button', { name: 'Importer une source', exact: true }).click();
    await dialog()
      .getByLabel('Nom de la source')
      .fill(
        `SYNTHÉTIQUE ${clean ? 'corrigé' : 'initial'} ${native ? 'fichiers' : 'import contrôlé'}`,
      );
    if (native) {
      await dialog()
        .getByLabel('Choisir des fichiers texte', { exact: true })
        .setInputFiles({
          name: 'app.py',
          mimeType: 'text/plain',
          buffer: Buffer.from(
            clean
              ? 'print("synthetic corrected laboratory")\n'
              : 'value = input()\nprint(eval(value))\n',
          ),
        });
    } else {
      await dialog().getByRole('combobox', { name: 'Source', exact: true }).selectOption('json');
      await dialog()
        .getByLabel('Fichier du rapport', { exact: true })
        .setInputFiles({
          name: 'synthetic-controlled-report.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            JSON.stringify({
              version: 1,
              engine: 'semgrep',
              engineVersion: '1.183.0',
              report: {
                version: '1.183.0',
                errors: [],
                results: clean
                  ? []
                  : [
                      {
                        check_id: 'bump.python.dynamic-eval',
                        path: 'app.py',
                        start: { line: 2 },
                        extra: { severity: 'ERROR' },
                      },
                    ],
              },
            }),
          ),
        });
    }
    await dialog().getByRole('button', { name: 'Importer une source', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
  }
  async function launch(title: string, engine: 'semgrep' | 'json') {
    await navigation('Audits').click();
    await page.getByRole('button', { name: 'Nouvel audit', exact: true }).click();
    const next = () => dialog().getByRole('button', { name: 'Continuer', exact: true }).click();
    await dialog()
      .getByRole('combobox', { name: 'Client', exact: true })
      .selectOption({ label: 'PME SYNTHÉTIQUE — laboratoire' });
    await next();
    await dialog()
      .getByRole('radio', { name: /SYNTHETIC-BROWSER-ONLY/ })
      .check();
    await next();
    await dialog()
      .getByRole('checkbox', { name: /Dépôt synthétique/ })
      .check();
    await next();
    await dialog()
      .getByRole('checkbox', {
        name: engine === 'semgrep' ? 'Code' : 'Rapports importés',
        exact: true,
      })
      .check();
    await next();
    await dialog()
      .getByRole('checkbox', { name: new RegExp(`^${engine}`) })
      .check();
    await next();
    await dialog().getByLabel('Titre de l’audit').fill(title);
    await next();
    await dialog()
      .getByRole('checkbox', { name: /Je confirme le mandat/ })
      .check();
    const created = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/cyber/audits'),
    );
    await dialog().getByRole('button', { name: 'Lancer l’audit autorisé', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const audit = (await response.json()) as { id: string };
    await expect(dialog()).toHaveCount(0);
    await expect
      .poll(
        async () => {
          const state = await snapshot();
          return state.scans.filter((s) => s.scan.auditId === audit.id).map((s) => s.status);
        },
        { timeout: 40000 },
      )
      .toEqual(['succeeded']);
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    return audit.id;
  }
  try {
    await page.setViewportSize({ width: 1536, height: 1024 });
    await page.goto('/cyber');
    await expect(page.getByRole('heading', { name: 'Se connecter', exact: true })).toBeVisible();
    await page.screenshot({ path: '.artifacts/cyber-login.png', fullPage: true });
    await page.getByLabel('Courriel', { exact: true }).fill(person.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(person.password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await page.getByLabel('Nom de l’organisation').fill('Bump — laboratoire SYNTHÉTIQUE');
    await page.getByLabel('Identifiant unique de l’espace').fill(`synthetic-${randomUUID()}`);
    const createdOrganization = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().endsWith('/api/cyber/organizations'),
    );
    await page.getByRole('button', { name: 'Créer l’espace Bump', exact: true }).click();
    const organizationResponse = await createdOrganization;
    expect(organizationResponse.status()).toBe(201);
    organizationId = ((await organizationResponse.json()) as { id: string }).id;
    person.organizations.push(organizationId);
    await expect(page.getByRole('heading', { name: 'Vue d’ensemble', exact: true })).toBeVisible();
    await expect(page.getByText('Aucun audit pour le moment.', { exact: true })).toBeVisible();
    await page.screenshot({ path: '.artifacts/cyber-empty.png', fullPage: true });
    const capabilitiesResponse = await page.request.get(
      `/api/cyber/organizations/${organizationId}/cyber/engines`,
    );
    expect(capabilitiesResponse.status()).toBe(200);
    let capabilities = (await capabilitiesResponse.json()) as {
      id: string;
      available: boolean;
      reason?: string | null;
    }[];
    await expect
      .poll(
        async () => {
          const response = await page.request.get(
            `/api/cyber/organizations/${organizationId}/cyber/engines`,
          );
          capabilities = await response.json();
          return capabilities.every((c) => c.reason !== 'starting');
        },
        { timeout: 15000 },
      )
      .toBe(true);
    const native = capabilities.some((c) => c.id === 'semgrep' && c.available);
    const engine = native ? 'semgrep' : 'json';
    test.info().annotations.push({
      type: 'execution',
      description: native
        ? 'Real pinned Semgrep through the separate worker'
        : 'Verified synthetic JSON import through the separate worker; native isolation unavailable',
    });

    await navigation('Clients').click();
    await page.getByRole('button', { name: 'Créer un client', exact: true }).click();
    await dialog().getByLabel('Nom', { exact: true }).fill('PME SYNTHÉTIQUE — laboratoire');
    await dialog().getByLabel('Contact habilité').fill('lab@example.invalid');
    await save();
    await expect(
      page.getByRole('heading', { name: 'PME SYNTHÉTIQUE — laboratoire', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter un actif', exact: true }).click();
    await dialog().getByLabel('Libellé', { exact: true }).fill('Dépôt synthétique');
    await dialog().getByLabel('Cible exacte', { exact: false }).fill('laboratory/synthetic');
    await save();
    await page.getByRole('button', { name: 'Enregistrer un mandat', exact: true }).click();
    await dialog().getByLabel('Référence du mandat').fill('SYNTHETIC-BROWSER-ONLY');
    await dialog().getByLabel('Signataire habilité').fill('Responsable du laboratoire synthétique');
    await dialog().getByLabel('Contact d’urgence').fill('lab@example.invalid');
    await dialog()
      .getByLabel('Expiration du mandat')
      .fill(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
    await dialog()
      .getByLabel('Autorisation écrite', { exact: true })
      .fill(
        'Autorisation synthétique du propriétaire pour analyser exclusivement les fichiers contrôlés de laboratory/synthetic. Aucun système client ou public.',
      );
    await dialog()
      .getByRole('group', { name: /^Actifs ·/ })
      .getByRole('checkbox', { name: /Dépôt synthétique/ })
      .check();
    await dialog()
      .getByRole('checkbox', { name: new RegExp(`^${engine}`) })
      .check();
    await dialog()
      .getByLabel('Limites et exclusions du mandat')
      .fill(
        'Laboratoire synthétique hors ligne uniquement. Aucun accès public et aucune exploitation.',
      );
    await dialog()
      .getByRole('checkbox', { name: /Je dispose de cette autorisation écrite/ })
      .check();
    await save();
    await page.getByRole('button', { name: 'Approuver explicitement', exact: true }).click();
    await dialog().getByRole('checkbox').check();
    await dialog().getByRole('button', { name: 'Approuver explicitement', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
    await upload(native, false);
    const initialAudit = await launch('SYNTHÉTIQUE — audit initial', engine);
    let state = await snapshot();
    expect(state.findings).toHaveLength(1);
    expect(state.findings[0]?.status).toBe('to_review');
    await navigation('Constats').click();
    await page.getByRole('button', { name: 'Dynamic evaluation of input', exact: true }).click();
    await dialog().getByRole('button', { name: 'Validation humaine', exact: true }).click();
    await dialog()
      .getByRole('combobox', { name: 'Validation humaine', exact: true })
      .selectOption('confirmed');
    await dialog()
      .getByLabel('Impact métier évalué')
      .fill('Impact synthétique contrôlé : exécution de code dans le laboratoire.');
    await dialog()
      .getByRole('textbox', { name: 'Correction recommandée', exact: true })
      .fill('Supprimer eval et utiliser une validation explicite des entrées.');
    await dialog()
      .getByLabel('Note de revue et justification')
      .fill(
        'Examen manuel synthétique de la règle et de la ligne, sans exploitation d’un système réel.',
      );
    await dialog().getByRole('button', { name: 'Enregistrer la décision humaine' }).click();
    await expect.poll(async () => (await snapshot()).findings[0]?.status).toBe('confirmed');
    await close();
    await navigation('Remédiation').click();
    await page.getByRole('button', { name: 'Assigner une correction', exact: true }).click();
    await dialog()
      .getByLabel('Responsable de la correction')
      .fill('Ingénieur du laboratoire synthétique');
    await dialog()
      .getByLabel('Échéance', { exact: true })
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await dialog()
      .getByLabel('Action à réaliser')
      .fill('Remplacer l’évaluation dynamique dans app.py, puis soumettre un nouvel instantané.');
    await save();
    await upload(native, true);
    const verificationAudit = await launch('SYNTHÉTIQUE — vérification contrôlée', engine);
    await navigation('Constats').click();
    await page.getByRole('button', { name: 'Dynamic evaluation of input', exact: true }).click();
    await dialog().getByRole('button', { name: 'Enregistrer un retest', exact: true }).click();
    await dialog()
      .getByRole('combobox', { name: 'Audit de vérification', exact: true })
      .selectOption(verificationAudit);
    await dialog()
      .getByRole('combobox', { name: 'Conclusion humaine', exact: true })
      .selectOption(native ? 'absent' : 'inconclusive');
    await dialog()
      .getByLabel('Note de revue et justification')
      .fill(
        native
          ? 'Retest synthétique réel par Semgrep, même actif et même couverture, constat absent après correction.'
          : 'Import synthétique contrôlé. La couverture native ne peut être attestée ; aucune correction vérifiée n’est déclarée.',
      );
    await dialog().getByRole('button', { name: 'Enregistrer un retest', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
    state = await snapshot();
    expect(state.retests[0]?.conclusion).toBe(native ? 'absent' : 'inconclusive');
    expect(state.findings[0]?.status).toBe(native ? 'verified_fixed' : 'confirmed');

    await navigation('Rapports').click();
    await page.getByRole('button', { name: 'Préparer un rapport', exact: true }).click();
    await dialog()
      .getByRole('combobox', { name: 'Audits', exact: true })
      .selectOption(verificationAudit);
    await dialog()
      .getByLabel('Résumé exécutif rédigé par le consultant')
      .fill(
        'Rapport SYNTHÉTIQUE de validation du parcours Bump Cyber. Aucun résultat d’un client réel.',
      );
    await dialog()
      .getByLabel('Limites et notes de revue du rapport')
      .fill(
        'Laboratoire contrôlé. Couverture limitée aux fichiers fournis ; les imports sont déclarés et non assimilés à une exécution native.',
      );
    await dialog().getByRole('button', { name: 'Préparer un rapport', exact: true }).click();
    await expect(dialog().getByRole('button', { name: 'Aperçu HTML privé' })).toBeVisible();
    state = await snapshot();
    const reportId = state.reports[0]!.id;
    const reportBase = `/api/cyber/organizations/${organizationId}/cyber/reports/${reportId}`;
    expect((await page.request.get(`${reportBase}/pdf`)).status()).toBe(409);
    await dialog().getByRole('button', { name: 'Aperçu HTML privé' }).click();
    await expect(
      dialog()
        .frameLocator('iframe')
        .getByText(/Preuves historiques d’un audit antérieur/),
    ).toBeVisible();
    await dialog()
      .getByRole('checkbox', { name: /Je valide cet instantané/ })
      .check();
    await dialog()
      .getByRole('button', { name: 'Valider la diffusion du rapport', exact: true })
      .click();
    await expect(dialog().getByRole('button', { name: 'Télécharger le PDF validé' })).toBeVisible();
    const download = page.waitForEvent('download');
    await dialog().getByRole('button', { name: 'Télécharger le PDF validé' }).click();
    await (await download).saveAs('.artifacts/cyber-e2e-report.pdf');
    expect((await readFile('.artifacts/cyber-e2e-report.pdf')).subarray(0, 5).toString()).toBe(
      '%PDF-',
    );
    await close();
    await navigation('Vue d’ensemble').click();
    await page.screenshot({ path: '.artifacts/cyber-dashboard.png', fullPage: true });
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Findings', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Findings', exact: true, level: 1 }),
    ).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
    await page.screenshot({ path: '.artifacts/cyber-mobile.png', fullPage: true });
    expect(errors).toEqual([]);
    const second = await page.request.post('/api/cyber/organizations', {
      headers: { origin: 'http://127.0.0.1:3100' },
      data: {
        name: 'Second SYNTHETIC organization',
        slug: `synthetic-other-${randomUUID()}`,
        locale: 'en',
      },
    });
    expect(second.status()).toBe(201);
    const secondId = ((await second.json()) as { id: string }).id;
    person.organizations.push(secondId);
    expect(
      (
        await page.request.get(`/api/cyber/organizations/${secondId}/cyber/reports/${reportId}`)
      ).status(),
    ).toBe(404);
    expect(
      (await page.request.get(`/api/cyber/organizations/${secondId}/cyber/snapshot`)).status(),
    ).toBe(200);
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('complementary')
      .getByRole('button', { name: /Consultant synthétique/ })
      .click();
    await dialog().getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    expect((await page.request.get(`${reportBase}/pdf`)).status()).toBe(401);
  } finally {
    await person.cleanup();
  }
});
