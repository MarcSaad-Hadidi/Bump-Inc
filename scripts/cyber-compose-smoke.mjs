import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export async function runCyberComposeSmoke({ origin, cookie, organizationId, userId, post }) {
  let phase = 'worker capabilities';
  const base = `/organizations/${organizationId}/cyber`;
  const get = (path, session = cookie) =>
    fetch(new URL(path, origin), {
      headers: { cookie: session },
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
  try {
    // The Compose worker imports reports offline; it has no native scanner runner.
    let capabilities;
    const capabilityDeadline = performance.now() + 15000;
    do {
      const response = await get(`${base}/engines`);
      assert.equal(response.status, 200);
      capabilities = await response.json();
      if (capabilities.some((engine) => engine.id === 'json' && engine.available)) break;
      await delay(1000);
    } while (performance.now() < capabilityDeadline);
    assert.ok(capabilities.some((engine) => engine.id === 'json' && engine.available));
    assert.ok(
      ['semgrep', 'trivy', 'gitleaks', 'web-passive'].every((id) =>
        capabilities.some((engine) => engine.id === id && !engine.available),
      ),
    );

    phase = 'client and repository asset';
    const clientResponse = await post(
      `${base}/clients`,
      {
        name: 'Laboratoire SYNTHÉTIQUE Compose',
        contact: 'cyber-compose@example.invalid',
      },
      cookie,
    );
    assert.equal(clientResponse.status, 201);
    const client = await clientResponse.json();
    const assetResponse = await post(
      `${base}/assets`,
      {
        clientId: client.id,
        label: 'Dépôt SYNTHÉTIQUE hors ligne',
        target: { kind: 'repository', value: `lab/compose-${randomUUID()}` },
        exposure: 'internal',
      },
      cookie,
    );
    assert.equal(assetResponse.status, 201);
    const asset = await assetResponse.json();

    phase = 'explicit mandate approval';
    const mandateResponse = await post(
      `${base}/mandates`,
      {
        clientId: client.id,
        reference: 'SYNTHETIC-COMPOSE-CYBER',
        signedBy: 'Responsable du laboratoire Compose',
        authorizedAt: new Date(Date.now() - 60000).toISOString(),
        responsibleUserId: userId,
        authorizationText:
          'Autorisation SYNTHÉTIQUE limitée à cet import JSON hors ligne, sans cible externe.',
        emergencyContact: 'cyber-compose@example.invalid',
        validFrom: new Date(Date.now() - 60000).toISOString(),
        validUntil: new Date(Date.now() + 3600000).toISOString(),
        assetIds: [asset.id],
        engines: ['json'],
        mode: 'passive',
        limitations: 'Import de test déclaré ; aucun scanner natif ni accès réseau externe.',
      },
      cookie,
    );
    assert.equal(mandateResponse.status, 201);
    const mandate = await mandateResponse.json();
    assert.equal(
      (await post(`${base}/mandates/${mandate.id}/approve`, { confirm: true }, cookie)).status,
      200,
    );

    phase = 'encrypted JSON source import';
    const sourceText = JSON.stringify({
      version: 1,
      engine: 'semgrep',
      engineVersion: '1.183.0',
      report: {
        version: '1.183.0',
        errors: [],
        results: [
          {
            check_id: 'bump.python.dynamic-eval',
            path: 'app.py',
            start: { line: 2 },
            extra: { severity: 'ERROR' },
          },
        ],
      },
    });
    const sourceResponse = await post(
      `${base}/imports`,
      {
        assetId: asset.id,
        name: 'Rapport Semgrep SYNTHÉTIQUE importé',
        format: 'json',
        sourceText,
      },
      cookie,
    );
    assert.equal(sourceResponse.status, 201);
    const source = await sourceResponse.json();
    assert.equal(source.kind, 'json');
    assert.ok(source.assetId === asset.id);
    assert.ok(source.sha256 === createHash('sha256').update(sourceText).digest('hex'));
    assert.equal(Object.hasOwn(source, 'ciphertext'), false);
    assert.equal(Object.hasOwn(source, 'sourceText'), false);

    phase = 'separate worker import execution';
    const launched = await post(
      `${base}/audits`,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: [asset.id],
        engines: ['json'],
        idempotencyKey: randomUUID(),
        title: 'Audit SYNTHÉTIQUE Compose par import hors ligne',
      },
      cookie,
    );
    assert.equal(launched.status, 201);
    const audit = await launched.json();
    let snapshot;
    let scan;
    const deadline = performance.now() + 35000;
    do {
      const response = await get(`${base}/snapshot`);
      assert.equal(response.status, 200);
      snapshot = await response.json();
      scan = snapshot.scans.find((entry) => entry.scan.auditId === audit.id);
      if (scan?.status === 'succeeded') break;
      assert.ok(!scan || ['queued', 'running', 'retry_wait'].includes(scan.status));
      await delay(1000);
    } while (performance.now() < deadline);
    assert.equal(scan?.status, 'succeeded');
    assert.equal(scan.scan.engine, 'json');
    assert.ok(scan.scan.sourceId === source.id && scan.scan.assetId === asset.id);
    assert.equal(scan.scan.observationCount, 1);
    assert.equal(scan.scan.coverageHash, '');
    const executionResponse = await get(
      `/organizations/${organizationId}/executions/${scan.scan.executionJobId}`,
    );
    assert.equal(executionResponse.status, 200);
    const execution = await executionResponse.json();
    assert.equal(execution.status, 'succeeded');
    assert.equal(execution.kind, 'cyber.scan');
    assert.equal(execution.leaseToken, undefined);
    const findings = snapshot.findings.filter(
      (entry) => entry.clientId === client.id && entry.lastAuditId === audit.id,
    );
    assert.equal(findings.length, 1);
    const finding = findings[0];
    assert.equal(finding.status, 'to_review');
    assert.equal(finding.observation.engine, 'semgrep');
    assert.ok(finding.observation.engineVersion.endsWith(' (imported)'));
    assert.ok(
      snapshot.sources.every(
        (entry) => !Object.hasOwn(entry, 'ciphertext') && !Object.hasOwn(entry, 'sourceText'),
      ),
    );

    phase = 'explicit human finding review';
    const reviewedResponse = await fetch(new URL(`${base}/findings/${finding.id}`, origin), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', origin, cookie },
      body: JSON.stringify({
        status: 'confirmed',
        note: 'Revue humaine SYNTHÉTIQUE du signal importé, sans attestation de scan natif.',
        businessImpact: 'Impact limité au laboratoire de validation Compose.',
        recommendation: 'Examiner et corriger le motif dans le dépôt synthétique.',
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(reviewedResponse.status, 200);
    assert.equal((await reviewedResponse.json()).status, 'confirmed');

    phase = 'private report draft';
    const draftedResponse = await post(
      `${base}/reports`,
      {
        auditId: audit.id,
        locale: 'fr',
        executiveSummary: 'Rapport SYNTHÉTIQUE : import hors ligne et revue humaine dans Compose.',
        reviewNotes:
          'Couverture limitée au rapport déclaré ; aucune exécution native ou cible externe.',
      },
      cookie,
    );
    assert.equal(draftedResponse.status, 201);
    const report = await draftedResponse.json();
    assert.ok(typeof report.sha256 === 'string' && /^[a-f0-9]{64}$/.test(report.sha256));
    assert.equal(report.approvedAt, null);
    assert.ok(
      report.snapshot.organizationId === organizationId && report.snapshot.audit.id === audit.id,
    );
    assert.equal(report.snapshot.findings.length, 1);
    assert.equal(report.snapshot.findings[0].status, 'confirmed');
    const reportBase = `${base}/reports/${report.id}`;
    assert.equal((await get(`${reportBase}/pdf`)).status, 409);

    phase = 'approval bound to the exact report digest';
    const wrongDigest = `${report.sha256.startsWith('0') ? '1' : '0'}${report.sha256.slice(1)}`;
    assert.equal(
      (await post(`${reportBase}/approve`, { confirm: true, expectedSha256: wrongDigest }, cookie))
        .status,
      409,
    );
    const approvedResponse = await post(
      `${reportBase}/approve`,
      {
        confirm: true,
        expectedSha256: report.sha256,
      },
      cookie,
    );
    assert.equal(approvedResponse.status, 200);
    const approved = await approvedResponse.json();
    assert.ok(approved.sha256 === report.sha256 && typeof approved.approvedAt === 'string');

    phase = 'deployed PDF renderer, embedded font and private headers';
    const pdfResponse = await get(`${reportBase}/pdf`);
    assert.equal(pdfResponse.status, 200);
    assert.match(pdfResponse.headers.get('content-type') ?? '', /^application\/pdf(?:;|$)/);
    assert.match(pdfResponse.headers.get('cache-control') ?? '', /private/);
    assert.match(pdfResponse.headers.get('cache-control') ?? '', /no-store/);
    assert.match(pdfResponse.headers.get('content-disposition') ?? '', /^attachment;/);
    assert.equal(pdfResponse.headers.get('x-content-type-options'), 'nosniff');
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length > 10000 && pdf.length <= 20000000);
    const pdfStructure = pdf.toString('latin1');
    assert.ok(pdfStructure.includes('/Type /Pages'));
    assert.ok(pdfStructure.includes('/FontFile2') && pdfStructure.includes('DejaVuSans'));
    assert.ok(pdf.subarray(-20).toString().includes('%%EOF'));

    phase = 'unauthenticated private export denial';
    assert.equal((await get(`${reportBase}/pdf`, '')).status, 401);
    assert.equal((await get(`${base}/snapshot`, '')).status, 401);
    console.log(
      'Compose Cyber encrypted import, separate worker, human review and approved private PDF passed.',
    );
  } catch {
    // Neither a response body/report nor a downstream error reaches CI logs.
    throw new Error(`Compose Cyber smoke failed during ${phase}`);
  }
}
