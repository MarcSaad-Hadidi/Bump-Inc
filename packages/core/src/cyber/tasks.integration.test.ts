import { randomUUID } from 'node:crypto';
import { assertRuntimeRole, createDatabase, migrateDatabase } from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { claimExecution } from '../execution.js';
import {
  approveCyberMandate,
  assignCyberRole,
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
  updateCyberTask,
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
  throw new Error('Task integration requires an isolated matching _test database');
const db = createDatabase(url);
const admin = createDatabase(migration);
const userId = randomUUID();
const analystId = randomUUID();
const otherUserId = randomUUID();
const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const scope = { organizationId, userId, requestId: randomUUID() };
const analyst = { ...scope, userId: analystId };
const other = { organizationId: otherOrganizationId, userId: otherUserId, requestId: randomUUID() };
const vault = createCyberVault(Buffer.alloc(32, 5));

beforeAll(async () => {
  await migrateDatabase(migration);
  await assertRuntimeRole(db.pool);
  for (const id of [userId, analystId, otherUserId])
    await admin.pool.query(
      'INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)',
      [id, 'Synthetic task reviewer', `${id}@example.invalid`],
    );
  for (const id of [organizationId, otherOrganizationId])
    await admin.pool.query('INSERT INTO organization (id, name, slug) VALUES ($1, $2, $1)', [
      id,
      'Synthetic task workspace',
    ]);
  for (const [org, user, role] of [
    [organizationId, userId, 'owner'],
    [organizationId, analystId, 'member'],
    [otherOrganizationId, otherUserId, 'owner'],
  ])
    await admin.pool.query(
      'INSERT INTO member (id, organization_id, user_id, role) VALUES ($1, $2, $3, $4)',
      [randomUUID(), org, user, role],
    );
});

afterAll(async () => {
  try {
    const organizations = [organizationId, otherOrganizationId];
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
        organizations,
      ]);
    await admin.pool.query('DELETE FROM organization WHERE id=ANY($1::text[])', [organizations]);
    await admin.pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [
      [userId, analystId, otherUserId],
    ]);
  } finally {
    await db.pool.end();
    await admin.pool.end();
  }
});

async function fixture() {
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic remediation concurrency client',
    contact: 'task-lab@example.invalid',
  });
  const asset = await createCyberAsset(db, scope, {
    clientId: client.id,
    label: 'Synthetic task repository',
    target: { kind: 'repository', value: `lab/tasks-${randomUUID()}` },
  });
  const mandate = await createCyberMandate(db, scope, {
    clientId: client.id,
    reference: 'SYNTHETIC-TASK-CONCURRENCY',
    signedBy: 'Synthetic laboratory owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: userId,
    authorizationText:
      'Synthetic written authorization limited to this offline laboratory repository.',
    emergencyContact: 'task-lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: [asset.id],
    engines: ['semgrep'],
    mode: 'passive',
    limitations: 'Synthetic controlled observations; no real scanner or external target.',
  });
  await approveCyberMandate(db, scope, mandate.id);
  await createCyberSource(db, vault, scope, {
    assetId: asset.id,
    name: 'Synthetic task source',
    files: [{ path: 'app.py', content: 'pass' }],
  });
  async function execute(positive: boolean) {
    const audit = await launchCyberAudit(
      db,
      scope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: [asset.id],
        engines: ['semgrep'],
        idempotencyKey: randomUUID(),
        title: 'Synthetic remediation task audit',
      },
      ['semgrep'],
    );
    const scan = (await readCyberSnapshot(db, scope)).scans.find(
      (item) => item.scan.auditId === audit.id,
    )!.scan;
    const attempt = await claimExecution(db, {
      organizationId,
      userId,
      jobId: scan.executionJobId,
    });
    if (!attempt) throw new Error('Synthetic task scan could not be claimed');
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
        raw: 'Synthetic controlled task scan result',
        observations: positive
          ? [
              {
                engine: 'semgrep',
                engineVersion: 'synthetic-task-v1',
                ruleId: 'synthetic-task-rule',
                title: 'Synthetic remediation task finding',
                severity: 'high',
                confidence: 'medium',
                location: 'app.py:1',
                component: '',
                affectedVersion: '',
                fixedVersion: '',
                cve: null,
                cvss: null,
                references: [],
                evidence: 'Synthetic minimized task evidence',
                recommendation: 'Synthetic corrective action',
              },
            ]
          : [],
        engineVersion: 'synthetic-task-v1',
        coverageHash: 'c'.repeat(64),
      },
    );
    return audit;
  }
  await execute(true);
  const finding = (await readCyberSnapshot(db, scope)).findings.find(
    (item) => item.clientId === client.id,
  )!;
  await reviewCyberFinding(db, scope, finding.id, {
    status: 'confirmed',
    note: 'Synthetic independent task review',
    businessImpact: 'Synthetic laboratory impact',
    recommendation: 'Synthetic corrective action',
  });
  const task = await createCyberTask(db, scope, {
    findingId: finding.id,
    assignee: 'Synthetic task analyst',
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    description: 'Synthetic remediation work',
  });
  if (!task) throw new Error('Synthetic remediation task was not created');
  const clean = await execute(false);
  return { finding, task, clean };
}

