import { randomUUID } from 'node:crypto';
import {
  createDatabase,
  cyberAsset,
  cyberEvent,
  cyberFinding,
  cyberReport,
  cyberRetest,
  cyberSource,
  migrateDatabase,
  withTenant,
} from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { claimExecution } from '../execution.js';
import { approveCyberReport, createCyberReport, readCyberReport } from './reports.js';
import {
  approveCyberMandate,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  createCyberSource,
  createCyberTask,
  finishCyberScan,
  launchCyberAudit,
  readCyberSnapshot,
  recordCyberRetest,
  reviewCyberFinding,
} from './service.js';

const url = process.env.DATABASE_URL;
const migration = process.env.MIGRATION_DATABASE_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !url ||
  !migration ||
  !new URL(url).pathname.endsWith('_test')
)
  throw new Error('Dedicated test services required');
const db = createDatabase(url);
const admin = createDatabase(migration);
const user = randomUUID(),
  otherUser = randomUUID(),
  analyst = randomUUID(),
  org = randomUUID(),
  otherOrg = randomUUID();
const scope = { organizationId: org, userId: user, requestId: randomUUID() };
const other = { organizationId: otherOrg, userId: otherUser, requestId: randomUUID() };
const vault = createCyberVault(Buffer.alloc(32, 9));
let clientId: string, assetId: string, mandateId: string;
beforeAll(async () => {
  await migrateDatabase(migration);
  for (const id of [user, otherUser, analyst])
    await admin.pool.query(
      'INSERT INTO "user" (id,name,email,email_verified) VALUES ($1,$2,$3,true)',
      [id, 'Synthetic Cyber tester', `${id}@example.invalid`],
    );
  for (const id of [org, otherOrg])
    await admin.pool.query(
      'INSERT INTO organization (id,name,slug,created_at) VALUES ($1,$2,$1,now())',
      [id, 'Synthetic Cyber workspace'],
    );
  for (const [o, u, r] of [
    [org, user, 'owner'],
    [otherOrg, otherUser, 'owner'],
    [org, analyst, 'member'],
  ])
    await admin.pool.query(
      'INSERT INTO member (id,organization_id,user_id,role) VALUES ($1,$2,$3,$4)',
      [randomUUID(), o, u, r],
    );
});
afterAll(async () => {
  for (const table of [
    'cyber_event',
    'cyber_report',
    'cyber_retest',
    'cyber_task',
    'cyber_evidence',
    'cyber_observation',
    'cyber_finding',
    'cyber_scan',
    'cyber_audit',
    'cyber_source',
    'cyber_mandate',
    'cyber_asset',
    'cyber_client',
    'cyber_role',
    'execution_outbox',
    'execution_event',
    'execution_attempt',
    'execution_job',
    'execution_control',
    'engagement_approval',
    'engagement_version',
    'engagement',
    'organization_audit',
    'organization_settings',
    'member',
  ])
    await admin.pool.query(`DELETE FROM ${table} WHERE organization_id=ANY($1::text[])`, [
      [org, otherOrg],
    ]);
  await admin.pool.query('DELETE FROM organization WHERE id=ANY($1::text[])', [[org, otherOrg]]);
  await admin.pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [
    [user, otherUser, analyst],
  ]);
  await db.pool.end();
  await admin.pool.end();
});
it('creates clients and enforces server and RLS tenant boundaries', async () => {
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic Cyber client',
    contact: 'owner@example.invalid',
  });
  clientId = client.id;
  await expect(
    createCyberClient(db, { ...scope, userId: analyst }, { name: 'forbidden', contact: 'x' }),
  ).rejects.toMatchObject({ statusCode: 403 });
  const asset = await createCyberAsset(db, scope, {
    clientId,
    label: 'Synthetic repository',
    target: { kind: 'repository', value: 'lab/synthetic' },
  });
  assetId = asset.id;
  await expect(
    createCyberAsset(db, other, {
      clientId,
      label: 'forged',
      target: { kind: 'repository', value: 'lab/forged' },
    }),
  ).rejects.toMatchObject({ statusCode: 404 });
  expect((await readCyberSnapshot(db, other)).clients).toEqual([]);
  expect(
    await withTenant(db, other, (tx) =>
      tx.select().from(cyberAsset).where(eq(cyberAsset.id, asset.id)),
    ),
  ).toEqual([]);
});
it('requires explicit mandate approval and encrypts source before persistence', async () => {
  const mandate = await createCyberMandate(db, scope, {
    clientId,
    reference: 'SYNTHETIC-MANDATE',
    signedBy: 'Synthetic authorized owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: user,
    authorizationText:
      'Synthetic written authorization for offline static checks of the exact laboratory repository snapshot.',
    emergencyContact: 'lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: [assetId],
    engines: ['semgrep'],
    mode: 'passive',
    limitations: 'Synthetic local code only; no external targets.',
  });
  mandateId = mandate.id;
  const input = {
    clientId,
    mandateId,
    assetIds: [assetId],
    engines: ['semgrep'],
    idempotencyKey: randomUUID(),
    title: 'Synthetic initial audit',
  };
  await expect(launchCyberAudit(db, scope, input, ['semgrep'])).rejects.toMatchObject({
    statusCode: 403,
  });
  await approveCyberMandate(db, scope, mandateId);
  await expect(launchCyberAudit(db, scope, input, [])).rejects.toMatchObject({ statusCode: 503 });
  await expect(launchCyberAudit(db, scope, input, ['semgrep'])).rejects.toMatchObject({
    statusCode: 409,
  });
  await createCyberSource(db, vault, scope, {
    assetId,
    name: 'Synthetic code',
    files: [{ path: 'app.py', content: 'print("synthetic-private-source")' }],
  });
  const source = await withTenant(db, scope, (tx) => tx.select().from(cyberSource));
  expect(source[0]?.ciphertext).not.toContain('synthetic-private-source');
  expect(vault.open(`${org}/${source[0]!.id}`, source[0]!.ciphertext)).toContain(
    'synthetic-private-source',
  );
  const audit = await launchCyberAudit(db, scope, input, ['semgrep']);
  expect((await launchCyberAudit(db, scope, input, ['semgrep'])).id).toBe(audit.id);
  expect((await readCyberSnapshot(db, scope)).scans).toHaveLength(1);
  expect(JSON.stringify(await readCyberSnapshot(db, scope))).not.toContain(
    'synthetic-private-source',
  );
  await expect(
    launchCyberAudit(db, scope, { ...input, assetIds: [randomUUID()] }, ['semgrep']),
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    launchCyberAudit(
      db,
      { ...scope, userId: analyst },
      { ...input, idempotencyKey: randomUUID() },
      ['semgrep'],
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
});
it('rejects path traversal, arbitrary commands and cross-client foreign keys', async () => {
  await expect(
    createCyberSource(db, vault, scope, {
      assetId,
      name: 'malformed',
      files: [{ path: '../escape', content: 'x' }],
    }),
  ).rejects.toThrow();
  await expect(
    createCyberSource(db, vault, scope, {
      assetId,
      name: 'malformed',
      files: [{ path: 'safe.py', content: 'x' }],
      command: 'sh',
    }),
  ).rejects.toThrow();
  const another = await createCyberClient(db, scope, {
    name: 'Another synthetic client',
    contact: 'lab@example.invalid',
  });
  await expect(
    withTenant(db, scope, (tx) =>
      tx.insert(cyberSource).values({
        organizationId: org,
        clientId: another.id,
        assetId,
        name: 'forged',
        kind: 'files',
        ciphertext: 'encrypted-placeholder',
        sha256: 'a'.repeat(64),
        createdBy: user,
        expiresAt: new Date(Date.now() + 60000),
      }),
    ),
  ).rejects.toThrow();
});
it('denies cross-tenant review and disallows verified closure without a retest', async () => {
  const snapshot = await readCyberSnapshot(db, scope);
  const audit = snapshot.audits[0]!;
  const observation = {
    engine: 'semgrep' as const,
    engineVersion: 'synthetic',
    ruleId: 'synthetic-rule',
    title: 'Synthetic finding',
    severity: 'high' as const,
    confidence: 'medium' as const,
    location: 'app.py:1',
    component: '',
    affectedVersion: '',
    fixedVersion: '',
    cve: null,
    cvss: null,
    references: [],
    evidence: 'Synthetic safe evidence',
    recommendation: 'Review this synthetic pattern',
  };
  const [finding] = await withTenant(db, scope, (tx) =>
    tx
      .insert(cyberFinding)
      .values({
        organizationId: org,
        clientId,
        assetId,
        firstAuditId: audit.id,
        lastAuditId: audit.id,
        fingerprint: 'f'.repeat(64),
        observation,
      })
      .returning(),
  );
  const review = {
    status: 'confirmed',
    note: 'Synthetic human review',
    businessImpact: 'Synthetic impact',
    recommendation: 'Synthetic remediation',
  };
  await expect(reviewCyberFinding(db, other, finding!.id, review)).rejects.toMatchObject({
    statusCode: 404,
  });
  await expect(
    reviewCyberFinding(db, { ...scope, userId: analyst }, finding!.id, review),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect((await reviewCyberFinding(db, scope, finding!.id, review))?.status).toBe('confirmed');
  await expect(
    reviewCyberFinding(db, scope, finding!.id, { ...review, status: 'verified_fixed' }),
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    reviewCyberFinding(db, scope, finding!.id, { ...review, status: 'closed' }),
  ).rejects.toMatchObject({ statusCode: 409 });
});

it('cannot reuse an old clean audit to close a newly reopened finding', async () => {
  const observation = {
    engine: 'semgrep' as const,
    engineVersion: 'synthetic-1',
    ruleId: 'synthetic-reappearance',
    title: 'Synthetic finding',
    severity: 'high' as const,
    confidence: 'medium' as const,
    location: 'app.py:2',
    component: '',
    affectedVersion: '',
    fixedVersion: '',
    cve: null,
    cvss: null,
    references: [],
    evidence: 'Synthetic controlled evidence',
    recommendation: 'Synthetic corrective action',
  };
  async function execute(positive: boolean) {
    const audit = await launchCyberAudit(
      db,
      scope,
      {
        clientId,
        mandateId,
        assetIds: [assetId],
        engines: ['semgrep'],
        idempotencyKey: randomUUID(),
        title: 'Synthetic chronological retest',
      },
      ['semgrep'],
    );
    const scan = (await readCyberSnapshot(db, scope)).scans.find(
      (s) => s.scan.auditId === audit.id,
    )!.scan;
    const job = await claimExecution(db, {
      organizationId: org,
      userId: user,
      jobId: scan.executionJobId,
    });
    expect(job).not.toBeNull();
    await finishCyberScan(
      db,
      vault,
      { ...scope, scanId: scan.id, jobId: scan.executionJobId, token: job!.token },
      {
        raw: 'Synthetic controlled result',
        observations: positive ? [observation] : [],
        engineVersion: 'synthetic-1',
        coverageHash: 'c'.repeat(64),
      },
    );
    return audit;
  }
  await execute(true);
  const finding = (await readCyberSnapshot(db, scope)).findings.find(
    (f) => f.observation.ruleId === 'synthetic-reappearance',
  )!;
  const clean = await execute(false);
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic reviewed clean result B',
  });
  await execute(true);
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((f) => f.id === finding.id)?.status,
  ).toBe('to_review');
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: clean.id,
      conclusion: 'absent',
      note: 'Attempted replay of stale synthetic result B',
    }),
  ).rejects.toMatchObject({ statusCode: 409 });
});

