import {mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'parse5';
import {site, originMarker} from '../src/bump/seo/site.js';
import {listPages, pageFor} from '../src/bump/seo/pages.js';
import {html, headMarkup, htmlAsset, markdownPath, renderHtml, renderMarkdown, renderLlms, renderLlmsFull, renderRobots, renderAi, renderSitemap, publisherCredit} from '../src/bump/seo/render.js';
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
  // Keep critical geometry in the head, including across repeated builds.
  // Body-inserted styles arrived too late to prevent the first unstyled frame.
  const previous=parse(source,{sourceCodeLocationInfo:true});
  const previousHead=previous.childNodes.find(node=>node.tagName==='html')?.childNodes.find(node=>node.tagName==='head');
  const removals=(previousHead?.childNodes||[]).filter(node=>(node.attrs||[]).some(attr=>['data-bump-startup','data-bump-initial-style','data-bump-startup-font'].includes(attr.name))).map(node=>node.sourceCodeLocation).filter(Boolean).sort((a,b)=>b.startOffset-a.startOffset);
  for(const location of removals)source=source.slice(0,location.startOffset)+source.slice(location.endOffset);
  const tree = parse(source, {sourceCodeLocationInfo: true});
  const head=tree.childNodes.find(node=>node.tagName==='html')?.childNodes.find(node=>node.tagName==='head');
  const body = tree.childNodes.find(node => node.tagName === 'html')?.childNodes.find(node => node.tagName === 'body');
  if (!body?.sourceCodeLocation?.endTag) throw new Error('The retained shell has no source-located body.');
  const en = page.locale === 'en';
  // The same useful initial HTML goes to every visitor. The retained React
  // document replaces it when it mounts; there is no bot sniffing or duplicate
  // hidden content. Without scripting it remains a readable, linked edition.
  const styles = `<style data-bump-initial-style>
.bump-loading{z-index:2147482000}
.seo-home-fallback{box-sizing:border-box;position:fixed;inset:0;overflow:auto;background:#f4f1e8;color:#302e28;font:20px/1.5 Georgia,serif;padding:50px max(24px,calc((100% - 1100px)/2));min-height:100vh}
.seo-home-fallback h1{font:400 clamp(38px,6vw,72px)/1.08 Georgia,serif;margin:0 0 24px}
.seo-home-fallback h2{font:400 32px/1.2 Georgia,serif;margin:34px 0 14px}
.seo-home-fallback p{max-width:800px;margin:0 0 16px}.seo-home-fallback a{color:#315e49;text-decoration:underline}
.seo-home-language{display:inline-block;margin-bottom:22px;font-size:16px}
.seo-home-fallback nav{border-block:1px solid #b4b6a6;padding:24px 0;margin:30px 0}
.seo-home-fallback nav ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;list-style:none;margin:0;padding:0}
.seo-home-fallback nav p{font-size:16px;margin:5px 0 0}.seo-home-fallback section>ol{padding-left:25px;max-width:800px}.seo-home-fallback section>ol li{margin-bottom:10px}
.seo-home-table{max-width:100%;overflow:auto;margin-block:24px}.seo-home-table table{width:100%;border-collapse:collapse;text-align:left;font-size:17px;line-height:1.4}.seo-home-table caption{text-align:left;font-size:15px;padding-bottom:12px}.seo-home-table :is(th,td){padding:12px;border:1px solid #b4b6a6;vertical-align:top}.seo-home-table thead{background:#e4e9dd}
.seo-home-fallback img{display:block;width:100%;height:auto;border-radius:6px;margin:36px 0}
.seo-home-faq details{max-width:850px;border-top:1px solid #b4b6a6}.seo-home-faq summary{cursor:pointer;padding:17px 0}.seo-home-faq h3{display:inline;font-size:23px;line-height:1.3;font-weight:400}.seo-home-faq details>p{padding-bottom:18px}
.seo-home-fallback .seo-editorial-credit{width:auto;margin:0;padding-top:24px;border-top:1px solid #b4b6a6;font-size:16px}.seo-home-fallback .seo-editorial-credit h2{font-size:25px;margin-top:0}.seo-home-fallback .seo-revision{margin-top:24px}.seo-home-fallback .seo-revision summary{cursor:pointer}
</style>`;
  const noScript = '<noscript><style>html,body{overflow:auto!important;height:auto!important;background:#f4f1e8!important}html[data-bump-opening] body::before{display:none!important;content:none!important}.bump-loading{display:none!important}</style></noscript>';
  const directory = '<ul>' + page.related.map(id => {
    const target = pageFor(id,page.locale);
    return '<li><a href="' + target.path + '">' + html(target.title.replace(/\s+/g,' ')) + '</a><p>' + html(target.lead) + '</p></li>';
  }).join('') + '</ul>';
  const chapters = page.sections.map(section => {
    const listTag = section.ordered ? 'ol' : 'ul';
    const items = section.items ? '<' + listTag + '>' + section.items.map(item=>'<li>'+html(item)+'</li>').join('') + '</'+listTag+'>' : '';
    const table = section.table ? '<div class="seo-home-table" role="region" aria-label="' + html(section.title) + '" tabindex="0"><table>' + (section.table.caption ? '<caption>' + html(section.table.caption) + '</caption>' : '') + '<thead><tr>' + section.table.headers.map(cell=>'<th scope="col">'+html(cell)+'</th>').join('') + '</tr></thead><tbody>' + section.table.rows.map(row=>'<tr>'+row.map((cell,index)=>'<'+(index?'td':'th scope="row"')+'>'+html(cell)+'</'+(index?'td':'th')+'>').join('')+'</tr>').join('') + '</tbody></table></div>' : '';
    return '<section id="' + section.id + '"><h2>' + html(section.title) + '</h2>' + section.paragraphs.map(paragraph=>'<p>'+html(paragraph)+'</p>').join('') + items + table + '</section>';
  }).join('');
  const language = '<a class="seo-home-language" href="' + (en ? '/' : '/en') + '" lang="' + (en ? 'fr' : 'en') + '" hreflang="' + (en ? 'fr-CA' : 'en-CA') + '">' + (en ? 'Lire en français' : 'Read in English') + '</a>';
  const faq='<section id="bump-home-questions" class="seo-home-faq"><p>'+(en?'Frequently asked questions':'Questions fréquentes')+'</p><h2>'+(en?'How can we move forward together?':'Comment avancer ensemble ?')+'</h2>'+page.faqs.map(item=>'<details><summary><h3>'+html(item.q)+'</h3></summary><p>'+html(item.a)+'</p></details>').join('')+'</section>';
  const content = '<main class="seo-home-fallback" id="bump-initial-content"><header><p>Bump · Montréal, Québec</p>' + language + '<h1>' + html(page.title) + '</h1><p class="seo-home-summary summary">' + html(page.answer) + '</p><p>' + html(page.lead) + '</p></header><nav aria-label="' + (en ? 'Explore Bump expertise' : 'Découvrir les expertises Bump') + '">' + directory + '</nav>' + chapters +faq+ '<img src="/bump/art/hero-fallback-v2.webp" alt="' + (en ? 'Two Bump consultants in a Renaissance-inspired scene' : 'Deux consultants Bump dans une scène inspirée de la Renaissance') + '" width="1900" height="900" loading="lazy" decoding="async"><footer>' + '<p><a href="mailto:' + site.email + '">' + site.email + '</a></p>' + publisherCredit(page) + '</footer></main>';
  const fallback = '<!-- bump:fallback:start -->' + content + noScript + '<!-- bump:fallback:end -->';
  const offset = body.sourceCodeLocation.endTag.startOffset;
  source=source.slice(0, offset) + fallback + source.slice(offset);
  const charset=head?.childNodes.find(node=>node.tagName==='meta'&&(node.attrs||[]).some(attr=>attr.name==='charset'));
  const headOffset=charset?.sourceCodeLocation?.endOffset??head?.sourceCodeLocation?.startTag?.endOffset;
  if(!headOffset)throw new Error('The retained shell has no source-located head.');
  const critical='<style data-bump-startup>'+readFileSync('src/bump/ui/startup.css','utf8')+'</style><link data-bump-startup-font rel="preload" href="/bump/fonts/eb-garamond-latin-variable.woff2" as="font" type="font/woff2" crossorigin><link data-bump-startup-font rel="preload" href="/bump/fonts/im-fell-english-regular.ttf" as="font" type="font/ttf" crossorigin>';
  return source.slice(0,headOffset)+critical+styles+source.slice(headOffset);
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
  writeFileSync(resolve(directory, 'bump/seo/pages.css'), readFileSync('src/bump/seo/pages.css', 'utf8') + '\n' + readFileSync('src/bump/seo/stories.css', 'utf8') + '\n' + readFileSync('src/bump/ui/glass.css', 'utf8') + '\n' + readFileSync('src/bump/seo/figures.css','utf8'));
  copyFileSync('src/bump/seo/figure-loading.js', resolve(directory, 'bump/seo/figure-loading.js'));
  copyFileSync('src/bump/seo/client.js', resolve(directory, 'bump/seo/pages.js'));
  copyFileSync('src/bump/seo/diagram-motion.js', resolve(directory, 'bump/seo/diagram-motion.js'));
  copyFileSync('src/bump/seo/workload.js', resolve(directory, 'bump/seo/workload.js'));
  copyFileSync('src/bump/ui/musicController.js', resolve(directory, 'bump/background-music.js'));
  copyFileSync('src/bump/ui/music.css', resolve(directory, 'bump/music.css'));
  console.log('Built ' + listPages().length + ' bilingual content routes and their markdown/discovery files.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) buildSeo();
