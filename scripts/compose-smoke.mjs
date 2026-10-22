import assert from 'node:assert/strict';

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