it('freezes reviewed report snapshots, separates organizations and requires approval of the exact digest', async () => {
  const snapshot = await readCyberSnapshot(db, scope);
  const completed = snapshot.scans.find((s) => s.status === 'succeeded')!;
  const input = {
    auditId: completed.scan.auditId,
    locale: 'fr',
    executiveSummary: 'Synthetic reviewed summary',
    reviewNotes: 'Synthetic offline test; no production findings.',
  };
  const pending = snapshot.scans.find((s) => s.status === 'queued')!;
  await expect(
    createCyberReport(db, scope, { ...input, auditId: pending.scan.auditId }),
  ).rejects.toMatchObject({ code: 'audit_not_finished' });
  const draft = await createCyberReport(db, scope, input);
  expect(draft.snapshot.unreviewedCount).toBe(1);
  expect(draft.snapshot.findings).toEqual([]);
  expect(draft.approvedAt).toBeNull();
  await expect(readCyberReport(db, other, draft.id)).rejects.toMatchObject({ statusCode: 404 });
  await expect(readCyberReport(db, { ...scope, userId: analyst }, draft.id)).rejects.toMatchObject({
    statusCode: 403,
  });
  await expect(approveCyberReport(db, scope, draft.id, '0'.repeat(64))).rejects.toMatchObject({
    code: 'report_integrity_failed',
  });
  await expect(
    withTenant(db, scope, (tx) =>
      tx.update(cyberReport).set({ snapshot: {} }).where(eq(cyberReport.id, draft.id)),
    ),
  ).rejects.toThrow();
  const observation = snapshot.findings.find((f) => f.lastAuditId === completed.scan.auditId)!;
  await reviewCyberFinding(db, scope, observation.id, {
    status: 'confirmed',
    note: 'Synthetic manual verification',
    businessImpact: 'Synthetic lab impact',
    recommendation: 'Remove unsafe pattern',
  });
  expect((await readCyberReport(db, scope, draft.id)).snapshot.findings).toEqual([]);
  const reviewed = await createCyberReport(db, scope, input);
  expect(reviewed.snapshot.findings).toHaveLength(1);
  const approved = await approveCyberReport(db, scope, reviewed.id, reviewed.sha256);
  expect(approved.approvedAt).toBeInstanceOf(Date);
  const repeated = await approveCyberReport(db, scope, reviewed.id, reviewed.sha256);
  expect(repeated.approvedAt).toEqual(approved.approvedAt);
  expect((await readCyberReport(db, scope, reviewed.id)).sha256).toBe(reviewed.sha256);
});

