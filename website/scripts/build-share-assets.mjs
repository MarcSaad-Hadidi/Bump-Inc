// Generate share previews from the SAME vector outline as the real Bump favicon.
// Only built-in Node modules: no imaging SDK, external download or remote dependency.
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const BACKGROUND = [35, 48, 40]; // Bump forest green (#233028)
const FOREGROUND = [244, 241, 232]; // Bump paper (#f4f1e8)
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = Uint32Array.from({length: 256}, (_, i) => {
  let crc = i;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function pngChunk(type, bytes) {
  const payload = Buffer.from(bytes);
  const chunk = Buffer.alloc(12 + payload.length);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  payload.copy(chunk, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < payload.length + 8; i++)
    crc = crcTable[(crc ^ chunk[i]) & 255] ^ (crc >>> 8);
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, payload.length + 8);
  return chunk;
}

export function renderBumpPng(outline, {width, height, symbolWidth, symbolY = height / 2}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width <= 0 || height <= 0 || width > 2000 || height > 2000) {
    throw new Error('Invalid social image dimensions');
  }
  if (!Array.isArray(outline) || outline.length < 3 ||
      outline.some(point => point.length !== 2 || !point.every(Number.isFinite))) {
    throw new Error('Missing or malformed Bump branding outline');
  }

  const antialias = 3;
  const count = antialias * antialias;
  const coverage = new Uint8Array(width * height);
  const shape = outline.map(([x, y]) => [width / 2 + x * symbolWidth, symbolY - y * symbolWidth]);
  const minY = Math.max(0, Math.floor(Math.min(...shape.map(point => point[1])) * antialias));
  const maxY = Math.min(height * antialias - 1, Math.ceil(Math.max(...shape.map(point => point[1])) * antialias));

  // Even/odd scanline fill costs O(logo_height * points) instead of
  // O(canvas_pixels * points). Subpixel samples smooth the actual logo edge.
  for (let sy = minY; sy <= maxY; sy++) {
    const y = (sy + 0.5) / antialias;
    const intersections = [];
    for (let i = 0, prev = shape.length - 1; i < shape.length; prev = i++) {
      const a = shape[prev], b = shape[i];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        intersections.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    intersections.sort((a, b) => a - b);
    const row = Math.floor(sy / antialias) * width;
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const start = Math.max(0, Math.ceil(intersections[i] * antialias - 0.5));
      const end = Math.min(width * antialias, Math.ceil(intersections[i + 1] * antialias - 0.5));
      for (let sx = start; sx < end; sx++) coverage[row + Math.floor(sx / antialias)]++;
    }
  }

  const scanlines = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    scanlines[row] = 0; // PNG filter: None
    for (let x = 0; x < width; x++) {
      const alpha = Math.min(coverage[y * width + x], count) / count;
      for (let c = 0; c < 3; c++) {
        scanlines[row + 1 + x * 3 + c] = Math.round(
          BACKGROUND[c] * (1 - alpha) + FOREGROUND[c] * alpha
        );
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits/channel
  ihdr[9] = 2; // RGB, no transparency (predictable social previews)
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines, {level: 9})),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function buildShareAssets(siteRoot = root) {
  const outline = JSON.parse(readFileSync(join(siteRoot, 'src/bump/chapters/branding/symbol-outline.json'), 'utf8'));
  const previews = [
    {file: 'public/bump/brand/bump-social-v1.png', width: 1200, height: 630, symbolWidth: 475},
    {file: 'public/bump/apple-touch-icon.png', width: 180, height: 180, symbolWidth: 145},
  ];
  for (const {file, width, height, symbolWidth} of previews) {
    const destination = join(siteRoot, file);
    mkdirSync(dirname(destination), {recursive: true});
    writeFileSync(destination, renderBumpPng(outline, {width, height, symbolWidth}));
  }
  console.log('Prepared branded social preview (1200x630) and Apple touch icon.');
}
