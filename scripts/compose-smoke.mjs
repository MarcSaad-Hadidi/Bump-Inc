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
assert.equal((await post('/api/auth/sign-out', {}, cookie)).status, 200);
assert.equal(
  (await fetch(`${origin}/me`, { headers: { cookie }, signal: AbortSignal.timeout(5_000) })).status,
  401,
);
console.log('Compose SMTP verification, session, organization, tenant settings and logout passed.');