async function reportResolutionScenario() {
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic report resolution client',
    contact: 'report-lab@example.invalid',
  });
  const asset = await createCyberAsset(db, scope, {
    clientId: client.id,
    label: 'Synthetic report repository',
    target: { kind: 'repository', value: `lab/report-${randomUUID()}` },
  });
  const mandate = await createCyberMandate(db, scope, {
    clientId: client.id,
    reference: 'SYNTHETIC-REPORT-RESOLUTION',
    signedBy: 'Synthetic laboratory owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: user,
    authorizationText: 'Synthetic written authorization limited to the offline report repository.',
    emergencyContact: 'report-lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: [asset.id],
    engines: ['semgrep'],
    mode: 'passive',
    limitations: 'Synthetic offline report fixtures only.',
  });
  await approveCyberMandate(db, scope, mandate.id);
  await createCyberSource(db, vault, scope, {
    assetId: asset.id,
    name: 'Synthetic report source',
    files: [{ path: 'report.py', content: 'print("synthetic")' }],
  });
  const observation = {
    engine: 'semgrep' as const,
    engineVersion: 'synthetic-report-1',
    ruleId: 'synthetic-report-resolution',
    title: 'Synthetic report resolution finding',
    severity: 'high' as const,
    confidence: 'medium' as const,
    location: 'report.py:1',
    component: '',
    affectedVersion: '',
    fixedVersion: '',
    cve: null,
    cvss: null,
    references: [],
    evidence: 'Original synthetic audit A evidence',
    recommendation: 'Synthetic corrective action',
  };
  async function execute(positive: boolean, evidence = observation.evidence) {
    const audit = await launchCyberAudit(
      db,
      scope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: [asset.id],
        engines: ['semgrep'],
        idempotencyKey: randomUUID(),
        title: positive ? 'Synthetic positive report audit' : 'Synthetic clean report retest',
      },
      ['semgrep'],
    );
    const scan = (await readCyberSnapshot(db, scope)).scans.find(
      (s) => s.scan.auditId === audit.id,
    )!.scan;
    const job = await claimExecution(db, {
      organizationId: org,
      userId: user,
      jobId: scan.executionJobId,
    });
    if (!job) throw new Error('Synthetic report scan could not be claimed');
    await finishCyberScan(
      db,
      vault,
      { ...scope, scanId: scan.id, jobId: scan.executionJobId, token: job.token },
      {
        raw: 'Synthetic report scanner result',
        observations: positive ? [{ ...observation, evidence }] : [],
        engineVersion: observation.engineVersion,
        coverageHash: 'd'.repeat(64),
      },
    );
    return audit;
  }
  const initial = await execute(true);
  const finding = (await readCyberSnapshot(db, scope)).findings.find(
    (f) => f.clientId === client.id,
  )!;
  const review = {
    note: 'Synthetic reviewed resolution',
    businessImpact: 'Synthetic laboratory impact',
    recommendation: 'Synthetic laboratory remediation',
  };
  await reviewCyberFinding(db, scope, finding.id, { ...review, status: 'confirmed' });
  await createCyberTask(db, scope, {
    findingId: finding.id,
    assignee: 'Synthetic consultant',
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    description: 'Synthetic report remediation task',
  });
  const input = {
    auditId: initial.id,
    locale: 'en',
    executiveSummary: 'Synthetic report resolution summary',
    reviewNotes: 'Synthetic offline review; no customer evidence.',
  };
  return { initial, finding, review, input, execute };
}

