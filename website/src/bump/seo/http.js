import {pageAt, listPages} from './pages.js';
import {site, originMarker} from './site.js';
import {htmlAsset, markdownPath} from './render.js';

function splitHeader(value, separator) {
  const parts = []; let quoted = false, escaped = false, part = '';
  for (const character of value) {
    if (escaped) { part += character; escaped = false; continue; }
    if (character === '\\' && quoted) { part += character; escaped = true; continue; }
    if (character === '"') quoted = !quoted;
    if (character === separator && !quoted) { parts.push(part); part = ''; } else part += character;
  }
  parts.push(part); return parts;
}

export function prefersMarkdown(accept) {
  if (!accept) return false;
  const ranges = splitHeader(accept, ',').map(part => {
    const [raw, ...parameters] = splitHeader(part, ';');
    const type = raw.trim().toLowerCase();
    const parameter = parameters.find(value => /^\s*q\s*=/i.test(value));
    const q = parameter ? parameter.slice(parameter.indexOf('=') + 1).trim() : '1';
    const quality = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(q) ? Number(q) : 0;
    return {type, quality};
  });
  // A wildcard alone must never turn a browser, link preview or curl into MD.
  const explicit = ranges.filter(range => range.type === 'text/markdown');
  if (!explicit.length) return false;
  const qualityFor = type => {
    for (const pattern of [type, 'text/*', '*/*']) {
      const matches = ranges.filter(range => range.type === pattern);
      if (matches.length) return Math.max(...matches.map(range => range.quality));
    }
    return 0;
  };
  return Math.max(...explicit.map(range => range.quality)) > qualityFor('text/html');
}

const aliases = {'/index.html': '/', '/en/': '/en', '/en.html': '/en', '/editions/winter2026': '/', '/en/editions/winter2026': '/en'};
const discovery = new Map([['/llms.txt', 'text/plain'], ['/llms-full.txt', 'text/plain'], ['/ai.txt', 'text/plain'], ['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml']]);
const describedBy = origin => ['/llms.txt', '/llms-full.txt', '/ai.txt'].map(path => '<' + origin + path + '>; rel="describedby"').join(', ');
const canonicalUrl = (request, path, configuredOrigin = '') => (configuredOrigin || new URL(request.url).origin) + path;
const varyAccept = headers => { const current = headers.get('Vary'); headers.set('Vary', current ? [...new Set([...current.split(',').map(value => value.trim()), 'Accept'])].join(', ') : 'Accept'); };

