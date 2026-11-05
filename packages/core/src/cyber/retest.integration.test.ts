import { randomUUID } from 'node:crypto';
import type { CyberEngine, CyberObservation } from '@bump/contracts';
import { assertRuntimeRole, createDatabase, migrateDatabase } from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { claimExecution, finishExecution } from '../execution.js';
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
  saveCyberSource,
} from './service.js';

const url = process.env.DATABASE_URL;
const migration = process.env.MIGRATION_DATABASE_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !url ||
  !migration ||
  !new URL(url).pathname.endsWith('_test') ||
  new URL(url).pathname !== new URL(migration).pathname ||
  new URL(url).host !== new URL(migration).host
)
  throw new Error('Retest integration requires an isolated matching _test database');
const db = createDatabase(url);
const admin = createDatabase(migration);
const userId = randomUUID();
const organizationIds: string[] = [];
let organizationId: string;
let otherOrganizationId: string;
let scope: { organizationId: string; userId: string; requestId: string };
let otherScope: typeof scope;
const vault = createCyberVault(Buffer.alloc(32, 7));
const engineVersion = 'synthetic-retest-v1';
const coverageHash = 'a'.repeat(64);
const original: CyberObservation = {
  engine: 'semgrep',
  engineVersion,
  ruleId: 'synthetic-retest-pattern',
  title: 'Synthetic controlled finding',
  severity: 'high',
  confidence: 'medium',
  location: 'app.py:2',
  component: '',
  affectedVersion: '',
  fixedVersion: '',
  cve: null,
  cvss: null,
  references: [],
  evidence: 'Synthetic minimized observation without source snippets',
  recommendation: 'Review and correct the synthetic condition',
};

beforeAll(async () => {
  await migrateDatabase(migration);
  await assertRuntimeRole(db.pool);
  await admin.pool.query(
    'INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)',
    [userId, 'Synthetic retest reviewer', `${userId}@example.invalid`],
  );
});

beforeEach(async () => {
  // Each scenario keeps the real per-tenant execution budget (30 starts/minute).
  organizationId = randomUUID();
  otherOrganizationId = randomUUID();
  scope = { organizationId, userId, requestId: randomUUID() };
  otherScope = { ...scope, organizationId: otherOrganizationId };
  for (const org of [organizationId, otherOrganizationId]) {
    organizationIds.push(org);
    await admin.pool.query('INSERT INTO organization (id, name, slug) VALUES ($1, $2, $1)', [
      org,
      'Synthetic retest workspace',
    ]);
    await admin.pool.query(
      'INSERT INTO member (id, organization_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [randomUUID(), org, userId, 'owner'],
    );
  }
});

afterAll(async () => {
  try {
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
        organizationIds,
      ]);
    await admin.pool.query('DELETE FROM organization WHERE id=ANY($1::text[])', [organizationIds]);
    await admin.pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
  } finally {
    await db.pool.end();
    await admin.pool.end();
  }
});

