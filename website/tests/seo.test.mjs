import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {parse} from 'parse5';
import {listPages, pageFor} from '../src/bump/seo/pages.js';
import {site} from '../src/bump/seo/site.js';
import {publisherBio} from '../src/bump/seo/editorial.js';
import {renderHtml, renderMarkdown, renderLlms, renderLlmsFull, renderRobots, renderAi, renderSitemap, htmlAsset, markdownPath, schemaFor} from '../src/bump/seo/render.js';
import {prefersMarkdown, handleContentRequest} from '../src/bump/seo/http.js';
import {enhanceHome, homeFallback} from '../scripts/build-seo.mjs';
import worker from '../worker/index.js';
import {createSiteServer} from '../scripts/serve-production.mjs';
import {applyLandingMetadata} from '../src/bump/seo/landing.js';
import {prepareGptRouting} from '../scripts/prepare-gpt-routing.mjs';
import {mkdtemp, mkdir, writeFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const origin = 'https://bump.example';
const walk = (node, predicate) => [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap(child => walk(child, predicate))];
const attrs = node => Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
const contentText = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(contentText).join(' ');
const assets = async path => {
  const body = await readFile(new URL('../dist/client' + path, import.meta.url)).catch(() => null);
  return body === null ? new Response('Not found', {status: 404}) : new Response(body);
};
const request = (path, options = {}) => new Request(origin + path, options);

test('explicit Accept preference respects q-values, specificity, ties, quotes and wildcards', () => {
  const cases = [
    [null, false], ['', false], ['*/*', false], ['text/html', false],
    ['text/*', false], ['text/markdown', true], ['TEXT/MARKDOWN; charset=utf-8', true],
    ['text/markdown, text/html', false], ['text/markdown;q=0.8,text/html;q=0.9', false],
    ['text/markdown;q=0.9,text/html;q=0.8', true], ['text/html;q=0.8,*/*;q=1,text/markdown;q=0.9', true],
    ['text/markdown;q=0.5,*/*;q=0.8', false], ['text/markdown;q=0,*/*;q=0', false],
    ['text/markdown;q=garbage,text/html;q=0.2', false], ['text/markdown;q=2', false],
    ['text/markdown;profile="a,b";q=0.8,text/html;q=0.5', true],
  ];
  for (const [accept, expected] of cases) assert.equal(prefersMarkdown(accept), expected, String(accept));
});

test('every public editorial route has bilingual metadata, a real HTML body and a markdown renderer', () => {
  assert.equal(listPages().length, 18);
  const paths = new Set(), titles = new Set(), descriptions = new Set();
  for (const page of listPages()) {
    assert(!paths.has(page.path)); paths.add(page.path);
    assert(!titles.has(page.metaTitle)); titles.add(page.metaTitle);
    assert(!descriptions.has(page.description)); descriptions.add(page.description);
    const md = renderMarkdown(page, origin);
    assert.match(md, /^# .+\n/); assert(md.includes('Canonical: ' + origin + page.path));
    for (const target of md.matchAll(/\]\(([^)]+)\)/g)) { assert(target[1].startsWith(origin + '/') || page.references?.some(reference => reference.url === target[1])); assert(!target[1].endsWith('.md')); }
    if (page.type === 'home') continue;
    const tree = parse(renderHtml(page, origin));
    const main = walk(tree, node => node.tagName === 'main')[0];
    assert.equal(walk(main, node => node.tagName === 'h1').length, 1);
    const links = walk(tree, node => node.tagName === 'link').map(attrs);
    assert.equal(links.filter(link => link.rel === 'canonical').length, 1);
    assert.equal(links.find(link => link.rel === 'canonical').href, origin + page.path);
    for (const locale of ['fr', 'en']) assert.equal(links.find(link => link.hreflang === locale + '-CA').href, origin + pageFor(page.id, locale).path);
    assert.equal(links.find(link => link.type === 'text/markdown').href, origin + markdownPath(page.path));
    for (const section of page.sections) {
      for (const paragraph of section.paragraphs || []) { assert(contentText(main).includes(paragraph)); assert(md.includes(paragraph)); }
      for (const row of section.table?.rows || []) for (const cell of row) { assert(contentText(main).includes(cell)); assert(md.includes(cell)); }
    }
    for (const faq of page.faqs) { assert(contentText(main).includes(faq.q)); assert(contentText(main).includes(faq.a)); assert(md.includes(faq.q)); assert(md.includes(faq.a)); }
    for (const anchor of walk(tree, node => node.tagName === 'a')) {
      const href = attrs(anchor).href;
      if (href.startsWith('#')) assert(walk(tree, node => attrs(node).id === href.slice(1)).length, page.path + href);
      else assert(listPages().some(target => target.path === href.split(/[?#]/)[0]) || page.references?.some(reference => reference.url === href), href);
    }
    const graph = schemaFor(page, origin)['@graph'];
    assert.equal(graph.find(node => node['@type'] === 'Organization').description, publisherBio(page.locale));
    const keys = value => value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]) : [];
    assert(!keys(graph).includes('aggregateRating')); assert(!keys(graph).includes('price'));
    if (page.type === 'service') assert.equal(graph.find(node => node['@type'] === 'Service').description, page.answer);
    if (page.type === 'faq') assert.equal(graph.find(node => node['@type'] === 'FAQPage').mainEntity.length, page.faqs.length);
  }
});

test('discovery files share the public allowlist, omit technical pages and keep markdown out of sitemap', () => {
  const llms = renderLlms(origin), full = renderLlmsFull(origin), sitemap = renderSitemap(origin), robots = renderRobots(origin), ai = renderAi(origin);
  for (const page of listPages()) { assert(llms.includes(origin + markdownPath(page.path))); assert(full.includes(renderMarkdown(page, origin))); assert(sitemap.includes('<loc>' + origin + page.path + '</loc>')); }
  assert(full.length < 500000); assert(!sitemap.includes('.md')); assert(!llms.includes('runtime/key.html'));
  for (const bot of site.searchCrawlers) assert(robots.includes('User-agent: ' + bot + '\nAllow: /'));
  assert(robots.includes('Allow: /api/md/')); assert(!robots.includes('Disallow: /runtime/')); assert(!robots.includes('Disallow: /bump/'));
  for (const name of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bytespider']) assert(!robots.includes('User-agent: ' + name));
  assert(ai.includes(site.description)); assert(ai.includes('not available') || ai.includes('available products'));
});

test('head enhancement is idempotent and never edits scripts or the retained body', () => {
  const original = '<!doctype html><html lang="fr"><head><title>Old</title><meta name="description" content="Old"><script>const sample="<title>not markup</title>";</script></head><body><div>Keep the scene</div></body></html>';
  const enhanced = enhanceHome(original, pageFor('home', 'fr'), origin);
  assert.equal(enhanceHome(enhanced, pageFor('home', 'fr'), origin), enhanced);
  assert(enhanced.includes('<script>const sample="<title>not markup</title>";</script>'));
  assert(enhanced.endsWith('<body><div>Keep the scene</div></body></html>'));
  assert.equal(walk(parse(enhanced), node => node.tagName === 'title').length, 1);
});

test('the landing retains an accessible text edition when scripting is disabled', () => {
  const original = '<!doctype html><html><head></head><body><script>const preserve="</not-a-tag>"</script></body></html>';
  const page = pageFor('home', 'fr'), output = homeFallback(original, page);
  assert.equal(homeFallback(output, page), output);
  const tree = parse(output, {scriptingEnabled: false});
  assert.equal(walk(tree, node => node.tagName === 'h1').length, 1);
  assert.equal(walk(tree, node => node.tagName === 'section').length, 6);
  const directory = walk(tree,node => node.tagName === 'nav')[0];
  assert.equal(walk(directory, node => node.tagName === 'a').length, page.related.length);
  assert.equal(walk(directory, node => node.tagName === 'li').length, page.related.length);
  assert(output.includes('<script>const preserve="</not-a-tag>"</script>'));
});

test('initial landing HTML exposes the same business content and links before JavaScript starts', () => {
  for (const locale of ['fr','en']) {
    const page = pageFor('home',locale);
    const source = '<!doctype html><html><head></head><body><script>const scene="unchanged";</script></body></html>';
    const output = homeFallback(source,page), tree = parse(output,{scriptingEnabled:true});
    const main = walk(tree,node => attrs(node).id === 'bump-initial-content')[0];
    assert(main); assert(contentText(main).includes(page.answer));
    for (const section of page.sections) for (const paragraph of section.paragraphs) assert(contentText(main).includes(paragraph));
    const markdown = renderMarkdown(page,origin);
    for (const section of page.sections) {
      for (const item of section.items || []) {assert(contentText(main).includes(item)); assert(markdown.includes(item));}
      for (const row of section.table?.rows || []) for (const cell of row) {assert(contentText(main).includes(cell)); assert(markdown.includes(cell));}
    }
    assert(walk(main,node=>node.tagName==='table').length);
    assert(walk(main,node=>node.tagName==='ol').length);
    assert(walk(main,node=>node.tagName==='a' && attrs(node).lang === (locale === 'fr' ? 'en' : 'fr')).length);
    for (const id of page.related) assert(walk(main,node => node.tagName === 'a' && attrs(node).href === pageFor(id,locale).path).length);
    assert(output.includes('<script>const scene="unchanged";</script>'));
    assert.equal(homeFallback(output,page),output);
    assert(walk(main,node => node.tagName === 'img' && !!attrs(node).alt).length);
  }
});

test('corporate authorship, actual update dates and service FAQ schema match visible content', () => {
  for (const page of listPages().filter(page => page.type !== 'home')) {
    const tree = parse(renderHtml(page,origin)), graph = schemaFor(page,origin)['@graph'];
    const web = graph.find(node => node['@id'] === origin + page.path + '#webpage');
    assert.equal(web.author['@id'],origin + '/#organization');
    assert.equal(walk(tree,node => node.tagName === 'time' && attrs(node).datetime === site.updated).length,1);
    assert.equal(walk(tree,node => node.tagName === 'time' && attrs(node).datetime === site.editorialPublished).length,1);
    assert.equal(web.datePublished,site.editorialPublished);
    const author = walk(tree,node=>node.tagName==='a' && attrs(node).rel==='author')[0];
    const profile = pageFor('about',page.locale);
    assert.equal(attrs(author).href, profile.path + (page.locale === 'fr' ? '#redaction' : '#editorial-policy'));
    assert(profile.sections.some(section=>section.id === attrs(author).href.split('#')[1]));
    for (const note of page.revisions) {assert(contentText(tree).includes(note)); assert(renderMarkdown(page,origin).includes(note));}
    assert(walk(tree,node => node.tagName === 'meta' && attrs(node).name === 'author' && attrs(node).content === 'Bump').length);
    if (page.type === 'service') assert.deepEqual(graph.find(node => node['@type'] === 'FAQPage').mainEntity.map(node => node.name),page.faqs.map(faq=>faq.q));
    assert.deepEqual(web.citation || [],(page.references || []).map(reference=>reference.url));
  }
  for (const locale of ['fr','en']) assert.equal(schemaFor(pageFor('home',locale),origin)['@graph'].find(node=>node['@type']==='WebPage').datePublished,undefined);
});

test('landing metadata survives hydration without duplicate tags or executable markup', async () => {
  const payload = JSON.parse(await readFile(new URL('../dist/client/bump/seo/landing-meta.json', import.meta.url), 'utf8'));
  for (const locale of ['fr', 'en']) {
    const nodes = [], document = {title: 'Legacy title', head: {querySelectorAll: tag => nodes.filter(node => node.tag === tag), appendChild: node => nodes.push(node)}, createElement: tag => ({tag, attributes: {}, textContent: '', getAttribute(key) {return this.attributes[key] ?? null;}, setAttribute(key, value) {this.attributes[key] = value;}})};
    const records = JSON.parse(JSON.stringify(payload[locale]).replaceAll('__BUMP_ORIGIN__', origin));
    applyLandingMetadata(records, document);
    const count = nodes.length;
    assert.equal(document.title, pageFor('home', locale).metaTitle);
    assert.equal(nodes.find(node => node.attributes.rel === 'canonical').attributes.href, origin + pageFor('home', locale).path);
    assert.equal(nodes.filter(node => node.attributes.hreflang).length, 5);
    assert.equal(nodes.filter(node => node.tag === 'script' && node.attributes.type === 'application/ld+json').length, 1);
    applyLandingMetadata(records, document); assert.equal(nodes.length, count);
    document.title = 'Runtime reset'; nodes.splice(nodes.findIndex(node => node.attributes.rel === 'canonical'), 1);
    applyLandingMetadata(records, document); assert.equal(document.title, pageFor('home', locale).metaTitle); assert.equal(nodes.length, count);
    applyLandingMetadata([{tag: 'script', attrs: {src: 'https://invalid.example/execute.js', type: 'text/javascript'}, text: 'alert(1)'}, {tag: 'link', attrs: {rel: 'stylesheet', href: 'https://invalid.example/style.css'}}], document);
    assert.equal(nodes.length, count);
  }
});

test('built public pages have complete generated coverage and no unregistered marketing HTML', async () => {
  for (const page of listPages()) { await readFile(new URL('../dist/client' + htmlAsset(page), import.meta.url)); await readFile(new URL('../dist/client' + markdownPath(page.path), import.meta.url)); }
  const covered = new Set([...listPages().map(htmlAsset), '/404.html', '/runtime/key.html']);
  async function verify(directory, prefix = '') {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const path = prefix + '/' + entry.name;
      if (entry.isDirectory()) await verify(new URL(entry.name + '/', directory), path);
      else if (entry.name.endsWith('.html')) assert(covered.has(path), 'Missing renderer or explicit skip reason: ' + path);
    }
  }
  await verify(new URL('../dist/client/', import.meta.url));
});

test('edge routing serves all three markdown paths, canonical headers and a real markdown 404', async () => {
  for (const page of listPages()) {
    for (const [path, accept] of [[markdownPath(page.path), '*/*'], ['/api/md/' + (page.path === '/' ? 'index' : page.path.slice(1)), '*/*'], [page.path, 'text/markdown;q=1,text/html;q=0.5']]) {
      const response = await handleContentRequest(request(path, {headers: {Accept: accept}}), assets);
      assert.equal(response.status, 200, path); assert.match(response.headers.get('Content-Type'), /^text\/markdown/);
      assert.equal(response.headers.get('Content-Location'), origin + page.path);
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow'); assert(response.headers.get('Link').includes('rel="canonical"'));
      const body = await response.text(); assert.equal(response.headers.get('X-Markdown-Tokens'), String(Math.ceil(body.length / 4))); assert(!body.includes('__BUMP_ORIGIN__'));
    }
    for (const accept of [undefined, '*/*', 'text/html', 'text/markdown;q=0.3,text/html;q=0.8']) {
      const response = await handleContentRequest(request(page.path, {headers: accept ? {Accept: accept} : {}}), assets);
      assert.equal(response.status, 200); assert.match(response.headers.get('Content-Type'), /^text\/html/); assert(response.headers.get('Vary').includes('Accept'));
      assert(!(await response.text()).includes('__BUMP_ORIGIN__'));
    }
  }
  for (const path of ['/does-not-exist.md', '/api/md/admin', '/dashboard/report.md', '/api/md/does-not-exist']) {
    const response = await handleContentRequest(request(path), assets);
    assert.equal(response.status, 404); assert.match(response.headers.get('Content-Type'), /^text\/markdown/); assert.match(await response.text(), /^# Page not found/); assert.equal(response.headers.get('Content-Location'), null);
  }
});

test('HEAD, OPTIONS, aliases, catalog, discovery, and unsupported verbs have coherent edge behavior', async () => {
  for (const path of ['/services/integration-ia.md', '/api/md/services/integration-ia', '/services/integration-ia']) {
    const headers = path.endsWith('.md') || path.startsWith('/api') ? {} : {Accept: 'text/markdown'};
    const get = await handleContentRequest(request(path, {headers}), assets), head = await handleContentRequest(request(path, {method: 'HEAD', headers}), assets);
    assert.equal(await head.text(), ''); assert.deepEqual([...head.headers], [...get.headers]);
    const options = await handleContentRequest(request(path, {method: 'OPTIONS', headers}), assets);
    assert.equal(options.status, 204); assert.equal(options.headers.get('Access-Control-Allow-Origin'), '*');
    assert.equal((await handleContentRequest(request(path, {method: 'POST'}), assets)).status, 405);
  }
  for (const path of ['/en/', '/en.html', '/expertises/']) assert.equal((await handleContentRequest(request(path), assets)).status, 308);
  const catalog = await (await handleContentRequest(request('/api/md/_catalog'), assets)).json(); assert.equal(catalog.routes.length, 18);
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/ai.txt']) {
    const response = await handleContentRequest(request(path), assets); assert.equal(response.status, 200); const body = await response.text(); assert(!body.includes('__BUMP_ORIGIN__')); assert(body.includes(origin));
  }
  assert.equal(await handleContentRequest(request('/runtime/assets/app.js', {headers: {Accept: 'text/markdown'}}), assets), null);
  assert.equal((await handleContentRequest(request('/not-a-public-route'), assets)).status, 404);
});

test('real Node server and bundled Worker share the markdown contract without affecting assets', async t => {
  const server = createSiteServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const local = 'http://127.0.0.1:' + server.address().port;
  const response = await fetch(local + '/en/services/ai-integration', {headers: {Accept: 'text/markdown'}});
  assert.equal(response.status, 200); assert.match(await response.text(), /# AI integration/);
  const options = await fetch(local + '/index.md', {method: 'OPTIONS'}); assert.equal(options.status, 204);
  const webpage = await fetch(local + '/services/developpement-logiciel'); assert.match(await webpage.text(), new RegExp(local.replaceAll('.', '\\.')));
  assert.equal((await fetch(local + '/something-missing')).status, 404);
  assert.equal((await fetch(local + '/__seo-review')).status, 404);
  const compiled = (await import('../dist/server/index.js')).default;
  for (const handler of [worker, compiled]) {
    const response = await handler.fetch(request('/en/services/cybersecurity.md'), {ASSETS: {fetch: request => assets(new URL(request.url).pathname)}});
    assert.equal(response.status, 200); assert.match(await response.text(), /Cybersecurity/);
  }
});

test('the published Worker serves every content route without an ASSETS binding', async () => {
  const compiled = (await import('../dist/server/index.js')).default;
  for (const page of listPages()) {
    for (const [path, accept] of [[page.path, 'text/html'], [page.path, 'text/markdown'], [markdownPath(page.path), '*/*']]) {
      const response = await compiled.fetch(request(path, {headers: {Accept: accept}}), {});
      assert.equal(response.status, 200, path);
      const body = await response.text(); assert(!body.includes('__BUMP_ORIGIN__')); assert(body.includes(origin));
      assert.match(response.headers.get('Content-Type'), accept === 'text/html' ? /^text\/html/ : /^text\/markdown/);
    }
  }
  for (const file of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/ai.txt']) assert.equal((await compiled.fetch(request(file), {})).status, 200);
  assert.equal((await compiled.fetch(request('/missing.js'), {})).status, 404);
  assert.equal((await compiled.fetch(request('/something-missing'), {})).status, 404);
});

test('GPT packaging removes only generated content paths and keeps the media and Worker intact', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'bump-gpt-routing-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const client = path.join(root, 'client'), worker = path.join(root, 'worker.js');
  await mkdir(path.join(client, 'expertises'), {recursive: true}); await mkdir(path.join(client, 'bump'), {recursive: true});
  for (const file of ['index.html', 'index.md', 'expertises/index.html', 'robots.txt', 'bump/model.glb']) await writeFile(path.join(client, file), 'fixture');
  await writeFile(worker, 'verified worker');
  prepareGptRouting(client, worker);
  for (const file of ['index.html', 'index.md', 'expertises/index.html', 'robots.txt']) await assert.rejects(access(path.join(client, file)));
  await access(path.join(client, 'bump/model.glb')); await access(worker);
});
