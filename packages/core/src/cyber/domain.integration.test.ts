import { randomUUID } from 'node:crypto';
import {
  createDatabase,
  cyberAsset,
  cyberFinding,
  cyberSource,
  migrateDatabase,
  withTenant,
} from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { claimExecution } from '../execution.js';
import {
  approveCyberMandate,
  assignCyberRole,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  createCyberSource,
  finishCyberScan,
  launchCyberAudit,
  readCyberSnapshot,
  recordCyberRetest,
  reviewCyberFinding,
  withCyber,
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

it('serializes role revocation with a currently authorized tenant transaction', async () => {
  let entered!: () => void, release!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const active = withCyber(db, { ...scope, userId: analyst }, async (_tx, role) => {
    expect(role).toBe('analyst');
    entered();
    await gate;
  });
  await started;
  const revocation = assignCyberRole(db, scope, analyst, 'reviewer');
  try {
    await expect
      .poll(
        async () =>
          (
            await admin.pool.query<{ waiting: boolean }>(
              `SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0 AND query ILIKE '%"member"%for update%') AS waiting`,
            )
          ).rows[0]?.waiting,
        { timeout: 1500, interval: 20 },
      )
      .toBe(true);
  } finally {
    release();
    await active;
    await revocation;
  }
  expect((await readCyberSnapshot(db, { ...scope, userId: analyst })).role).toBe('reviewer');
  await expect(assignCyberRole(db, scope, user, 'analyst')).rejects.toMatchObject({
    code: 'inherited_admin_role',
  });
  await assignCyberRole(db, scope, analyst, 'analyst');
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