async function scenario(
  engine: CyberEngine,
  withSecondaryAsset = false,
  fixtureScope = scope,
  allowJson = false,
) {
  const client = await createCyberClient(db, fixtureScope, {
    name: 'Synthetic controlled retest client',
    contact: 'retest-lab@example.invalid',
  });
  const assets: Awaited<ReturnType<typeof createCyberAsset>>[] = [];
  for (let index = 0; index < (withSecondaryAsset ? 2 : 1); index++) {
    const asset = await createCyberAsset(db, fixtureScope, {
      clientId: client.id,
      label: `Synthetic repository ${index + 1}`,
      target: { kind: 'repository', value: `lab/retest-${randomUUID()}` },
    });
    assets.push(asset);
    await createCyberSource(db, vault, fixtureScope, {
      assetId: asset.id,
      name: 'Synthetic controlled source',
      files: [{ path: 'app.py', content: 'pass' }],
    });
    if (allowJson)
      await saveCyberSource(
        db,
        vault,
        fixtureScope,
        asset.id,
        'Synthetic imported report',
        'json',
        JSON.stringify({
          version: 1,
          engine: 'semgrep',
          engineVersion: '1.183.0',
          report: {
            version: '1.183.0',
            errors: [],
            results: [
              {
                check_id: original.ruleId,
                path: 'app.py',
                start: { line: 2 },
                extra: { severity: 'ERROR' },
              },
            ],
          },
        }),
      );
  }
  const mandate = await createCyberMandate(db, fixtureScope, {
    clientId: client.id,
    reference: 'SYNTHETIC-RETEST-ONLY',
    signedBy: 'Synthetic laboratory owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: fixtureScope.userId,
    authorizationText:
      'Synthetic written authorization for the exact offline laboratory repositories.',
    emergencyContact: 'retest-lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: assets.map((asset) => asset.id),
    engines: allowJson ? [engine, 'json'] : [engine],
    mode: 'passive',
    limitations: 'Synthetic controlled observations only; no scanner process or network target.',
  });
  await approveCyberMandate(db, fixtureScope, mandate.id);

  async function execute(
    observations: CyberObservation[],
    options: {
      secondaryObservations?: CyberObservation[];
      version?: string;
      coverage?: string;
      engine?: CyberEngine;
      outcome?: 'failed' | 'cancelled';
      pending?: 'queued' | 'running' | 'retry_wait';
    } = {},
  ) {
    const selectedEngine = options.engine ?? engine;
    const audit = await launchCyberAudit(
      db,
      fixtureScope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: assets.map((asset) => asset.id),
        engines: [selectedEngine],
        idempotencyKey: randomUUID(),
        title: 'Synthetic controlled retest audit',
      },
      [selectedEngine],
    );
    const scans = (await readCyberSnapshot(db, fixtureScope)).scans.filter(
      (item) => item.scan.auditId === audit.id,
    );
    expect(scans).toHaveLength(assets.length);
    for (const { scan } of scans) {
      if (options.pending === 'queued') continue;
      const attempt = await claimExecution(db, {
        organizationId: fixtureScope.organizationId,
        userId: fixtureScope.userId,
        jobId: scan.executionJobId,
      });
      if (!attempt) throw new Error('Synthetic retest scan could not be claimed');
      if (options.pending === 'running') continue;
      if (options.pending === 'retry_wait')
        await admin.pool.query(
          'UPDATE execution_job SET max_attempts=2 WHERE organization_id=$1 AND id=$2',
          [fixtureScope.organizationId, scan.executionJobId],
        );
      if (options.outcome || options.pending === 'retry_wait') {
        const completed = await finishExecution(db, {
          organizationId: fixtureScope.organizationId,
          userId: fixtureScope.userId,
          jobId: scan.executionJobId,
          token: attempt.token,
          outcome: options.outcome ?? 'failed',
        });
        expect(completed?.status).toBe(
          options.pending === 'retry_wait'
            ? 'retry_wait'
            : options.outcome === 'cancelled'
              ? 'cancelled'
              : 'dead_letter',
        );
        continue;
      }
      await finishCyberScan(
        db,
        vault,
        {
          ...fixtureScope,
          scanId: scan.id,
          jobId: scan.executionJobId,
          token: attempt.token,
        },
        {
          raw: 'Synthetic controlled retest result',
          observations:
            scan.assetId === assets[0]!.id ? observations : (options.secondaryObservations ?? []),
          engineVersion:
            options.version ?? (selectedEngine === 'json' ? 'bump-json-import-1' : engineVersion),
          coverageHash: options.coverage ?? (selectedEngine === 'json' ? '' : coverageHash),
        },
      );
    }
    return audit;
  }

  async function confirmed(observation: CyberObservation) {
    await execute([observation]);
    const finding = (await readCyberSnapshot(db, fixtureScope)).findings.find(
      (item) => item.clientId === client.id,
    )!;
    await reviewCyberFinding(db, fixtureScope, finding.id, {
      status: 'confirmed',
      note: 'Synthetic independent human confirmation',
      businessImpact: 'Synthetic laboratory impact',
      recommendation: 'Synthetic corrective action',
    });
    return finding;
  }
  return { client, execute, confirmed, scope: fixtureScope };
}

