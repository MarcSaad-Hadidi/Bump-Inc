import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/client/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.ktx2': 'image/ktx2',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

export function createSiteServer(directory = defaultRoot) {
  const root = path.resolve(directory);
  return http.createServer(async (request, response) => {
    const reply = (status, text, extra = {}) => {
      response.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8', ...extra});
      response.end(request.method === 'HEAD' ? undefined : text);
    };
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        reply(405, 'Method not allowed', {Allow: 'GET, HEAD'}); return;
      }
      const url = new URL(request.url, 'http://site.local');
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); }
      catch { reply(400, 'Invalid path'); return; }
      if (pathname.includes('\0')) { reply(400, 'Invalid path'); return; }
      if (pathname === '/en/' || pathname === '/en.html') {
        response.writeHead(308, {Location: '/en' + url.search}); response.end(); return;
      }
      const candidate = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname === '/en' ? '/en.html' : pathname));
      if (!candidate.startsWith(root + path.sep)) { reply(404, 'Not found'); return; }
      let file = candidate;
      let info = await stat(file).catch(() => null);
      if (!info?.isFile()) {
        if (path.extname(pathname) || !request.headers.accept?.includes('text/html')) {
          reply(404, 'Not found'); return;
        }
        file = path.join(root, 'index.html');
        info = await stat(file).catch(() => null);
      }
      if (!info?.isFile()) { reply(404, 'Build not found. Run npm run build first.'); return; }
      const headers = {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes',
      };
      let start = 0, end = info.size - 1, status = 200;
      if (request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!match || (!match[1] && !match[2])) {
          reply(416, 'Invalid range', {'Content-Range': `bytes */${info.size}`}); return;
        }
        if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
        else { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), end); }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
          reply(416, 'Invalid range', {'Content-Range': `bytes */${info.size}`}); return;
        }
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        status = 206;
      }
      headers['Content-Length'] = info.size === 0 ? 0 : end - start + 1;
      response.writeHead(status, headers);
      if (request.method === 'HEAD' || info.size === 0) { response.end(); return; }
      const stream = createReadStream(file, {start, end});
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch {
      if (!response.headersSent) reply(500, 'Unable to serve this file');
      else response.destroy();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await stat(path.join(defaultRoot, 'index.html'));
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createSiteServer();
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Bump listening on port ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
}
