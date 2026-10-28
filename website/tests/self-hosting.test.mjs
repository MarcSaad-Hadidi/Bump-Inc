import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, readFile, cp, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
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
  for (const [legacy, current] of [['/editions/winter2026', '/'], ['/en/editions/winter2026', '/en']]) {
    const retry = await fetch(origin + legacy + '?projet=1', {redirect: 'manual'});
    assert.equal(retry.status, 308); assert.equal(retry.headers.get('location'), current + '?projet=1');
  }
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
  assert.equal(refresh.status, 404);
  assert.match(await refresh.text(), /lang="fr"/);
});

test('Docker runtime source copies start the server without the rest of the checkout', async t => {
  const root = await mkdtemp(join(tmpdir(), 'bump-container-runtime-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const project = fileURLToPath(new URL('../', import.meta.url));
  const dockerfile = await readFile(join(project, 'Dockerfile'), 'utf8');
  for (const line of dockerfile.split('\n').filter(line => line.startsWith('COPY --from=build '))) {
    const [,source,destination] = line.match(/\s\/site\/(\S+)\s+\.\/(\S+)$/);
    const target = join(root, destination);
    if (source === 'dist/client') {await mkdir(target, {recursive: true}); continue;}
    await mkdir(dirname(target), {recursive: true});
    await cp(join(project, source), target, {recursive: true});
  }
  for (const [asset,markup] of Object.entries({
    'index.html':'<html lang="fr">Bump</html>',
    'en.html':'<html lang="en">Bump</html>',
    'services/integration-ia/index.html':'<html lang="fr">Bump IA</html>',
  })) {
    const target = join(root, 'dist/client', asset);
    await mkdir(dirname(target), {recursive: true});
    await writeFile(target, markup);
  }
  const serverUrl = pathToFileURL(join(root, 'scripts/serve-production.mjs')).href;
  const program = `
    import assert from 'node:assert/strict';
    const {createSiteServer} = await import(${JSON.stringify(serverUrl)});
    const server = createSiteServer();
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    try {
      const origin = 'http://127.0.0.1:' + server.address().port;
      for (const path of ['/','/en','/services/integration-ia']) {
        const response = await fetch(origin + path);
        assert.equal(response.status,200,path);
        assert.match(await response.text(),/Bump/);
      }
    } finally {await new Promise(resolve => server.close(resolve));}
  `;
  await promisify(execFile)(process.execPath, ['--input-type=module','-e',program], {cwd:root,timeout:15000});
});