it('reports a clean audit retest with prior evidence and never substitutes a future detection', async () => {
  const scenario = await reportResolutionScenario();
  const clean = await scenario.execute(false);
  await recordCyberRetest(db, scope, {
    findingId: scenario.finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic reviewed clean audit B',
  });
  const report = await createCyberReport(db, scope, { ...scenario.input, auditId: clean.id });
  expect(report.snapshot.findings).toHaveLength(1);
  expect(report.snapshot.findings[0]).toMatchObject({
    id: scenario.finding.id,
    status: 'verified_fixed',
    evidenceAuditId: scenario.initial.id,
    evidenceFromSelectedAudit: false,
    observation: { evidence: 'Original synthetic audit A evidence' },
    resolution: { kind: 'verified_fixed' },
  });
  expect(report.snapshot.scans[0]?.observationCount).toBe(0);
  expect(report.snapshot.retests).toEqual([
    expect.objectContaining({
      findingId: scenario.finding.id,
      auditId: clean.id,
      conclusion: 'absent',
    }),
  ]);
  expect(report.snapshot.tasks).toHaveLength(1);
  await scenario.execute(true, 'Later unrelated audit C evidence');
  const laterClean = await scenario.execute(false);
  await recordCyberRetest(db, scope, {
    findingId: scenario.finding.id,
    auditId: laterClean.id,
    conclusion: 'absent',
    note: 'Synthetic later clean audit D',
  });
  const repeated = await createCyberReport(db, scope, { ...scenario.input, auditId: clean.id });
  expect(repeated.snapshot.findings[0]).toMatchObject({
    evidenceAuditId: scenario.initial.id,
    evidenceFromSelectedAudit: false,
    observation: { evidence: 'Original synthetic audit A evidence' },
  });
  expect(repeated.snapshot.retests.map((r) => r.auditId)).toEqual([clean.id]);
  expect((await readCyberReport(db, scope, report.id)).sha256).toBe(report.sha256);
});

