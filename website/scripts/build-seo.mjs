import {mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'parse5';
import {site, originMarker} from '../src/bump/seo/site.js';
import {listPages, pageFor} from '../src/bump/seo/pages.js';
import {html, headMarkup, htmlAsset, markdownPath, renderHtml, renderMarkdown, renderLlms, renderLlmsFull, renderRobots, renderAi, renderSitemap} from '../src/bump/seo/render.js';
import {publicOrigin} from './hosting-config.mjs';

// Edit only source-located head tags; never run markup replacement over scripts.
export function enhanceHome(source, page, origin) {
  const start = source.indexOf('<!-- bump:seo:start -->'), end = source.indexOf('<!-- bump:seo:end -->');
  if (start !== -1 && end !== -1) source = source.slice(0, start) + source.slice(end + '<!-- bump:seo:end -->'.length);
  const tree = parse(source, {sourceCodeLocationInfo: true});
  const head = tree.childNodes.find(node => node.tagName === 'html')?.childNodes.find(node => node.tagName === 'head');
  if (!head?.sourceCodeLocation?.endTag) throw new Error('The retained shell has no source-located head.');
  const edits = [];
  for (const node of head.childNodes) {
    const attrs = Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    if (node.tagName === 'title' || node.tagName === 'meta' && (['description', 'robots', 'ai-summary'].includes(attrs.name) || attrs.property?.startsWith('og:') || attrs.name?.startsWith('twitter:')) || node.tagName === 'link' && (attrs.rel === 'canonical' || attrs.hreflang || attrs.type === 'text/markdown')) {
      const location = node.sourceCodeLocation;
      if (location) edits.push({start: location.startOffset, end: location.endOffset, value: ''});
    }
  }
  const offset = head.sourceCodeLocation.endTag.startOffset;
  edits.push({start: offset, end: offset, value: headMarkup(page, origin)});
  for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.value + source.slice(edit.end);
  return source;
}

export function homeFallback(source, page) {
  const start = source.indexOf('<!-- bump:fallback:start -->'), end = source.indexOf('<!-- bump:fallback:end -->');
  if (start !== -1 && end !== -1) source = source.slice(0, start) + source.slice(end + '<!-- bump:fallback:end -->'.length);
  const tree = parse(source, {sourceCodeLocationInfo: true});
  const body = tree.childNodes.find(node => node.tagName === 'html')?.childNodes.find(node => node.tagName === 'body');
  if (!body?.sourceCodeLocation?.endTag) throw new Error('The retained shell has no source-located body.');
  const fallback = '<!-- bump:fallback:start --><noscript><link rel="stylesheet" href="/bump/seo/pages.css"><style>html,body{overflow:auto!important;height:auto!important;background:#f4f1e8!important}html[data-bump-opening] body{background:#f4f1e8!important}html[data-bump-opening] body::before{display:none!important;content:none!important}.bump-loading{display:none!important}.seo-home-fallback{position:relative;z-index:2;background:#f4f1e8;padding:50px 0}.seo-home-fallback h1{margin-bottom:24px}.seo-home-fallback h2{font-size:36px;margin:38px 0 18px}.seo-home-fallback ul{padding-left:22px}.seo-home-fallback a{text-decoration:underline}</style><main class="seo-home-fallback"><p class="seo-eyebrow">Bump · Montréal, Québec</p><h1>' + html(page.title) + '</h1><p>' + html(page.lead) + '</p>' + page.sections.map(section => '<section><h2>' + html(section.title) + '</h2>' + section.paragraphs.map(paragraph => '<p>' + html(paragraph) + '</p>').join('') + '</section>').join('') + '<h2>' + (page.locale === 'fr' ? 'Découvrir nos expertises' : 'Explore our expertise') + '</h2><ul>' + page.related.map(id => {const target = pageFor(id, page.locale); return '<li><a href="' + target.path + '">' + html(target.title.replace(/\s+/g, ' ')) + '</a></li>';}).join('') + '</ul></main></noscript><!-- bump:fallback:end -->';
  const offset = body.sourceCodeLocation.endTag.startOffset;
  return source.slice(0, offset) + fallback + source.slice(offset);
}

export function buildSeo({directory = 'public', homeFile = 'src/reference-shell.html', origin = publicOrigin() || originMarker} = {}) {
  const write = (file, value) => { const target = resolve(directory, '.' + file); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, value); };
  writeFileSync(homeFile, homeFallback(enhanceHome(readFileSync(homeFile, 'utf8'), pageFor('home', 'fr'), origin), pageFor('home', 'fr')));
  write('/en.html', homeFallback(enhanceHome(readFileSync(resolve(directory, 'en.html'), 'utf8'), pageFor('home', 'en'), origin), pageFor('home', 'en')));
  for (const page of listPages()) {
    if (page.type !== 'home') write(htmlAsset(page), renderHtml(page, origin));
    write(markdownPath(page.path), renderMarkdown(page, origin));
  }
  write('/llms.txt', renderLlms(origin)); write('/llms-full.txt', renderLlmsFull(origin));
  write('/robots.txt', renderRobots(origin)); write('/ai.txt', renderAi(origin)); write('/sitemap.xml', renderSitemap(origin));
  write('/bump/seo/deployment.json', JSON.stringify({origin: origin === originMarker ? '' : origin}) + '\n');
  const landingRecords = {};
  for (const locale of ['fr', 'en']) {
    const fragment = parse('<!doctype html><html><head>' + headMarkup(pageFor('home', locale), origin) + '</head><body></body></html>');
    const head = fragment.childNodes.find(node => node.tagName === 'html').childNodes.find(node => node.tagName === 'head');
    landingRecords[locale] = head.childNodes.filter(node => ['title', 'meta', 'link', 'script'].includes(node.tagName)).map(node => ({tag: node.tagName, attrs: Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value])), text: (node.childNodes || []).map(child => child.value || '').join('')}));
  }
  write('/bump/seo/landing-meta.json', JSON.stringify(landingRecords) + '\n');
  write('/bump/seo/routes.json', JSON.stringify(listPages().map(page => ({id: page.id, path: page.path, locale: page.locale, html: htmlAsset(page), markdown: markdownPath(page.path)})), null, 2) + '\n');
  write('/404.html', '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page introuvable | Bump</title><link rel="stylesheet" href="/bump/seo/pages.css"></head><body class="seo-not-found"><main><p class="seo-eyebrow">Bump · 404</p><h1>Cette page reste<br>à inventer.</h1><p>La page demandée est introuvable.<br>The requested page could not be found.</p><a class="seo-primary" href="/expertises">Découvrir nos expertises <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a><p><a href="/en/expertise">Explore our expertise <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a></p></main></body></html>');
  writeFileSync(resolve(directory, 'bump/seo/pages.css'), readFileSync('src/bump/seo/pages.css', 'utf8') + '\n' + readFileSync('src/bump/seo/stories.css', 'utf8') + '\n' + readFileSync('src/bump/ui/glass.css', 'utf8'));
  copyFileSync('src/bump/seo/client.js', resolve(directory, 'bump/seo/pages.js'));
  copyFileSync('src/bump/seo/diagram-motion.js', resolve(directory, 'bump/seo/diagram-motion.js'));
  copyFileSync('src/bump/ui/musicController.js', resolve(directory, 'bump/background-music.js'));
  copyFileSync('src/bump/ui/music.css', resolve(directory, 'bump/music.css'));
  console.log('Built ' + listPages().length + ' bilingual content routes and their markdown/discovery files.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) buildSeo();
