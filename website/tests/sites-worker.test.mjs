import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker, {createWorker} from "../worker/index.js";

test('embedded shared modules work without an ASSETS binding in both languages', async () => {
  for (const prefix of ['/runtime/assets/', '/runtime/en/assets/']) {
    const pathname = prefix + 'bump-shared-ABC123.js';
    const source = 'export const ready = true;';
    const app = createWorker({[pathname]: source, '/private.txt': 'never exposed'});
    const response = await app.fetch(new Request('https://example.test' + pathname), {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/javascript; charset=utf-8');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await response.text(), source);
    const head = await app.fetch(new Request('https://example.test' + pathname, {method: 'HEAD'}), {});
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await app.fetch(new Request('https://example.test' + pathname, {method: 'POST'}), {})).status, 405);
    for (const missing of [prefix + 'bump-shared-MISSING.js', '/private.txt']) {
      assert.equal((await app.fetch(new Request('https://example.test' + missing), {})).status, 404);
    }
  }
});

test('SEO entry and native chunks are served from the verified build graph', async () => {
  for (const pathname of ['/runtime/seo/BumpSeoFigures.js', '/runtime/seo/native-AssistantIA-ABC123.js']) {
    const source = 'export const ready = true;';
    const app = createWorker({[pathname]: source, '/runtime/seo/private.txt': 'never exposed'});
    const response = await app.fetch(new Request('https://example.test' + pathname), {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/javascript; charset=utf-8');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await response.text(), source);
    assert.equal(response.headers.get('Cache-Control'), pathname.endsWith('/BumpSeoFigures.js') ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable');
    const head = await app.fetch(new Request('https://example.test' + pathname, {method: 'HEAD'}), {});
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await app.fetch(new Request('https://example.test' + pathname, {method: 'POST'}), {})).status, 405);
    for (const missing of ['/runtime/seo/native-MISSING.js', '/runtime/seo/private.txt']) {
      assert.equal((await app.fetch(new Request('https://example.test' + missing), {})).status, 404);
    }
  }
});

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("unknown pages return a real 404 instead of an indexable homepage", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow');
  assert.deepEqual(calls, ["/404.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const [request,expectedAssetCalls] of [
    [new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),0],
    [new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),1],
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, expectedAssetCalls);
    if(!expectedAssetCalls){
      assert.match(response.headers.get('Content-Type'),/application\/json/);
      assert.equal(response.headers.get('Cache-Control'),'no-store');
      assert.deepEqual(await response.json(),{error:'not_found'});
    }
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
