import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { EXECUTION_QUEUE_NAME } from '@bump/contracts';
import {
  approveCyberMandate,
  compareCyberAudits,
  createCyberAsset,
  createCyberClient,
  createCyberMandate,
  createCyberSource,
  createCyberTask,
  launchCyberAudit,
  readCyberSnapshot,
  recordCyberRetest,
  reviewCyberFinding,
} from '@bump/core';
import { createDatabase, migrateDatabase } from '@bump/db';
import { createCyberVault } from '@bump/integrations';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { trivyCoverage } from '../../apps/worker/src/cyber/coverage.js';
import {
  buildDockerArguments,
  createScannerAdapter,
  dockerCommand,
  nativeCapabilities,
  resourceIsolationAvailable,
} from '../../apps/worker/src/cyber/docker.js';
import { SCANNER_IMAGES } from '../../apps/worker/src/cyber/registry.js';
import { createExecutionWorker, dispatchExecutions } from '../../apps/worker/src/execution.js';

const fakePat =
  'ghp_' +
  createHash('sha256').update('SYNTHETIC-NEVER-A-REAL-CREDENTIAL').digest('hex').slice(0, 36);
const files = [
  { path: 'app.py', content: 'value = input()\nprint(eval(value)) # nosemgrep\n' },
  { path: 'config.py', content: `api_key = "${fakePat}" # gitleaks:allow\n` },
  { path: 'Dockerfile', content: 'FROM alpine:3.20\nUSER root\n' },
  {
    path: 'package-lock.json',
    content: JSON.stringify({
      name: 'synthetic-cyber-lab',
      lockfileVersion: 2,
      packages: {
        '': { name: 'synthetic-cyber-lab', version: '1.0.0', dependencies: { lodash: '4.17.20' } },
        'node_modules/lodash': {
          version: '4.17.20',
          resolved: 'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz',
        },
      },
    }),
  },
];
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
  admin = createDatabase(migration);
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
connection.on('error', () => {});
const queue = new Queue(EXECUTION_QUEUE_NAME, { connection });
const org = randomUUID(),
  user = randomUUID(),
  scope = { organizationId: org, userId: user, requestId: randomUUID() },
  vault = createCyberVault(Buffer.alloc(32, 23));
