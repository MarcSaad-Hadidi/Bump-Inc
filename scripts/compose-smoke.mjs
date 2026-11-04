import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

for (const port of [3001, 3002]) {
  for (const check of ['live', 'ready']) {
    const response = await fetch(`http://127.0.0.1:${port}/health/${check}`, {
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200, `${port} ${check} must succeed`);
    assert.equal((await response.json()).status, 'ok');
  }
}
const page = await fetch('http://127.0.0.1:3000', { signal: AbortSignal.timeout(10_000) });
assert.equal(page.status, 200);
assert.match(await page.text(), /Foundation diagnostics/);
console.log('Compose API, worker, and web smoke checks passed.');

// This smoke runs against disposable Compose data and delivers only to local Mailpit.
const origin = 'http://127.0.0.1:3001';
const unique = randomUUID();
const email = `smoke-${unique}@example.invalid`;
const password = `local-test-${randomUUID()}`;
async function post(path, body, cookie = '') {
  return fetch(new URL(path, origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, cookie },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}
assert.equal(
  (await post('/api/auth/sign-up/email', { name: 'Compose test', email, password })).status,
  200,
);
assert.equal(
  (await post('/api/auth/sign-in/email', { email, password })).status,
  403,
  'Unverified account cannot sign in',
);
const mailbox = await fetch('http://127.0.0.1:8025/api/v1/messages', {
  signal: AbortSignal.timeout(5_000),
});
assert.equal(mailbox.status, 200);
const message = (await mailbox.json()).messages.find((item) =>
  item.To.some((recipient) => recipient.Address === email),
);
assert.ok(message, 'SMTP verification email must reach local Mailpit');
const content = await fetch(
  `http://127.0.0.1:8025/api/v1/message/${encodeURIComponent(message.ID)}`,
  { signal: AbortSignal.timeout(5_000) },
);
assert.equal(content.status, 200);
const link = (await content.json()).Text.match(/https?:\/\/[^\s]+/)?.[0];
assert.ok(link, 'Verification message must contain a URL');
const verificationUrl = new URL(link);
assert.equal(verificationUrl.origin, origin);
assert.equal(verificationUrl.pathname, '/api/auth/verify-email');
const verified = await fetch(verificationUrl, {
  redirect: 'manual',
  signal: AbortSignal.timeout(5_000),
});
assert.ok([200, 302].includes(verified.status), 'Email verification must succeed');
const signedIn = await post('/api/auth/sign-in/email', { email, password });
assert.equal(signedIn.status, 200);
const cookie = signedIn.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.ok(cookie, 'Sign-in must establish a session');
const created = await post(
  '/organizations',
  { name: 'Compose organization', slug: `compose-${unique}`, locale: 'fr' },
  cookie,
);
assert.equal(created.status, 201, 'Authenticated organization creation must persist');
const organization = await created.json();
const settings = await fetch(`${origin}/organizations/${organization.id}/settings`, {
  headers: { cookie },
  signal: AbortSignal.timeout(5_000),
});
assert.equal(settings.status, 200);
assert.equal((await settings.json()).locale, 'fr');
const signedInUser = (await signedIn.json()).user;
const target = { kind: 'hostname', value: 'lab.example.invalid' };
const engagementBase = `/organizations/${organization.id}/engagements`;
const drafted = await post(
  engagementBase,
  {
    objective: 'Validate a synthetic local authorization lifecycle',
    responsibleUserId: signedInUser.id,
    scope: { assets: [target], actions: ['configuration.read', 'audit.import'], exclusions: [] },
    authorizationText: 'Synthetic CI authorization only; no external action is performed.',
    sourceReference: 'Disposable Compose smoke fixture',
    validFrom: new Date(Date.now() - 60_000).toISOString(),
    validUntil: new Date(Date.now() + 3_600_000).toISOString(),
  },
  cookie,
);
assert.equal(drafted.status, 201, 'Mandate creation must persist');
const engagement = await drafted.json();
const decisionPath = `${engagementBase}/${engagement.id}/authorize`;
const decisionInput = { expectedRevision: 1, target, action: 'configuration.read' };
const beforeApproval = await post(decisionPath, decisionInput, cookie);
assert.equal(beforeApproval.status, 200);
assert.equal((await beforeApproval.json()).allowed, false, 'Draft cannot authorize an action');
const approved = await post(
  `${engagementBase}/${engagement.id}/approve`,
  { expectedRevision: 1, authorizationSha256: engagement.version.authorizationSha256 },
  cookie,
);
assert.equal(approved.status, 201, 'Owner must explicitly approve the exact document revision');
const authorized = await post(decisionPath, decisionInput, cookie);
assert.equal(authorized.status, 200);
assert.equal((await authorized.json()).allowed, true, 'Approved exact scope must authorize');
const executionBase = `/organizations/${organization.id}/executions`;
const submitted = await post(
  executionBase,
  {
    engagementId: engagement.id,
    ...decisionInput,
    kind: 'synthetic',
    payload: { durationMs: 0, failUntilAttempt: 1 },
    idempotencyKey: `compose-${unique}`,
    backoffMs: 100,
  },
  cookie,
);
assert.equal(submitted.status, 201, 'Synthetic execution must persist');
const execution = await submitted.json();
assert.equal(execution.leaseToken, undefined, 'Internal lease must not be exposed');
let completed;
const executionDeadline = performance.now() + 30_000;
while (performance.now() < executionDeadline) {
  const response = await fetch(`${origin}${executionBase}/${execution.id}`, {
    headers: { cookie },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, 200);
  completed = await response.json();
  if (completed.status === 'succeeded') break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
assert.equal(completed?.status, 'succeeded', 'Separate worker must finish synthetic retry');
assert.deepEqual(
  completed.attempts.map((attempt) => attempt.outcome),
  ['failed', 'succeeded'],
);
assert.ok(completed.attempts.every((attempt) => attempt.token === undefined));
console.log(
  'Compose durable execution submission, separate worker, bounded retry and history passed.',
);
const importBase = `/organizations/${organization.id}/audit-imports`;
const importInput = {
  engagementId: engagement.id,
  expectedRevision: 1,
  target,
  format: 'bump-json-v1',
  sourceName: 'compose-fixture.json',
  sourceText: JSON.stringify({
    version: 1,
    observations: [
      {
        kind: 'issue',
        title: 'Synthetic imported observation',
        reportedSeverity: 'unknown',
        sourcePointer: '/observations/0',
      },
    ],
  }),
  idempotencyKey: `import-${unique}`,
};
const imported = await post(importBase, importInput, cookie);
assert.equal(imported.status, 201, 'Authorized passive import must persist');
const receipt = await imported.json();
assert.equal(receipt.storageKey, undefined);
assert.equal(receipt.sourceText, undefined);
let importComplete;
const importDeadline = performance.now() + 30_000;
while (performance.now() < importDeadline) {
  const response = await fetch(`${origin}${importBase}/${receipt.id}`, {
    headers: { cookie },
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(response.status, 200);
  importComplete = await response.json();
  if (importComplete.executionStatus === 'succeeded') break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
assert.equal(
  importComplete?.executionStatus,
  'succeeded',
  'Worker must read shared private source',
);
assert.equal(importComplete.observationCount, 1);
const observations = await fetch(`${origin}${importBase}/${receipt.id}/observations`, {
  headers: { cookie },
  signal: AbortSignal.timeout(5_000),
});
assert.equal(observations.status, 200);
assert.equal((await observations.json())[0].observation.title, 'Synthetic imported observation');
const duplicateImport = await post(importBase, importInput, cookie);
assert.equal(duplicateImport.status, 201);
assert.equal((await duplicateImport.json()).executionJobId, receipt.executionJobId);
console.log(
  'Compose private source, separate import worker, observations and deduplication passed.',
);
const revoked = await post(
  `${engagementBase}/${engagement.id}/revoke`,
  { expectedRevision: 1, reason: 'Synthetic fixture completed' },
  cookie,
);
assert.equal(revoked.status, 200);
const afterRevocation = await post(decisionPath, decisionInput, cookie);
assert.equal(afterRevocation.status, 200);
assert.equal((await afterRevocation.json()).allowed, false, 'Revocation must deny further actions');
console.log('Compose mandate draft, explicit approval, exact authorization and revocation passed.');
assert.equal((await post('/api/auth/sign-out', {}, cookie)).status, 200);
assert.equal(
  (await fetch(`${origin}/me`, { headers: { cookie }, signal: AbortSignal.timeout(5_000) })).status,
  401,
);
console.log('Compose SMTP verification, session, organization, tenant settings and logout passed.');