type Outcome<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };
async function settled<T>(operation: Promise<T>): Promise<Outcome<T>> {
  try {
    return { status: 'fulfilled', value: await operation };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}
function postgresCode(error: unknown): string | null {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === 'string' && /^[0-9A-Z]{5}$/.test(value.code)) return value.code;
    current = value.cause;
  }
  return null;
}
async function waitingQuery(blocker: number, queryPattern: string): Promise<number> {
  let waiting: number | undefined;
  await expect
    .poll(
      async () => {
        const result = await admin.pool.query<{ pid: number }>(
          `SELECT pid FROM pg_stat_activity WHERE datname=current_database()
       AND $1::int=ANY(pg_blocking_pids(pid)) AND query ILIKE $2`,
          [blocker, queryPattern],
        );
        waiting = result.rows[0]?.pid;
        return waiting !== undefined;
      },
      { timeout: 1500, interval: 10 },
    )
    .toBe(true);
  if (!waiting) throw new Error('Expected synthetic PostgreSQL lock wait was not observed');
  return waiting;
}

it('serializes task updates behind a verifying retest without a PostgreSQL deadlock', async () => {
  const { finding, task, clean } = await fixture();
  const gateName = `cyber_task_gate_${organizationId.replaceAll('-', '')}`;
  const gateKey = BigInt(`0x${organizationId.replaceAll('-', '').slice(0, 15)}`).toString();
  const gate = await admin.pool.connect();
  let held = false;
  let retest: ReturnType<typeof settled<Awaited<ReturnType<typeof recordCyberRetest>>>> | undefined;
  let update: ReturnType<typeof settled<Awaited<ReturnType<typeof updateCyberTask>>>> | undefined;
  try {
    // Only this fixture's retest pauses after locking the finding. Both service
    // transactions and all row/advisory locks below are real PostgreSQL work.
    await admin.pool.query(`CREATE FUNCTION public."${gateName}"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_advisory_xact_lock(TG_ARGV[0]::bigint); RETURN NEW; END $$`);
    await admin.pool.query(`CREATE TRIGGER "${gateName}" BEFORE INSERT ON public.cyber_retest
      FOR EACH ROW WHEN (NEW.organization_id='${organizationId}')
      EXECUTE FUNCTION public."${gateName}"('${gateKey}')`);
    await gate.query('SELECT pg_advisory_lock($1::bigint)', [gateKey]);
    held = true;
    const gatePid = (await gate.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!
      .pid;
    retest = settled(
      recordCyberRetest(db, scope, {
        findingId: finding.id,
        auditId: clean.id,
        conclusion: 'absent',
        note: 'Synthetic comparable clean retest concurrent with remediation',
      }),
    );
    const retestPid = await waitingQuery(gatePid, '%insert into "cyber_retest"%');
    update = settled(
      updateCyberTask(db, analyst, task.id, {
        status: 'in_progress',
        note: 'Synthetic stale task update must not overwrite verification',
      }),
    );
    await waitingQuery(retestPid, '%"cyber_finding"%for update%');
    await gate.query('SELECT pg_advisory_unlock($1::bigint)', [gateKey]);
    held = false;
    const outcomes = await Promise.all([retest, update]);
    // A failure prints only SQLSTATE values, never SQL text or downstream errors.
    expect(
      outcomes.map((outcome) =>
        outcome.status === 'rejected' ? postgresCode(outcome.reason) : null,
      ),
    ).not.toContain('40P01');
    expect(outcomes[0].status).toBe('fulfilled');
    expect(outcomes[1].status).toBe('rejected');
    if (outcomes[1].status === 'rejected') {
      const reason = outcomes[1].reason as { statusCode?: unknown; code?: unknown };
      expect(reason.statusCode).toBe(409);
      expect(reason.code).toBe('confirmed_finding_required');
    }
    const snapshot = await readCyberSnapshot(db, scope);
    expect(snapshot.findings.find((item) => item.id === finding.id)?.status).toBe('verified_fixed');
    expect(snapshot.tasks.find((item) => item.id === task.id)?.status).toBe('verified_fixed');
    expect(snapshot.retests.filter((item) => item.findingId === finding.id)).toHaveLength(1);
    expect(
      snapshot.events.some(
        (item) => item.targetId === finding.id && item.action === 'remediation.in_progress',
      ),
    ).toBe(false);
  } finally {
    if (held) await gate.query('SELECT pg_advisory_unlock($1::bigint)', [gateKey]);
    await Promise.all([retest, update].filter((operation) => operation !== undefined));
    gate.release();
    await admin.pool.query(`DROP TRIGGER IF EXISTS "${gateName}" ON public.cyber_retest`);
    await admin.pool.query(`DROP FUNCTION IF EXISTS public."${gateName}"()`);
  }
});

it('preserves current role, tenant, input and finding-state guards for remediation updates', async () => {
  const { finding, task, clean } = await fixture();
  const input = { status: 'in_progress', note: 'Synthetic authorized remediation update' };
  await expect(updateCyberTask(db, other, task.id, input)).rejects.toMatchObject({
    statusCode: 404,
  });
  await assignCyberRole(db, scope, analystId, 'reviewer');
  try {
    await expect(updateCyberTask(db, analyst, task.id, input)).rejects.toMatchObject({
      statusCode: 403,
    });
  } finally {
    await assignCyberRole(db, scope, analystId, 'analyst');
  }
  await expect(
    updateCyberTask(db, analyst, task.id, { ...input, status: 'verified_fixed' }),
  ).rejects.toThrow();
  expect((await updateCyberTask(db, analyst, task.id, input))?.status).toBe('in_progress');
  await recordCyberRetest(db, scope, {
    findingId: finding.id,
    auditId: clean.id,
    conclusion: 'absent',
    note: 'Synthetic reviewed correction',
  });
  await expect(updateCyberTask(db, analyst, task.id, input)).rejects.toMatchObject({
    statusCode: 409,
    code: 'confirmed_finding_required',
  });
});