let provisioned = false;
beforeAll(async () => {
  if (!(await resourceIsolationAvailable()))
    throw new Error(
      'BLOCKED: Docker CPU/memory/PID cgroup enforcement is required; no unconfined fallback is allowed.',
    );
  const capabilities = await nativeCapabilities();
  expect(capabilities.filter((c) => c.available)).toHaveLength(3);
  await migrateDatabase(migration);
  await admin.pool.query(
    'INSERT INTO "user"(id,name,email,email_verified) VALUES ($1,$2,$3,true)',
    [user, 'Synthetic native Cyber tester', `${user}@example.invalid`],
  );
  await admin.pool.query(
    'INSERT INTO organization(id,name,slug,created_at) VALUES ($1,$2,$1,now())',
    [org, 'Synthetic native Cyber workspace'],
  );
  await admin.pool.query(
    'INSERT INTO member(id,organization_id,user_id,role) VALUES ($1,$2,$3,$4)',
    [randomUUID(), org, user, 'owner'],
  );
  provisioned = true;
});
afterAll(async () => {
  if (provisioned) {
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
  }
  await queue.close();
  await connection.quit();
  await db.pool.end();
  await admin.pool.end();
});
it.each(['semgrep', 'trivy', 'gitleaks'] as const)(
  'executes the pinned %s image without network and parses real output',
  async (engine) => {
    if (engine === 'trivy')
      await expect(
        createScannerAdapter(engine).prepareExecution([
          { path: 'Dockerfile', content: '#trivy:ignore:AVD-DS-0002\nFROM alpine\nUSER root\n' },
        ]),
      ).rejects.toMatchObject({ code: 'source_suppression_not_allowed' });
    const adapter = createScannerAdapter(engine),
      plan = await adapter.prepareExecution(files);
    try {
      const raw = await adapter.execute(plan, AbortSignal.timeout(28000));
      const observations = adapter.parseResults(raw);
      expect(observations.length).toBeGreaterThan(0);
      expect(JSON.stringify(observations)).not.toContain(fakePat);
      if (engine === 'semgrep')
        expect(
          observations.some(
            (o) => o.ruleId === 'bump.python.dynamic-eval' && o.location === 'app.py:2',
          ),
        ).toBe(true);
      if (engine === 'trivy')
        expect(observations.some((o) => o.component === 'lodash' && o.cve && o.fixedVersion)).toBe(
          true,
        );
      if (engine === 'gitleaks')
        expect(observations.some((o) => o.location.startsWith('config.py:'))).toBe(true);
    } finally {
      await adapter.cleanup(plan);
    }
  },
);
it('detects real Trivy precise inventory loss and never reports a passing Dockerfile check', async () => {
  const adapter = createScannerAdapter('trivy');
  const exact = [
    { path: 'requirements.txt', content: 'Django==1.2\nurllib3==2.0.7\n' },
    { path: 'Dockerfile', content: 'FROM alpine:3.20\nUSER root\n' },
  ];
  const unresolved = [
    { path: 'requirements.txt', content: 'Django>=1.2\nurllib3==2.0.7\n' },
    { path: 'Dockerfile', content: 'FROM alpine:3.20\nUSER 10001\n' },
  ];
  async function scan(source: typeof exact) {
    const plan = await adapter.prepareExecution(source);
    try {
      const raw = await adapter.execute(plan, AbortSignal.timeout(28000));
      const report: unknown = JSON.parse(raw);
      return { report, observations: adapter.parseResults(raw), coverage: trivyCoverage(report) };
    } finally {
      await adapter.cleanup(plan);
    }
  }
  const before = await scan(exact);
  const after = await scan(unresolved);
  // Trivy 0.76.1 emits ID=DS-0002 (AVDID is deprecated), as documented by
  // its integration/testdata/dockerfile.json.golden reference output.
  expect(before.observations.some((o) => o.ruleId === 'DS-0002')).toBe(true);
  expect(before.observations.some((o) => o.component.toLowerCase() === 'django' && o.cve)).toBe(
    true,
  );
  expect(after.observations.some((o) => o.component.toLowerCase() === 'django')).toBe(false);
  expect(before.coverage.join('\n')).toContain('"django"');
  expect(after.coverage.join('\n')).not.toContain('"django"');
  expect(before.coverage).not.toEqual(after.coverage);
  expect(trivyCoverage(before.report, exact)).toEqual(before.coverage);
  expect(() => trivyCoverage(after.report, unresolved)).toThrow('Incomplete Trivy coverage');

  const report = after.report as {
    Results: { Misconfigurations?: { ID: string; AVDID?: string; Status: string }[] }[];
  };
  const userCheck = report.Results.flatMap((result) => result.Misconfigurations ?? []).find(
    (check) => check.ID === 'DS-0002',
  );
  expect(userCheck?.Status).toBe('PASS');
  expect(after.observations.some((o) => o.ruleId === 'DS-0002')).toBe(false);
});
it('cancels the scanner and removes its container', async () => {
  const adapter = createScannerAdapter('semgrep'),
    plan = await adapter.prepareExecution(files);
  try {
    await expect(adapter.execute(plan, AbortSignal.timeout(100))).rejects.toThrow();
  } finally {
    await adapter.cleanup(plan);
  }
  await expect(
    dockerCommand(['inspect', plan.name], AbortSignal.timeout(3000), 2000),
  ).rejects.toThrow();
});
it('runs the real queue pipeline, requires human review, records remediation and a comparable retest', async () => {
  const client = await createCyberClient(db, scope, {
    name: 'Synthetic native scanner client',
    contact: 'lab@example.invalid',
  });
  const asset = await createCyberAsset(db, scope, {
    clientId: client.id,
    label: 'Synthetic offline repository',
    target: { kind: 'repository', value: 'lab/synthetic' },
  });
  const mandate = await createCyberMandate(db, scope, {
    clientId: client.id,
    reference: 'SYNTHETIC-NATIVE-ONLY',
    signedBy: 'Synthetic laboratory owner',
    authorizedAt: new Date(Date.now() - 60000).toISOString(),
    responsibleUserId: user,
    authorizationText:
      'Synthetic written consent for offline static analysis of these exact laboratory files, with no external audit targets.',
    emergencyContact: 'lab@example.invalid',
    validFrom: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 3600000).toISOString(),
    assetIds: [asset.id],
    engines: ['semgrep', 'trivy', 'gitleaks'],
    mode: 'passive',
    limitations: 'Synthetic fixtures only; no network scanner or client data.',
  });
  await approveCyberMandate(db, scope, mandate.id);
  await createCyberSource(db, vault, scope, {
    assetId: asset.id,
    name: 'Synthetic vulnerable snapshot',
    files,
  });
  const worker = createExecutionWorker({
    database: db,
    connection,
    concurrency: 1,
    cyberVault: vault,
  });
  worker.on('error', () => {});
  await worker.waitUntilReady();
  async function complete(auditId: string) {
    const end = Date.now() + 90000;
    while (Date.now() < end) {
      await dispatchExecutions(db, queue);
      const snapshot = await readCyberSnapshot(db, scope);
      const selected = snapshot.scans.filter((s) => s.scan.auditId === auditId);
      if (selected.length && selected.every((s) => s.status === 'succeeded')) return snapshot;
      if (selected.some((s) => ['dead_letter', 'denied', 'cancelled'].includes(s.status)))
        throw new Error('Real scanner pipeline failed');
      await delay(100);
    }
    throw new Error('Real scanner pipeline timed out');
  }
  try {
    const initial = await launchCyberAudit(
      db,
      scope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: [asset.id],
        engines: ['semgrep', 'trivy', 'gitleaks'],
        title: 'Synthetic native initial',
        idempotencyKey: randomUUID(),
      },
      ['semgrep', 'trivy', 'gitleaks'],
    );
    const results = await complete(initial.id);
    expect(results.findings.length).toBeGreaterThan(2);
    expect(results.findings.every((f) => f.status === 'to_review')).toBe(true);
    expect(JSON.stringify(results)).not.toContain(fakePat);
    const finding = results.findings.find(
      (f) => f.observation.ruleId === 'bump.python.dynamic-eval',
    )!;
    expect(finding).toBeDefined();
    await reviewCyberFinding(db, scope, finding.id, {
      status: 'confirmed',
      note: 'Human review of the synthetic eval fixture',
      businessImpact: 'Synthetic input reaches dynamic evaluation',
      recommendation: 'Replace eval with parsing or explicit allowed operations',
    });
    await createCyberTask(db, scope, {
      findingId: finding.id,
      assignee: 'Synthetic engineer',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      description: 'Remove eval from the laboratory fixture',
    });
    await createCyberSource(db, vault, scope, {
      assetId: asset.id,
      name: 'Synthetic corrected snapshot',
      files: files.map((f) =>
        f.path === 'app.py' ? { ...f, content: 'value = input()\nprint(value)\n' } : f,
      ),
    });
    const retest = await launchCyberAudit(
      db,
      scope,
      {
        clientId: client.id,
        mandateId: mandate.id,
        assetIds: [asset.id],
        engines: ['semgrep'],
        title: 'Synthetic native retest',
        idempotencyKey: randomUUID(),
      },
      ['semgrep'],
    );
    await complete(retest.id);
    expect((await compareCyberAudits(db, scope, initial.id, retest.id)).coverageReduced).toBe(true);
    await recordCyberRetest(db, scope, {
      findingId: finding.id,
      auditId: retest.id,
      conclusion: 'absent',
      note: 'Reviewed the completed identical Semgrep rule/file coverage on the corrected synthetic snapshot',
    });
    expect(
      (await readCyberSnapshot(db, scope)).findings.find((f) => f.id === finding.id)?.status,
    ).toBe('verified_fixed');
  } finally {
    await worker.close();
  }
});

