import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {renderBumpPng} from '../scripts/build-share-assets.mjs';

const previewPath = 'dist/client/bump/brand/bump-social-v1.png';
const iconPath = 'dist/client/bump/apple-touch-icon.png';
const oldArtwork = '/bump/art/hero-fallback-v2.webp';

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

test('Apple touch icon is a real branded 180×180 PNG', () => {
  const {width, height} = inspectPng(iconPath);
  assert.equal(width, 180);
  assert.equal(height, 180);
});

test('renderer validates outline and produces deterministic PNG output', () => {
  const points = [[-0.5,-0.4],[-0.5,0.4],[0.5,0.4],[0.5,-0.4]];
  const options = {width: 96, height: 64, symbolWidth: 52};
  assert.deepEqual(renderBumpPng(points, options), renderBumpPng(points, options));
  assert.throws(() => renderBumpPng([], options), /outline/);
  assert.throws(() => renderBumpPng(points, {...options, width: 9999}), /dimensions/);
});

test('French/English static HTML uses the logo instead of the old artwork', () => {
  const fr = readFileSync('dist/client/index.html', 'utf8');
  const en = readFileSync('dist/client/en.html', 'utf8');
  for (const html of [fr, en]) {
    assert.match(html, /property="og:image" content="[^"]*\/bump\/brand\/bump-social-v1\.png"/);
    assert.match(html, /name="twitter:image" content="[^"]*\/bump\/brand\/bump-social-v1\.png"/);
    assert.match(html, /property="og:image:type" content="image\/png"/);
    assert.match(html, /property="og:image:width" content="1200"/);
    assert.match(html, /property="og:image:height" content="630"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/bump\/apple-touch-icon\.png"/);
    assert.ok(!html.includes('property="og:image" content="' + oldArtwork));
  }
  assert.match(fr, /property="og:locale" content="fr_CA"/);
  assert.match(en, /property="og:locale" content="en_CA"/);
  assert.match(en, /property="og:url" content="[^"]*\/en"/);
});