function publicHeaders(origin) {
  return new Headers({'X-Content-Type-Options': 'nosniff', 'Link': describedBy(origin), 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'});
}
function markdownHeaders(origin, canonical, body, negotiated) {
  const headers = publicHeaders(origin);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('X-Markdown-Tokens', String(Math.ceil(body.length / 4)));
  headers.set('X-Robots-Tag', 'noindex, follow');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept');
  if (canonical) {
    headers.set('Content-Location', canonical);
    headers.set('Link', '<' + canonical + '>; rel="canonical", ' + describedBy(origin));
    headers.set('Last-Modified', new Date(site.updated + 'T00:00:00Z').toUTCString());
  }
  if (negotiated) varyAccept(headers);
  return headers;
}

// One edge/Node route handler. Renderers run at build time, not per visitor.
// fetchAsset receives an exact generated file path and never a private query.
export async function handleContentRequest(request, fetchAsset, {origin: configuredOrigin = ''} = {}) {
  const url = new URL(request.url), origin = configuredOrigin || url.origin;
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return new Response('Invalid path', {status: 400}); }
  if (path.includes('\0')) return new Response('Invalid path', {status: 400});
  if (['/runtime/', '/bump/', '/assets/', '/audio/', '/cursor/', '/.well-known/'].some(prefix => path.startsWith(prefix))) return null;
  const direct = path.startsWith('/api/md/'), suffixed = path.endsWith('.md');
  let pagePath = path;
  if (direct) pagePath = '/' + path.slice('/api/md/'.length);
  if (direct && pagePath === '/index') pagePath = '/';
  if (suffixed && !direct) pagePath = path === '/index.md' ? '/' : path.slice(0, -3);
  if (direct && pagePath.endsWith('.md')) pagePath = pagePath === '/index.md' ? '/' : pagePath.slice(0, -3);
  const page = pageAt(pagePath), alias = aliases[path], slashPage = path.endsWith('/') && pageAt(path.slice(0, -1));
  const isPage = !!page && !direct && !suffixed;
  const negotiated = isPage && prefersMarkdown(request.headers.get('Accept'));
  const markdown = direct || suffixed || negotiated;
  const isCatalog = path === '/api/md/_catalog';
  const managed = markdown || page || alias || slashPage || discovery.has(path) || isCatalog;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return managed ? new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD, OPTIONS'}}) : null;
  if (request.method === 'OPTIONS') {
    if (!markdown && !isCatalog) return null;
    return new Response(null, {status: 204, headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'Accept', 'Access-Control-Max-Age': '86400', 'Vary': 'Access-Control-Request-Headers'}});
  }
  if (alias || slashPage) return new Response(null, {status: 308, headers: {Location: (alias || slashPage.path) + url.search, 'Cache-Control': 'public, max-age=3600'}});
  if (isCatalog) {
    const body = JSON.stringify({name: site.name, updated: site.updated, routes: listPages().map(item => ({path: item.path, language: item.locale, html: origin + item.path, markdown: origin + markdownPath(item.path), title: item.title.replace(/\s+/g, ' ')}))}, null, 2) + '\n';
    const headers = publicHeaders(origin);
    headers.set('Content-Type', 'application/json; charset=utf-8'); headers.set('Access-Control-Allow-Origin', '*'); headers.set('X-Robots-Tag', 'noindex, follow');
    return new Response(request.method === 'HEAD' ? null : body, {headers});
  }
  if (markdown) {
    let body = '# Page not found\n\nNo public markdown renderer exists for this route.\n', status = 404;
    if (page) {
      const asset = await fetchAsset(markdownPath(page.path));
      if (asset.ok) { body = (await asset.text()).replaceAll(originMarker, origin); status = 200; }
    }
    const headers = markdownHeaders(origin, status === 200 ? canonicalUrl(request, page.path, configuredOrigin) : '', body, negotiated);
    if (status === 404) headers.set('Cache-Control', 'public, max-age=0, s-maxage=60');
    return new Response(request.method === 'HEAD' ? null : body, {status, headers});
  }
  if (discovery.has(path)) {
    const asset = await fetchAsset(path);
    if (!asset.ok) return asset;
    const body = (await asset.text()).replaceAll(originMarker, origin), headers = publicHeaders(origin);
    headers.set('Content-Type', discovery.get(path) + '; charset=utf-8');
    headers.set('Access-Control-Allow-Origin', '*');
    if (path !== '/robots.txt') headers.set('X-Robots-Tag', 'noindex, follow');
    if (path === '/llms-full.txt') headers.set('Cache-Control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800');
    return new Response(request.method === 'HEAD' ? null : body, {headers});
  }
  if (page) {
    const asset = await fetchAsset(htmlAsset(page));
    if (!asset.ok) return asset;
    const body = (await asset.text()).replaceAll(originMarker, origin), headers = new Headers(asset.headers);
    headers.delete('Content-Length'); headers.delete('ETag'); headers.delete('Content-Encoding');
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Link', describedBy(origin)); headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
    varyAccept(headers);
    return new Response(request.method === 'HEAD' ? null : body, {headers});
  }
  // Unknown URLs never become a successful homepage (a soft 404).
  if (!path.split('/').pop().includes('.') && !path.startsWith('/runtime/') && !path.startsWith('/bump/')) {
    const headers = publicHeaders(origin); headers.set('X-Robots-Tag', 'noindex, follow'); headers.set('Content-Type', 'text/html; charset=utf-8'); headers.set('Cache-Control', 'no-cache');
    const asset = await fetchAsset('/404.html');
    return new Response(request.method === 'HEAD' ? null : asset.ok ? await asset.text() : '<!doctype html><html lang="fr"><title>Page introuvable | Bump</title><h1>Page introuvable</h1><a href="/">Bump</a></html>', {status: 404, headers});
  }
  return null;
}