it('rejects an absent retest when the same Semgrep rule moved to another line in the same file', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const retest = await fixture.execute([{ ...original, location: 'app.py:3:9' }]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: retest.id,
      conclusion: 'absent',
      note: 'Synthetic line movement must not prove remediation',
    }),
  ).rejects.toMatchObject({ code: 'retest_evidence_conflict' });
  const findings = (await readCyberSnapshot(db, scope)).findings.filter(
    (item) => item.clientId === fixture.client.id,
  );
  expect(findings).toHaveLength(2);
  expect(findings.find((item) => item.id === finding.id)?.status).toBe('confirmed');
  expect(findings.find((item) => item.id !== finding.id)?.status).toBe('to_review');
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: retest.id,
    conclusion: 'inconclusive',
    note: 'Synthetic ambiguous moved detection needs further review',
  });
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
  ).toBe('confirmed');
});

it('rejects an absent retest when the same component CVE remains vulnerable in another version', async () => {
  const fixture = await scenario('trivy');
  const observation: CyberObservation = {
    ...original,
    engine: 'trivy',
    ruleId: 'CVE-2026-1000',
    cve: 'CVE-2026-1000',
    component: 'synthetic-library',
    affectedVersion: '1.0.0',
    fixedVersion: '1.2.0',
    location: 'package-lock.json',
  };
  const finding = await fixture.confirmed(observation);
  const retest = await fixture.execute([
    { ...observation, affectedVersion: '1.1.0', location: 'vendor/package-lock.json' },
  ]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: retest.id,
      conclusion: 'absent',
      note: 'Synthetic vulnerable version change must not prove remediation',
    }),
  ).rejects.toMatchObject({ code: 'retest_evidence_conflict' });
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: retest.id,
      conclusion: 'present',
      note: 'Synthetic related observation is not an exact identity confirmation',
    }),
  ).rejects.toMatchObject({ code: 'retest_evidence_conflict' });
  const findings = (await readCyberSnapshot(db, scope)).findings.filter(
    (item) => item.clientId === fixture.client.id,
  );
  expect(findings).toHaveLength(2);
  expect(findings.find((item) => item.id === finding.id)?.status).toBe('confirmed');
});

it('does not treat a matching title on an unrelated rule and file as conflicting evidence', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const retest = await fixture.execute([
    { ...original, ruleId: 'unrelated-synthetic-rule', location: 'other.py:3' },
  ]);
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: retest.id,
    conclusion: 'absent',
    note: 'Synthetic comparable clean coverage for this finding; unrelated title ignored',
  });
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
  ).toBe('verified_fixed');
});

it('does not use a similar observation from another asset in the selected audit', async () => {
  const fixture = await scenario('semgrep', true);
  const finding = await fixture.confirmed(original);
  const retest = await fixture.execute([], {
    secondaryObservations: [{ ...original, location: 'app.py:3' }],
  });
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: retest.id,
    conclusion: 'absent',
    note: 'Synthetic absent result is scoped to the original asset',
  });
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
  ).toBe('verified_fixed');
});

it.each([
  { version: 'synthetic-retest-v2', coverage: coverageHash },
  { version: engineVersion, coverage: 'b'.repeat(64) },
])(
  'keeps engine version and coverage requirements before accepting absence: %j',
  async (options) => {
    const fixture = await scenario('semgrep');
    const finding = await fixture.confirmed(original);
    const retest = await fixture.execute([], options);
    await expect(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: retest.id,
        conclusion: 'absent',
        note: 'Synthetic changed coverage or engine version remains incomparable',
      }),
    ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
    expect(
      (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
    ).toBe('confirmed');
  },
);

async function importedPositive(fixture: Awaited<ReturnType<typeof scenario>>) {
  const audit = await fixture.execute([{ ...original, engineVersion: '1.183.0 (imported)' }], {
    engine: 'json',
  });
  const finding = (await readCyberSnapshot(db, fixture.scope)).findings.find(
    (item) => item.clientId === fixture.client.id,
  )!;
  await reviewCyberFinding(db, fixture.scope, finding.id, {
    status: 'confirmed',
    note: 'Synthetic imported signal reviewed by the owner',
    businessImpact: 'Synthetic controlled import impact',
    recommendation: 'Synthetic corrective action',
  });
  return { finding, audit };
}

