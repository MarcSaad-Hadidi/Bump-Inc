import { randomUUID } from 'node:crypto';
import type { CyberEngine, CyberObservation } from '@bump/contracts';
import { createDatabase, migrateDatabase } from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { claimExecution } from '../execution.js';
import {
  approveCyberMandate,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  createCyberSource,
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
  !new URL(url).pathname.endsWith('_test') ||
  new URL(url).pathname !== new URL(migration).pathname ||
  new URL(url).host !== new URL(migration).host
)
  throw new Error('Retest integration requires an isolated matching _test database');
const db = createDatabase(url);
const admin = createDatabase(migration);
const userId = randomUUID();
const organizationId = randomUUID();
const scope = { organizationId, userId, requestId: randomUUID() };
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
  await admin.pool.query(
    'INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)',
    [userId, 'Synthetic retest reviewer', `${userId}@example.invalid`],
  );
  await admin.pool.query('INSERT INTO organization (id, name, slug) VALUES ($1, $2, $1)', [
    organizationId,
    'Synthetic retest workspace',
  ]);
  await admin.pool.query(
    'INSERT INTO member (id, organization_id, user_id, role) VALUES ($1, $2, $3, $4)',
    [randomUUID(), organizationId, userId, 'owner'],
  );
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
      await admin.pool.query(`DELETE FROM ${table} WHERE organization_id=$1`, [organizationId]);
    await admin.pool.query('DELETE FROM organization WHERE id=$1', [organizationId]);
    await admin.pool.query('DELETE FROM "user" WHERE id=$1', [userId]);
  } finally {
    await db.pool.end();
    await admin.pool.end();
  }
});

async function scenario(engine: CyberEngine, withSecondaryAsset = false) {
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic controlled retest client',
    contact: 'retest-lab@example.invalid',
  });
  const assets: Awaited<ReturnType<typeof createCyberAsset>>[] = [];
  for (let index = 0; index < (withSecondaryAsset ? 2 : 1); index++) {
    const asset = await createCyberAsset(db, scope, {
      clientId: client.id,
      label: `Synthetic repository ${index + 1}`,
      target: { kind: 'repository', value: `lab/retest-${randomUUID()}` },
    });
    assets.push(asset);
    await createCyberSource(db, vault, scope, {
      assetId: asset.id,
      name: 'Synthetic controlled source',
      files: [{ path: 'app.py', content: 'pass' }],
    });
  }
  const mandate = await createCyberMandate(db, scope, {
    clientId: client.id,
    reference: 'SYNTHETIC-RETEST-ONLY',
    signedBy: 'Synthetic laboratory owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: userId,
    authorizationText:
      'Synthetic written authorization for the exact offline laboratory repositories.',
    emergencyContact: 'retest-lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: assets.map((asset) => asset.id),
    engines: [engine],
    mode: 'passive',
    limitations: 'Synthetic controlled observations only; no scanner process or network target.',
  });
  await approveCyberMandate(db, scope, mandate.id);

  async function execute(
    observations: CyberObservation[],
    options: {
      secondaryObservations?: CyberObservation[];
      version?: string;
      coverage?: string;
    } = {},
  ) {
    const audit = await launchCyberAudit(
      db,
      scope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: assets.map((asset) => asset.id),
        engines: [engine],
        idempotencyKey: randomUUID(),
        title: 'Synthetic controlled retest audit',
      },
      [engine],
    );
    const scans = (await readCyberSnapshot(db, scope)).scans.filter(
      (item) => item.scan.auditId === audit.id,
    );
    expect(scans).toHaveLength(assets.length);
    for (const { scan } of scans) {
      const attempt = await claimExecution(db, {
        organizationId,
        userId,
        jobId: scan.executionJobId,
      });
      if (!attempt) throw new Error('Synthetic retest scan could not be claimed');
      await finishCyberScan(
        db,
        vault,
        {
          ...scope,
          scanId: scan.id,
          jobId: scan.executionJobId,
          token: attempt.token,
        },
        {
          raw: 'Synthetic controlled retest result',
          observations:
            scan.assetId === assets[0]!.id ? observations : (options.secondaryObservations ?? []),
          engineVersion: options.version ?? engineVersion,
          coverageHash: options.coverage ?? coverageHash,
        },
      );
    }
    return audit;
  }

  async function confirmed(observation: CyberObservation) {
    await execute([observation]);
    const finding = (await readCyberSnapshot(db, scope)).findings.find(
      (item) => item.clientId === client.id,
    )!;
    await reviewCyberFinding(db, scope, finding.id, {
      status: 'confirmed',
      note: 'Synthetic independent human confirmation',
      businessImpact: 'Synthetic laboratory impact',
      recommendation: 'Synthetic corrective action',
    });
    return finding;
  }
  return { client, execute, confirmed };
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