it.each(['verified_fixed', 'accepted_risk', 'false_positive'] as const)(
  'keeps the recorded %s resolution when a finding is closed',
  async (resolution) => {
    const scenario = await reportResolutionScenario();
    let selectedAudit = scenario.initial;
    if (resolution === 'verified_fixed') {
      selectedAudit = await scenario.execute(false);
      await recordCyberRetest(db, scope, {
        findingId: scenario.finding.id,
        auditId: selectedAudit.id,
        conclusion: 'absent',
        note: 'Synthetic verified correction before closure',
      });
    } else {
      await reviewCyberFinding(db, scope, scenario.finding.id, {
        ...scenario.review,
        status: resolution,
      });
    }
    await reviewCyberFinding(db, scope, scenario.finding.id, {
      ...scenario.review,
      status: 'closed',
    });
    const report = await createCyberReport(db, scope, {
      ...scenario.input,
      auditId: selectedAudit.id,
    });
    expect(report.snapshot.unreviewedCount).toBe(0);
    if (resolution === 'false_positive') {
      expect(report.snapshot.falsePositiveCount).toBe(1);
      expect(report.snapshot.findings).toEqual([]);
      expect(report.snapshot.tasks).toEqual([]);
    } else {
      expect(report.snapshot.findings).toHaveLength(1);
      expect(report.snapshot.findings[0]).toMatchObject({
        id: scenario.finding.id,
        status: 'closed',
        resolution: { kind: resolution, reviewerId: user },
      });
      expect(report.snapshot.tasks).toHaveLength(1);
      expect(report.snapshot.retests).toHaveLength(resolution === 'verified_fixed' ? 1 : 0);
    }
  },
);