it('accepts a present retest using the native positive before the selected positive audit', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const positive = await fixture.execute([original]);
  await reviewCyberFinding(db, scope, finding.id, {
    status: 'to_retest',
    note: 'Synthetic human request to review the comparable positive retest',
    businessImpact: 'Synthetic laboratory impact',
    recommendation: 'Synthetic corrective action',
  });
  const retest = await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: positive.id,
    conclusion: 'present',
    note: 'Synthetic comparable native positive B confirms persistence after native positive A',
  });
  expect(retest?.conclusion).toBe('present');
  const snapshot = await readCyberSnapshot(db, scope);
  expect(snapshot.retests.find((item) => item.id === retest?.id)?.auditId).toBe(positive.id);
  expect(snapshot.findings.find((item) => item.id === finding.id)?.status).toBe('confirmed');
});

it('does not borrow a future native positive baseline for an earlier present retest', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const positive = await fixture.execute([original]);
  await fixture.execute([{ ...original, engineVersion: 'synthetic-retest-v2' }], {
    version: 'synthetic-retest-v2',
    coverage: 'b'.repeat(64),
  });
  const retest = await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: positive.id,
    conclusion: 'present',
    note: 'Synthetic present review uses prior native evidence A, excluding later audit C',
  });
  expect(retest?.conclusion).toBe('present');
});

it.each([
  { version: 'synthetic-retest-v2', coverage: coverageHash, changed: 'version' },
  { version: engineVersion, coverage: 'b'.repeat(64), changed: 'coverage' },
])('rejects a present retest with a noncomparable $changed', async (options) => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const positive = await fixture.execute(
    [{ ...original, engineVersion: options.version }],
    options,
  );
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: positive.id,
      conclusion: 'present',
      note: 'Synthetic positive observation does not establish comparable detector coverage',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
  const before = (await readCyberSnapshot(db, scope)).findings.find(
    (item) => item.id === finding.id,
  );
  const retest = await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: positive.id,
    conclusion: 'inconclusive',
    note: 'Synthetic incomparable positive result remains inconclusive',
  });
  expect(retest?.conclusion).toBe('inconclusive');
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id),
  ).toEqual(before);
});

it.each([
  { version: 'synthetic-retest-v2', coverage: coverageHash, changed: 'version' },
  { version: engineVersion, coverage: 'b'.repeat(64), changed: 'coverage' },
])('does not skip the latest prior native positive with a changed $changed', async (latest) => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  await fixture.execute([{ ...original, engineVersion: latest.version }], latest);
  const positive = await fixture.execute([original]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: positive.id,
      conclusion: 'present',
      note: 'Synthetic old detector/profile cannot skip the latest prior native positive',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
});

it('does not use the selected native positive itself as a baseline after an import', async () => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding } = await importedPositive(fixture);
  const native = await fixture.execute([original]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: native.id,
      conclusion: 'present',
      note: 'Synthetic first native positive has no earlier native baseline',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
});

it.each(['json', 'failed', 'cancelled'] as const)(
  'records an inconclusive terminal %s retest without a native baseline or finding changes',
  async (completion) => {
    const fixture = await scenario('semgrep', false, scope, true);
    const { finding } = await importedPositive(fixture);
    const selected =
      completion === 'json'
        ? await fixture.execute([{ ...original, engineVersion: '1.183.0 (imported)' }], {
            engine: 'json',
          })
        : await fixture.execute([], { outcome: completion });
    for (const conclusion of ['absent', 'present'] as const)
      await expect(
        recordCyberRetest(db, scope, {
          findingId: finding.id,
          auditId: selected.id,
          conclusion,
          note: 'Synthetic missing native evidence cannot establish a favorable resolution',
        }),
      ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
    const before = (await readCyberSnapshot(db, scope)).findings.find(
      (item) => item.id === finding.id,
    );
    const retest = await recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: selected.id,
      conclusion: 'inconclusive',
      note: 'Synthetic terminal result preserves uncertainty without native evidence',
    });
    expect(retest?.conclusion).toBe('inconclusive');
    const after = await readCyberSnapshot(db, scope);
    expect(after.findings.find((item) => item.id === finding.id)).toEqual(before);
    expect(after.retests).toHaveLength(1);
  },
);

