import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { EXECUTION_QUEUE_NAME } from '@bump/contracts';
import {
  approveCyberMandate,
  cancelExecution,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  launchCyberAudit,
  readCyberSnapshot,
  revokeEngagement,
  saveCyberSource,
} from '@bump/core';
import { createDatabase, migrateDatabase } from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createExecutionWorker, dispatchExecutions } from '../execution.js';

const url = process.env.DATABASE_URL,
  migration = process.env.MIGRATION_DATABASE_URL,
  redisUrl = process.env.REDIS_URL;
if (
  process.env.NODE_ENV !== 'test' ||
  !url ||
  !migration ||
  !redisUrl ||
  !new URL(url).pathname.endsWith('_test') ||
  new URL(redisUrl).pathname !== '/1'
)
  throw new Error('Isolated test services required');
const db = createDatabase(url),
  admin = createDatabase(migration),
  connection = new Redis(redisUrl, { maxRetriesPerRequest: null }),
  queue = new Queue(EXECUTION_QUEUE_NAME, { connection });
connection.on('error', () => {});
const org = randomUUID(),
  user = randomUUID(),
  scope = { organizationId: org, userId: user, requestId: randomUUID() },
  vault = createCyberVault(Buffer.alloc(32, 19));
let clientId: string, assetId: string, mandateId: string, engagementId: string;
const secret = 'synthetic-private-' + String.fromCharCode(65).repeat(30);
const report = JSON.stringify({
  version: 1,
  engine: 'gitleaks',
  engineVersion: '8.30.1',
  report: [
    {
      RuleID: 'synthetic-secret-rule',
      File: 'config.py',
      StartLine: 2,
      Secret: secret,
      Match: secret,
    },
  ],
});
beforeAll(async () => {
  await migrateDatabase(migration);
  await admin.pool.query(
    'INSERT INTO "user"(id,name,email,email_verified) VALUES ($1,$2,$3,true)',
    [user, 'Synthetic Cyber import tester', `${user}@example.invalid`],
  );
  await admin.pool.query(
    'INSERT INTO organization(id,name,slug,created_at) VALUES ($1,$2,$1,now())',
    [org, 'Synthetic Cyber import workspace'],
  );
  await admin.pool.query(
    'INSERT INTO member(id,organization_id,user_id,role) VALUES ($1,$2,$3,$4)',
    [randomUUID(), org, user, 'owner'],
  );
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic import client',
    contact: 'lab@example.invalid',
  });
  clientId = client.id;
  const asset = await createCyberAsset(db, scope, {
    clientId,
    label: 'Synthetic repository',
    target: { kind: 'repository', value: 'lab/synthetic-import' },
  });
  assetId = asset.id;
  const mandate = await createCyberMandate(db, scope, {
    clientId,
    reference: 'SYNTHETIC-IMPORT-ONLY',
    signedBy: 'Synthetic owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: user,
    authorizationText:
      'Synthetic written consent to import offline reports for this exact laboratory repository, without executing any external scan.',
    emergencyContact: 'lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: [assetId],
    engines: ['json', 'sarif'],
    mode: 'passive',
    limitations: 'Only synthetic imported files; no network targets.',
  });
  mandateId = mandate.id;
  engagementId = mandate.engagementId;
  await approveCyberMandate(db, scope, mandateId);
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
    await admin.pool.query(`DELETE FROM ${table} WHERE organization_id=$1`, [org]);
  await admin.pool.query('DELETE FROM organization WHERE id=$1', [org]);
  await admin.pool.query('DELETE FROM "user" WHERE id=$1', [user]);
  await queue.close();
  await connection.quit();
  await db.pool.end();
  await admin.pool.end();
});
async function submit(sourceText = report, engine: 'json' | 'sarif' = 'json') {
  await saveCyberSource(db, vault, scope, assetId, 'Synthetic report', engine, sourceText);
  return launchCyberAudit(
    db,
    scope,
    {
      clientId,
      mandateId,
      assetIds: [assetId],
      engines: [engine],
      idempotencyKey: randomUUID(),
      title: 'Synthetic queue import',
    },
    [engine],
  );
}
async function terminal(auditId: string) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    await dispatchExecutions(db, queue);
    const snapshot = await readCyberSnapshot(db, scope);
    const scan = snapshot.scans.find((s) => s.scan.auditId === auditId);
    if (scan && ['succeeded', 'dead_letter', 'denied', 'cancelled'].includes(scan.status))
      return { snapshot, scan };
    await delay(30);
  }
  throw new Error('Synthetic pipeline timeout');
}
it('processes encrypted JSON through the actual queue without exposing secrets or confirming findings', async () => {
  const worker = createExecutionWorker({
    database: db,
    connection,
    concurrency: 1,
    cyberVault: vault,
  });
  worker.on('error', () => {});
  try {
    await worker.waitUntilReady();
    const audit = await submit();
    const { snapshot, scan } = await terminal(audit.id);
    expect(scan.status).toBe('succeeded');
    expect(scan.scan.observationCount).toBe(1);
    expect(scan.scan.stage).toBe('completed');
    expect(snapshot.findings[0]?.status).toBe('to_review');
    expect(snapshot.findings[0]?.observation.engineVersion).toContain('imported');
    expect(JSON.stringify(snapshot)).not.toContain(secret);
    const rows = await admin.pool.query(
      'SELECT ciphertext FROM cyber_evidence WHERE organization_id=$1',
      [org],
    );
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].ciphertext).not.toContain(secret);
    await queue.add('execute', { jobId: scan.scan.executionJobId });
    await delay(100);
    expect(
      (
        await admin.pool.query(
          'SELECT count(*)::int AS n FROM cyber_observation WHERE organization_id=$1',
          [org],
        )
      ).rows[0].n,
    ).toBe(1);
  } finally {
    await worker.close();
  }
});
it('records a malformed report as failed without partial findings', async () => {
  const worker = createExecutionWorker({
    database: db,
    connection,
    concurrency: 1,
    cyberVault: vault,
  });
  worker.on('error', () => {});
  try {
    await worker.waitUntilReady();
    const audit = await submit('{"version":1,"engine":"unsupported"}');
    const { scan } = await terminal(audit.id);
    expect(scan.status).toBe('dead_letter');
    expect(scan.errorCode).toBe('scanner_failed');
    expect(
      (
        await admin.pool.query(
          'SELECT count(*)::int AS n FROM cyber_observation WHERE audit_id=$1',
          [audit.id],
        )
      ).rows[0].n,
    ).toBe(0);
  } finally {
    await worker.close();
  }
});
it('cancels a queued scan before any source is parsed', async () => {
  const audit = await submit();
  const { scan } = (await readCyberSnapshot(db, scope)).scans.find(
    (s) => s.scan.auditId === audit.id,
  )!;
  await cancelExecution(db, {
    organizationId: org,
    userId: user,
    requestId: randomUUID(),
    jobId: scan.executionJobId,
  });
  const result = await terminal(audit.id);
  expect(result.scan.status).toBe('cancelled');
  expect(result.scan.scan.observationCount).toBeNull();
});
it('rechecks mandate revocation at actual worker execution', async () => {
  const audit = await submit();
  await revokeEngagement(db, {
    ...scope,
    engagementId,
    expectedRevision: 1,
    reason: 'Synthetic withdrawal before processing',
  });
  const worker = createExecutionWorker({
    database: db,
    connection,
    concurrency: 1,
    cyberVault: vault,
  });
  worker.on('error', () => {});
  try {
    await worker.waitUntilReady();
    const { scan } = await terminal(audit.id);
    expect(scan.status).toBe('denied');
    expect(scan.scan.observationCount).toBeNull();
  } finally {
    await worker.close();
  }
});
