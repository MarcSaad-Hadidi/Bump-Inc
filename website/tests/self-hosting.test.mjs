import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSiteServer} from '../scripts/serve-production.mjs';
import {publicOrigin} from '../scripts/hosting-config.mjs';

test('portable public origin defaults to this host and rejects non-origin values', () => {
  assert.equal(publicOrigin(''), '');
  assert.equal(publicOrigin('https://bump.example/'), 'https://bump.example');
  for (const value of ['file:///private', 'https://user:pass@bump.example', 'https://bump.example/path', 'https://bump.example?query']) {
    assert.throws(() => publicOrigin(value));
  }
});

test('the real production HTTP server serves FR/EN, 3D files and seekable audio', async t => {
  const root = await mkdtemp(join(tmpdir(), 'bump-hosting-'));
  for (const [name, content] of Object.entries({
    'index.html': '<html lang="fr">Bump</html>', 'en.html': '<html lang="en">Bump</html>',
    'model.glb': 'gltf-fixture', 'decoder.wasm': 'wasm-fixture', 'music.mp3': '0123456789',
  })) await writeFile(join(root, name), content);
  const server = createSiteServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, {recursive: true, force: true}); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const french = await fetch(origin); assert.equal(french.status, 200); assert.match(await french.text(), /lang="fr"/);
  const english = await fetch(origin + '/en'); assert.match(await english.text(), /lang="en"/);
  const canonical = await fetch(origin + '/en/?demo=1', {redirect: 'manual'});
  assert.equal(canonical.status, 308); assert.equal(canonical.headers.get('location'), '/en?demo=1');
  const model = await fetch(origin + '/model.glb'); assert.equal(model.headers.get('content-type'), 'model/gltf-binary');
  const decoder = await fetch(origin + '/decoder.wasm', {method: 'HEAD'});
  assert.equal(decoder.headers.get('content-type'), 'application/wasm'); assert.equal(await decoder.text(), '');
  const audio = await fetch(origin + '/music.mp3', {headers: {Range: 'bytes=2-5'}});
  assert.equal(audio.status, 206); assert.equal(audio.headers.get('content-type'), 'audio/mpeg');
  assert.equal(audio.headers.get('content-range'), 'bytes 2-5/10'); assert.equal(await audio.text(), '2345');
  const tail = await fetch(origin + '/music.mp3', {headers: {Range: 'bytes=-3'}});
  assert.equal(await tail.text(), '789');
  assert.equal((await fetch(origin + '/music.mp3', {headers: {Range: 'bytes=99-100'}})).status, 416);
  assert.equal((await fetch(origin + '/missing.wasm', {headers: {Accept: 'text/html'}})).status, 404);
  assert.equal((await fetch(origin + '/__mobile-review')).status, 404);
  assert.equal((await fetch(origin + '/model.glb', {method: 'POST'})).status, 405);
  assert.equal((await fetch(origin + '/..%2f..%2fpackage.json')).status, 404);
  const refresh = await fetch(origin + '/chapter', {headers: {Accept: 'text/html'}});
  assert.match(await refresh.text(), /lang="fr"/);
});