it.each(['queued', 'running', 'retry_wait'] as const)(
  'rejects an inconclusive retest while its scan remains %s',
  async (pending) => {
    const fixture = await scenario('semgrep');
    const finding = await fixture.confirmed(original);
    const selected = await fixture.execute([], { pending });
    await expect(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: selected.id,
        conclusion: 'inconclusive',
        note: 'Synthetic unfinished scans are not eligible for a retest conclusion',
      }),
    ).rejects.toMatchObject({ code: 'completed_asset_audit_required' });
    const after = await readCyberSnapshot(db, scope);
    expect(after.findings.find((item) => item.id === finding.id)?.status).toBe('confirmed');
    expect(after.retests).toHaveLength(0);
  },
);

it('uses a native positive baseline after an imported first observation', async () => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding, audit: imported } = await importedPositive(fixture);
  const native = await fixture.execute([original]);
  const deduplicated = (await readCyberSnapshot(db, scope)).findings.filter(
    (item) => item.clientId === fixture.client.id,
  );
  expect(deduplicated).toHaveLength(1);
  expect(deduplicated[0]?.firstAuditId).toBe(imported.id);
  expect(deduplicated[0]?.lastAuditId).toBe(native.id);
  const clean = await fixture.execute([]);
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic native baseline B makes clean native audit C comparable',
  });
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
  ).toBe('verified_fixed');
});

it('uses the latest verified native version after an earlier positive native version', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const latest = { version: 'synthetic-retest-v2', coverage: 'b'.repeat(64) };
  await fixture.execute([{ ...original, engineVersion: latest.version }], latest);
  const clean = await fixture.execute([], latest);
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic v2 positive baseline makes clean v2 coverage comparable',
  });
  expect(
    (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
  ).toBe('verified_fixed');
});

it.each([
  { version: 'synthetic-retest-v2', coverage: coverageHash, changed: 'version' },
  { version: engineVersion, coverage: 'b'.repeat(64), changed: 'coverage' },
])(
  'refuses an older baseline after the latest native positive changed $changed',
  async (latest) => {
    const fixture = await scenario('semgrep');
    const finding = await fixture.confirmed(original);
    await fixture.execute([{ ...original, engineVersion: latest.version }], latest);
    const oldProfile = await fixture.execute([]);
    await expect(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: oldProfile.id,
        conclusion: 'absent',
        note: 'Synthetic old detector/profile must not bypass the latest native positive baseline',
      }),
    ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
    expect(
      (await readCyberSnapshot(db, scope)).findings.find((item) => item.id === finding.id)?.status,
    ).toBe('confirmed');
  },
);

it('rejects import-only history as a native baseline', async () => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding } = await importedPositive(fixture);
  const clean = await fixture.execute([]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: clean.id,
      conclusion: 'absent',
      note: 'Synthetic imported provenance cannot substitute a native positive baseline',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
});

it('rejects a positive native baseline from after the selected retest', async () => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding } = await importedPositive(fixture);
  const clean = await fixture.execute([]);
  await fixture.execute([original]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: clean.id,
      conclusion: 'absent',
      note: 'Synthetic future positive scan is not a baseline for the earlier clean audit',
    }),
  ).rejects.toMatchObject({ statusCode: 409 });
});

it.each([
  { version: 'synthetic-retest-v2', coverage: coverageHash },
  { version: engineVersion, coverage: 'b'.repeat(64) },
])('rejects a nonmatching native baseline after an import: %j', async (options) => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding } = await importedPositive(fixture);
  await fixture.execute([{ ...original, engineVersion: options.version }], options);
  const clean = await fixture.execute([]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: clean.id,
      conclusion: 'absent',
      note: 'Synthetic native version or coverage does not match the selected retest',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
});

it('requires a native positive observation of this exact finding', async () => {
  const fixture = await scenario('semgrep', false, scope, true);
  const { finding } = await importedPositive(fixture);
  await fixture.execute([{ ...original, ruleId: 'different-synthetic-baseline-finding' }]);
  const clean = await fixture.execute([]);
  await expect(
    recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: clean.id,
      conclusion: 'absent',
      note: 'Synthetic unrelated positive scan cannot establish this finding baseline',
    }),
  ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
});

