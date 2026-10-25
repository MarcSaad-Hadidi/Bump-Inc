import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {createRendererUuid} from '../src/bump/ui/secureUuid.js';
import {secureThreeIdentifiers, hardenThreeUuid} from '../scripts/secure-render-identifiers.mjs';
import {scriptBlocks, translateOutsideScripts, replaceLoaderStream} from '../scripts/html-scripts.mjs';
import {translateHtml} from '../src/bump/locales/translate.js';
import {encodeStream} from '../scripts/build-bump-english.mjs';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function withEntropy(provider, action) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const random = Math.random;
  Object.defineProperty(globalThis, 'crypto', {value: provider, configurable: true});
  Math.random = () => { throw new Error('Visual randomness reached render identity generation'); };
  try { return action(); }
  finally { Object.defineProperty(globalThis, 'crypto', descriptor); Math.random = random; }
}

test('render UUIDs use exactly 128 secure entropy bits and preserve RFC version/variant at both byte extremes', () => {
  for (const value of [0, 255]) {
    let calls = 0;
    const uuid = withEntropy({getRandomValues(bytes) {
      calls++; assert.ok(bytes instanceof Uint8Array); assert.equal(bytes.length, 16);
      return bytes.fill(value);
    }}, () => createRendererUuid());
    assert.match(uuid, uuidV4); assert.equal(calls, 1);
    assert.equal(uuid, value === 0 ? '00000000-0000-4000-8000-000000000000' : 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  }
  withEntropy(undefined, () => assert.throws(() => createRendererUuid(), /secure random generator/));
  const failure = new Error('Entropy unavailable');
  withEntropy({getRandomValues() { throw failure; }}, () => assert.throws(() => createRendererUuid(), error => error === failure));
});

test('retained Three and freshly bundled Three construct distinct secure IDs and preserve serialization references', async () => {
  const retained = await import('../public/runtime/key-three/build/three.module.js');
  const compiled = await build({stdin: {contents: 'export {Object3D,BufferGeometry,MeshBasicMaterial,Texture,Source} from "three";',
    resolveDir: process.cwd(), sourcefile: 'secure-three-test.js'}, bundle: true, platform: 'node', format: 'esm',
    write: false, plugins: [secureThreeIdentifiers()]});
  const bundled = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  for (const engine of [retained, bundled]) {
    let sequence = 0;
    withEntropy({getRandomValues(bytes) {
      const counter = sequence++;
      for (let i = 0; i < bytes.length; i++) bytes[i] = (counter * 17 + i * 13) & 255;
      return bytes;
    }}, () => {
      const objects = [new engine.Object3D(), new engine.BufferGeometry(), new engine.MeshBasicMaterial(), new engine.Texture(), new engine.Source()];
      const ids = objects.map(object => object.uuid);
      assert.equal(new Set(ids).size, objects.length);
      ids.forEach(id => assert.match(id, uuidV4));
      assert.ok(sequence >= objects.length);
      assert.equal(objects[0].toJSON().object.uuid, objects[0].uuid);
      assert.equal(objects[1].toJSON().uuid, objects[1].uuid);
      assert.equal(objects[2].toJSON().uuid, objects[2].uuid);
      assert.equal(objects[3].toJSON().uuid, objects[3].uuid);
      assert.equal(objects[4].toJSON().uuid, objects[4].uuid);
    });
  }
});

test('both retained UUID boundaries stay secure across repeated builds without changing visual random helpers', () => {
  for (const [file, name, modulePath] of [
    ['public/runtime/assets/Background-DpyJh-o1.js', 'Ai', '/runtime/secure-uuid.js'],
    ['public/runtime/key-three/build/three.module.js', 'generateUUID', '../../secure-uuid.js'],
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.equal(hardenThreeUuid(source, name, modulePath), source);
    const body = new RegExp('function ' + name + '\\(\\)\\s*\\{([^}]*)\\}').exec(source)[1];
    assert.doesNotMatch(body, /Math\.random/);
    const uuid = runInNewContext('(' + 'function ' + name + '(){' + body + '})()', {bumpSecureUUID: createRendererUuid});
    assert.match(uuid, uuidV4);
    assert.match(source, /Math\.random/); // Vector/particle randomness is intentionally preserved.
  }
});

test('markup translates while all browser-recognized script variants remain byte-identical', () => {
  for (const [open, close] of [
    ['<script>', '</script >'], ['<SCRIPT>', '</ScRiPt>'], ['<script>', '</script\t\n>'],
    ['<script>', '</script/>'], ['<script>', '</script data-x="value">'],
    ['<script data-check=">">', '</script>'], ['<script src="/runtime/app.js">', '</script>'],
  ]) {
    const script = open + 'const markup="<b>Notre vision</b>";' + close;
    const html = '<!doctype html><html><body><p>Notre vision</p>' + script + '<p>Votre équipe</p></body></html>';
    const translated = translateOutsideScripts(html, translateHtml);
    assert.ok(translated.includes(script));
    assert.ok(translated.includes('<p>Our vision</p>'));
    assert.ok(translated.includes('<p>Your team</p>'));
  }
  const tail = '<script>const markup="<b>Notre vision</b>";';
  assert.equal(translateOutsideScripts('<p>Notre vision</p>' + tail, translateHtml), '<p>Our vision</p>' + tail);
  const nested = '<template><SCRIPT>"Notre vision"</SCRIPT></template><script>"Votre équipe"</script>';
  assert.equal(translateOutsideScripts(nested, translateHtml), nested);
  assert.equal(translateOutsideScripts('<svg><script/></svg><p>Notre vision</p>', translateHtml), '<svg><script/></svg><p>Our vision</p>');
});

test('both language builders replace only the actual loader call and preserve unconventional closing tags', () => {
  const decoy = '<script>const sample="window.__remixContext.streamController.enqueue(old)";</script>';
  const loader = '<SCRIPT data-check=">">const before=1;window.__remixContext.streamController.enqueue("old");const after=2;</SCRIPT >';
  const html = '<p>Montréal 🚀</p>' + decoy + loader + '<p>Notre vision</p>';
  const replaced = replaceLoaderStream(html, JSON.stringify('updated'));
  assert.ok(replaced.includes(decoy));
  assert.ok(replaced.includes('<SCRIPT data-check=">">const before=1;window.__remixContext.streamController.enqueue("updated");const after=2;</SCRIPT >'));
  assert.equal(scriptBlocks(replaced).length, 2);
  assert.throws(() => replaceLoaderStream(decoy, '"no"'), /exactly one/);
  assert.throws(() => replaceLoaderStream(loader + loader, '"no"'), /exactly one/);
});

test('inline loader data cannot terminate its script even with mixed-case closing tags', () => {
  const payload = '</ScRiPt > <script>globalThis.compromised=true;</script>';
  const serialized = encodeStream({value: payload});
  const html = '<script>window.__remixContext.streamController.enqueue(' + serialized + ');</script>';
  const blocks = scriptBlocks(html); assert.equal(blocks.length, 1);
  const received = [];
  const context = {window: {__remixContext: {streamController: {enqueue: chunk => received.push(chunk)}}}};
  runInNewContext(html.slice(blocks[0].bodyStart, blocks[0].bodyEnd), context);
  assert.equal(received.length, 1); assert.ok(received[0].includes(payload));
  assert.equal(context.compromised, undefined);
});
