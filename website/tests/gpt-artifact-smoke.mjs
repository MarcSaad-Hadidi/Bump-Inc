import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {listPages} from '../src/bump/seo/pages.js';
import {htmlAsset, markdownPath, contentAssetPaths} from '../src/bump/seo/render.js';
import worker from '../dist/server/index.js';
import {runtimeChunks} from '../scripts/runtime-chunks.mjs';

const origin = 'https://bump-artifact.example';
for (const file of contentAssetPaths()) assert(!existsSync('dist/client' + file), 'Content must reach the Worker on Sites: ' + file);
for (const file of ['/runtime/assets/BumpNav.js', '/bump/seo/pages.css', '/bump/seo/landing-meta.json', '/bump/art/hero-fallback-v2.webp']) assert(existsSync('dist/client' + file), 'Missing static asset: ' + file);
for (const page of listPages()) {
  for (const [url, accept] of [[page.path, 'text/html'], [page.path, 'text/markdown'], [markdownPath(page.path), '*/*']]) {
    const response = await worker.fetch(new Request(origin + url, {headers: {Accept: accept}}), {});
    assert.equal(response.status, 200, url);
    assert.match(response.headers.get('Content-Type'), accept === 'text/html' ? /^text\/html/ : /^text\/markdown/);
    const body = await response.text(); assert(!body.includes('__BUMP_ORIGIN__')); assert(body.includes(origin + page.path));
  }
}
for (const url of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/ai.txt', '/api/md/_catalog']) assert.equal((await worker.fetch(new Request(origin + url), {})).status, 200);
assert.equal((await worker.fetch(new Request(origin + '/not-a-page'), {})).status, 404);
const chunks = runtimeChunks('dist/client');
assert(Object.keys(chunks).length > 0, 'Current shared-module graph must be covered');
for (const [url, source] of Object.entries(chunks)) {
  const response = await worker.fetch(new Request(origin + url), {});
  assert.equal(response.status, 200, url);
  assert.match(response.headers.get('Content-Type'), /^text\/javascript/);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(await response.text(), source, 'Exact module bytes: ' + url);
  const head = await worker.fetch(new Request(origin + url, {method: 'HEAD'}), {});
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await worker.fetch(new Request(origin + url, {method: 'POST'}), {})).status, 405);
}
assert.equal((await worker.fetch(new Request(origin + '/runtime/assets/bump-shared-MISSING.js'), {})).status, 404);
for (const [legacy, current] of [['/editions/winter2026', '/'], ['/en/editions/winter2026', '/en']]) {
  const response = await worker.fetch(new Request(origin + legacy), {});
  assert.equal(response.status, 308); assert.equal(response.headers.get('Location'), current);
}
console.log('GPT artifact verified: '+listPages().length+' HTML routes, '+listPages().length*2+' markdown accesses, discovery, native origins and 404; all scene/media assets retained.');
