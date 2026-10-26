import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {renderBumpPng} from '../scripts/build-share-assets.mjs';

const previewPath = 'dist/client/bump/brand/bump-social-v1.png';
const iconPath = 'dist/client/bump/apple-touch-icon.png';
const illustratedPreview = '/bump/art/hero-fallback-v2.webp';

function inspectPng(file) {
  const png = readFileSync(file);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  let pos = 8;
  let width = 0, height = 0;
  let idats = [];
  while (pos < png.length) {
    const length = png.readUInt32BE(pos);
    const name = png.toString('ascii', pos + 4, pos + 8);
    const chunk = png.subarray(pos + 8, pos + 8 + length);
    if (name === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      assert.equal(chunk[8], 8, '8-bit color channels');
      assert.equal(chunk[9], 2, 'compatible opaque RGB for social previews');
    }
    if (name === 'IDAT') idats.push(chunk);
    pos += 12 + length;
    if (name === 'IEND') break;
  }
  const pixels = inflateSync(Buffer.concat(idats));
  assert.equal(pixels.length, height * (1 + width * 3));
  return {width, height, pixels, filesize: png.length};
}

test('Bump Open Graph image is 1200×630, crisp, compact and uses the brand symbol', () => {
  const {width, height, pixels, filesize} = inspectPng(previewPath);
  assert.equal(width, 1200);
  assert.equal(height, 630);
  assert.ok(filesize < 500_000, 'keep social preview lean');
  const bg = [35, 48, 40];
  assert.deepEqual([...pixels.subarray(1, 4)], bg);
  let foregroundPixels = 0;
  for (let row = 0; row < height; row += 2) {
    const offset = row * (1 + width * 3) + 1;
    for (let col = 0; col < width; col += 2) {
      const p = offset + col * 3;
      if (pixels[p] > 150 && pixels[p + 1] > 150 && pixels[p + 2] > 150) foregroundPixels++;
    }
  }
  assert.ok(foregroundPixels > 9000, 'the actual Bump logo must be visible and large');
});

test('Apple and Android icons are real square PNGs derived from the Bump symbol', () => {
  for (const [file, side] of [
    [iconPath, 180],
    ['dist/client/bump/apple-touch-icon-v2.png', 180],
    ['dist/client/bump/icon-32-v2.png', 32],
    ['dist/client/bump/icon-192-v2.png', 192],
    ['dist/client/bump/icon-512-v2.png', 512],
  ]) {
    const {width, height, pixels} = inspectPng(file);
    assert.equal(width, side);
    assert.equal(height, side);
    const middle = Math.floor(side / 2);
    const row = middle * (1 + side * 3) + 1;
    assert.notDeepEqual([...pixels.subarray(row + 3 * middle, row + 3 * middle + 3)], [35, 48, 40], file + ' must have a visible logo');
  }
});

test('traditional root favicon.ico contains the generated Bump PNG', () => {
  const ico = readFileSync('dist/client/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 1);
  assert.equal(ico[6], 32);
  assert.equal(ico[7], 32);
  assert.equal(ico.readUInt32LE(18), 22);
  assert.equal(ico.subarray(22, 30).toString('hex'), '89504e470d0a1a0a');
});

test('manifest declares the Bump brand icons instead of any generic icon', () => {
  const manifest = JSON.parse(readFileSync('dist/client/site.webmanifest', 'utf8'));
  assert.equal(manifest.short_name, 'Bump');
  assert.equal(manifest.theme_color, '#233028');
  assert.deepEqual(manifest.icons.map(icon => icon.src), ['/bump/icon-192-v2.png', '/bump/icon-512-v2.png']);
});

test('renderer validates outline and produces deterministic PNG output', () => {
  const points = [[-0.5,-0.4],[-0.5,0.4],[0.5,0.4],[0.5,-0.4]];
  const options = {width: 96, height: 64, symbolWidth: 52};
  assert.deepEqual(renderBumpPng(points, options), renderBumpPng(points, options));
  assert.throws(() => renderBumpPng([], options), /outline/);
  assert.throws(() => renderBumpPng(points, {...options, width: 9999}), /dimensions/);
});

test('French/English link previews show the original characters, not the oversized logo', () => {
  const fr = readFileSync('dist/client/index.html', 'utf8');
  const en = readFileSync('dist/client/en.html', 'utf8');
  const characters = readFileSync('dist/client' + illustratedPreview);
  assert.equal(characters.toString('ascii', 0, 4), 'RIFF');
  assert.equal(characters.toString('ascii', 8, 12), 'WEBP');
  for (const html of [fr, en]) {
    assert.match(html, /property="og:image" content="[^"]*\/bump\/art\/hero-fallback-v2\.webp"/);
    assert.match(html, /property="og:image:secure_url" content="[^"]*\/bump\/art\/hero-fallback-v2\.webp"/);
    assert.match(html, /name="twitter:image" content="[^"]*\/bump\/art\/hero-fallback-v2\.webp"/);
    assert.match(html, /property="og:image:type" content="image\/webp"/);
    assert.match(html, /property="og:image:width" content="1900"/);
    assert.match(html, /property="og:image:height" content="900"/);
    assert.doesNotMatch(html, /property="og:image" content="[^"]*bump-social-v1\.png"/);
    assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/bump\/apple-touch-icon-v2\.png"/);
    assert.match(html, /rel="icon" href="\/bump\/icon-32-v2\.png" type="image\/png" sizes="32x32"/);
    assert.match(html, /rel="shortcut icon" href="\/favicon\.ico"/);
    assert.match(html, /rel="manifest" href="\/site\.webmanifest"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.doesNotMatch(html, /__RENAISSANCE_ORIGIN__/);
  }
  assert.match(fr, /property="og:locale" content="fr_CA"/);
  assert.match(en, /property="og:locale" content="en_CA"/);
  assert.match(en, /property="og:url" content="[^"]*\/en"/);
});