it('counts a closed finding with missing current resolution history as unreviewed', async () => {
  const scenario = await reportResolutionScenario();
  await reviewCyberFinding(db, scope, scenario.finding.id, {
    ...scenario.review,
    status: 'accepted_risk',
  });
  await reviewCyberFinding(db, scope, scenario.finding.id, {
    ...scenario.review,
    status: 'confirmed',
  });
  // Model an incomplete historical import: closure exists, but its current
  // lifecycle has no resolution. An older acceptance must not be reused.
  await admin.db
    .update(cyberFinding)
    .set({ status: 'closed' })
    .where(eq(cyberFinding.id, scenario.finding.id));
  await withTenant(db, scope, (tx) =>
    tx.insert(cyberEvent).values({
      organizationId: org,
      clientId: scenario.finding.clientId,
      actorId: user,
      action: 'finding.closed',
      targetId: scenario.finding.id,
      detail: 'Synthetic incomplete legacy closure',
    }),
  );
  const report = await createCyberReport(db, scope, scenario.input);
  expect(report.snapshot.unreviewedCount).toBe(1);
  expect(report.snapshot.falsePositiveCount).toBe(0);
  expect(report.snapshot.findings).toEqual([]);
  expect(report.snapshot.tasks).toEqual([]);
});

it('refuses to silently truncate retest history or substitute missing historical evidence', async () => {
  const scenario = await reportResolutionScenario();
  const clean = await scenario.execute(false);
  await recordCyberRetest(db, scope, {
    findingId: scenario.finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic bounded history retest',
  });
  const input = { ...scenario.input, auditId: clean.id };
  await admin.pool.query('DELETE FROM cyber_observation WHERE finding_id = $1', [
    scenario.finding.id,
  ]);
  await expect(createCyberReport(db, scope, input)).rejects.toMatchObject({
    code: 'report_evidence_unavailable',
  });
  await admin.pool.query(
    `INSERT INTO cyber_retest (organization_id, client_id, finding_id, audit_id, conclusion, note, reviewer_id)
     SELECT $1, $2::uuid, $3::uuid, $4::uuid, 'inconclusive', 'Synthetic bounded history', $5
     FROM generate_series(1, 1000)`,
    [org, scenario.finding.clientId, scenario.finding.id, clean.id, user],
  );
  await expect(createCyberReport(db, scope, input)).rejects.toMatchObject({
    code: 'report_retest_limit',
  });
});

it('does not confirm a correction when its resolution event has no matching absent retest', async () => {
  const scenario = await reportResolutionScenario();
  const clean = await scenario.execute(false);
  const retest = await recordCyberRetest(db, scope, {
    findingId: scenario.finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic recorded resolution before incomplete historical import',
  });
  await admin.db
    .update(cyberRetest)
    .set({ conclusion: 'inconclusive' })
    .where(eq(cyberRetest.id, retest!.id));
  const report = await createCyberReport(db, scope, { ...scenario.input, auditId: clean.id });
  expect(report.snapshot.unreviewedCount).toBe(1);
  expect(report.snapshot.findings).toEqual([]);
});