it.each(['client', 'tenant'] as const)(
  'does not borrow a positive native baseline from another %s',
  async (boundary) => {
    const fixture = await scenario('semgrep', false, scope, true);
    const { finding } = await importedPositive(fixture);
    const foreign = await scenario('semgrep', false, boundary === 'tenant' ? otherScope : scope);
    await foreign.confirmed(original);
    const clean = await fixture.execute([]);
    await expect(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: clean.id,
        conclusion: 'absent',
        note: 'Synthetic baseline must belong to the original finding client and tenant',
      }),
    ).rejects.toMatchObject({ code: 'comparable_completed_coverage_required' });
  },
);

type Outcome<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };
async function settled<T>(operation: Promise<T>): Promise<Outcome<T>> {
  try {
    return { status: 'fulfilled', value: await operation };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}
async function blockedQuery(blocker: number, patterns: string[]) {
  let waiting: number | undefined;
  await expect
    .poll(
      async () => {
        const result = await admin.pool.query<{ pid: number }>(
          `SELECT pid FROM pg_stat_activity WHERE datname=current_database()
       AND $1::int=ANY(pg_blocking_pids(pid)) AND query ILIKE ANY($2::text[])`,
          [blocker, patterns],
        );
        waiting = result.rows[0]?.pid;
        return waiting !== undefined;
      },
      { timeout: 1500, interval: 10 },
    )
    .toBe(true);
  if (!waiting) throw new Error('Expected synthetic PostgreSQL wait was not observed');
  return waiting;
}

it('does not create a planned task after a concurrent retest verifies the finding', async () => {
  const fixture = await scenario('semgrep');
  const finding = await fixture.confirmed(original);
  const clean = await fixture.execute([]);
  const name = `cyber_create_gate_${organizationId.replaceAll('-', '')}`;
  const key = BigInt(`0x${organizationId.replaceAll('-', '').slice(0, 15)}`).toString();
  const gate = await admin.pool.connect();
  let held = false;
  let retest: ReturnType<typeof settled<Awaited<ReturnType<typeof recordCyberRetest>>>> | undefined;
  let creation: ReturnType<typeof settled<Awaited<ReturnType<typeof createCyberTask>>>> | undefined;
  try {
    await admin.pool.query(`CREATE FUNCTION public."${name}"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_advisory_xact_lock(TG_ARGV[0]::bigint); RETURN NEW; END $$`);
    await admin.pool.query(`CREATE TRIGGER "${name}" BEFORE INSERT ON public.cyber_retest
      FOR EACH ROW WHEN (NEW.organization_id='${organizationId}')
      EXECUTE FUNCTION public."${name}"('${key}')`);
    await gate.query('SELECT pg_advisory_lock($1::bigint)', [key]);
    held = true;
    const gatePid = (await gate.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
      .pid;
    retest = settled(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: clean.id,
        conclusion: 'absent',
        note: 'Synthetic concurrent verified correction',
      }),
    );
    const retestPid = await blockedQuery(gatePid, ['%insert into "cyber_retest"%']);
    creation = settled(
      createCyberTask(db, scope, {
        findingId: finding.id,
        assignee: 'Synthetic concurrent analyst',
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        description: 'Synthetic stale task request',
      }),
    );
    await blockedQuery(retestPid, ['%insert into "cyber_task"%', '%"cyber_finding"%for update%']);
    await gate.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
    held = false;
    const [retested, created] = await Promise.all([retest, creation]);
    expect(retested.status).toBe('fulfilled');
    const snapshot = await readCyberSnapshot(db, scope);
    expect(snapshot.findings.find((item) => item.id === finding.id)?.status).toBe('verified_fixed');
    expect(
      snapshot.tasks.filter((item) => item.findingId === finding.id).map((item) => item.status),
    ).toEqual([]);
    expect(created.status).toBe('rejected');
    if (created.status === 'rejected') {
      const reason = created.reason as { statusCode?: unknown; code?: unknown };
      expect(reason.statusCode).toBe(409);
      expect(reason.code).toBe('confirmed_finding_required');
    }
  } finally {
    if (held) await gate.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
    await Promise.all([retest, creation].filter((operation) => operation !== undefined));
    gate.release();
    await admin.pool.query(`DROP TRIGGER IF EXISTS "${name}" ON public.cyber_retest`);
    await admin.pool.query(`DROP FUNCTION IF EXISTS public."${name}"()`);
  }
});