it('force-stops a container that ignores SIGTERM', async () => {
  const adapter = createScannerAdapter('gitleaks'),
    plan = await adapter.prepareExecution(files);
  const args = buildDockerArguments(plan);
  const imageIndex = args.indexOf(SCANNER_IMAGES.gitleaks);
  const run = [
    ...args.slice(0, imageIndex),
    '--entrypoint=/bin/sh',
    SCANNER_IMAGES.gitleaks,
    '-c',
    'trap "" TERM; while :; do sleep 1; done',
  ];
  const began = Date.now();
  try {
    await expect(
      dockerCommand(run, AbortSignal.timeout(1500), 1048576, plan.name),
    ).rejects.toThrow();
  } finally {
    await adapter.cleanup(plan);
  }
  expect(Date.now() - began).toBeLessThan(8000);
  await expect(
    dockerCommand(['inspect', plan.name], AbortSignal.timeout(3000), 2000),
  ).rejects.toThrow();
});

it('keeps the hard container deadline after the host controller is killed', async () => {
  const adapter = createScannerAdapter('gitleaks'),
    plan = await adapter.prepareExecution(files);
  const args = buildDockerArguments(plan, 3);
  const imageIndex = args.indexOf(SCANNER_IMAGES.gitleaks);
  // Trusted synthetic hang behind the exact init/timeout boundary used by native
  // adapters. No command or shell source can enter this path from the dashboard.
  const run = [
    ...args.slice(0, imageIndex + 1),
    '-s',
    'KILL',
    '3',
    '/bin/sh',
    '-c',
    'trap "" TERM; while :; do sleep 1; done',
  ];
  const controller = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import {spawn} from 'node:child_process'; spawn('docker',['--host=unix:///var/run/docker.sock',...JSON.parse(process.argv[1])],{shell:false,stdio:'ignore'}); setInterval(()=>{},1000);",
      JSON.stringify(run),
    ],
    { shell: false, stdio: 'ignore' },
  );
  const exit = new Promise<void>((resolve) => controller.once('close', () => resolve()));
  const running = async () => {
    try {
      return (
        (
          await dockerCommand(
            ['inspect', '--format', '{{.State.Running}}', plan.name],
            AbortSignal.timeout(1000),
            128,
          )
        ).trim() === 'true'
      );
    } catch {
      return false;
    }
  };
  const present = async () =>
    (
      await dockerCommand(
        ['ps', '--all', '--filter', `name=^/${plan.name}$`, '--format', '{{.Names}}'],
        AbortSignal.timeout(3000),
        2000,
      )
    ).trim() === plan.name;
  const began = Date.now();
  try {
    while (!(await running()) && Date.now() - began < 5000) await delay(100);
    expect(await running()).toBe(true);
    controller.kill('SIGKILL');
    await exit;
    expect(await running()).toBe(true);
    while (await present()) {
      if (Date.now() - began > 10000)
        throw new Error('Independent container deadline was not enforced');
      await delay(100);
    }
    await expect(
      dockerCommand(['inspect', plan.name], AbortSignal.timeout(3000), 2000),
    ).rejects.toThrow();
  } finally {
    controller.kill('SIGKILL');
    await exit;
    await adapter.cleanup(plan);
  }
});
