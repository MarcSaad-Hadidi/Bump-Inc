import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parse} from '@babel/parser';

// Exercise the actual retained WebGL texture lookup. A poster-only browser
// never runs this path and therefore cannot catch a native renderer startup crash.
function nativeTextureLookup(file, assets, href) {
  const source = readFileSync(file, 'utf8');
  const ast = parse(source, {sourceType: 'module'});
  const fn = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'iI');
  assert(fn, 'Native texture resolver must still exist');
  return runInNewContext('(' + source.slice(fn.start, fn.end) + ')', {
    URL, Ip: assets, window: {location: {href}},
  });
}

test('native FR/EN renderer starts with same-origin textures on a portable host', () => {
  const data = JSON.parse(readFileSync('src/bump/loader-data.json', 'utf8'));
  const background = data.loaderData['routes/($locale).editions.winter2026'].globalContent.backgroundAssets;
  const assets = JSON.parse(JSON.stringify(background).replaceAll('__RENAISSANCE_ORIGIN__', ''));
  for (const [locale, path] of [['assets', '/'], ['en/assets', '/en']]) {
    const href = 'https://independent-bump.example' + path;
    const lookup = nativeTextureLookup('dist/client/runtime/' + locale + '/Background-DpyJh-o1.js', assets, href);
    let texture;
    assert.doesNotThrow(() => { texture = lookup('mud_normal.webp'); }, 'Opening the WebGL compositor must not throw Invalid URL');
    const url = new URL(texture, href);
    assert.equal(url.origin, 'https://independent-bump.example');
    assert(existsSync('dist/client' + url.pathname), 'The compositor texture must be present in the deployed artifact');
  }
});

test('native texture matching keeps relative and absolute URLs, queries and fallback names', () => {
  const file = 'dist/client/runtime/assets/Background-DpyJh-o1.js';
  const href = 'https://bump.example/en?projet=1';
  for (const asset of ['/runtime/media/mud_normal.webp?v=2#texture', 'https://bump.example/runtime/media/mud_normal.webp?v=2']) {
    const lookup = nativeTextureLookup(file, [{url: '/runtime/media/other.webp'}, {url: asset}], href);
    assert.equal(lookup('mud_normal.webp'), asset);
    assert.equal(lookup('unlisted.webp'), 'unlisted.webp');
  }
  assert.equal(nativeTextureLookup(file, [], href)('mud_normal.webp'), 'mud_normal.webp');
});
