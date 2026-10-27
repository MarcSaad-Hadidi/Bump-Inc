import {site, languageTag, text, homePath} from './site.js';
import {catalog, pageFor, listPages} from './pages.js';
import {expertiseLinks} from './navigation.js';
import {renderStoryFigure,storyAction} from './stories.js';
import {musicLabels,MUSIC_WAVES} from '../ui/musicController.js';

export const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
export const absolute = (path, origin) => origin + path;
const cleanTitle = value => value.replace(/\s+/g, ' ').trim();
const mdText = value => String(value).replace(/([\\`*_\[\]<>])/g, '\\$1');
const mdCell = value => mdText(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const jsonScript = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const arrow = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const wordmark = '<span class="seo-mark" aria-hidden="true"></span><span>Bump</span>';
const link = (id, locale, label, className = '') => {
  const page = pageFor(id, locale);
  return '<a class="' + className + '" href="' + page.path + '">' + html(label || cleanTitle(page.title)) + '</a>';
};

export function schemaFor(page, origin) {
  const url = absolute(page.path, origin), organizationId = origin + '/#organization', websiteId = origin + '/#website';
  const organization = {'@type': 'Organization', '@id': organizationId, name: site.name, url: origin + '/', description: site.description, logo: { '@type': 'ImageObject', url: origin + site.logo }, foundingLocation: {'@type': 'City', name: 'Montréal', containedInPlace: {'@type': 'AdministrativeArea', name: 'Québec'}}, areaServed: {'@type': 'AdministrativeArea', name: 'Québec'}};
  const website = {'@type': 'WebSite', '@id': websiteId, name: site.name, url: origin + '/', inLanguage: site.languages, publisher: {'@id': organizationId}};
  const webpage = {'@type': page.type === 'about' ? 'AboutPage' : page.type === 'faq' ? 'FAQPage' : page.type === 'hub' ? 'CollectionPage' : 'WebPage', '@id': url + '#webpage', url, name: cleanTitle(page.title), description: page.description, inLanguage: languageTag(page.locale), isPartOf: {'@id': websiteId}, publisher: {'@id': organizationId}, author: {'@id': organizationId}, dateModified: site.updated};
  const nodes = [organization, website, webpage];
  if (page.type === 'service') {
    webpage.mainEntity = {'@id': url + '#service'};
    nodes.push({'@type': 'Service', '@id': url + '#service', name: cleanTitle(page.title), serviceType: cleanTitle(page.title), description: page.answer, provider: {'@id': organizationId}, areaServed: {'@type': 'AdministrativeArea', name: 'Québec'}, url});
    if (page.faqs.length) {
      webpage.hasPart = {'@id':url + '#questions'};
      nodes.push({'@type':'FAQPage','@id':url + '#questions',inLanguage:languageTag(page.locale),isPartOf:{'@id':url + '#webpage'},mainEntity:page.faqs.map(faq => ({'@type':'Question',name:faq.q,acceptedAnswer:{'@type':'Answer',text:faq.a}}))});
    }
  }
  if (page.references?.length) webpage.citation = page.references.map(reference => reference.url);
  if (page.type === 'faq') webpage.mainEntity = page.faqs.map(faq => ({'@type': 'Question', name: faq.q, acceptedAnswer: {'@type': 'Answer', text: faq.a}}));
  if (page.type !== 'home') {
    const crumbs = [{name: text(page.locale, 'Accueil', 'Home'), item: absolute(homePath(page.locale), origin)}];
    if (page.type === 'service') crumbs.push({name: text(page.locale, 'Expertises', 'Expertise'), item: absolute(pageFor('expertise', page.locale).path, origin)});
    crumbs.push({name: cleanTitle(page.title), item: url});
    nodes.push({'@type': 'BreadcrumbList', '@id': url + '#breadcrumbs', itemListElement: crumbs.map((crumb, index) => ({'@type': 'ListItem', position: index + 1, ...crumb}))});
  }
  return {'@context': 'https://schema.org', '@graph': nodes};
}

export function headMarkup(page, origin) {
  const url = absolute(page.path, origin), pair = catalog.find(entry => entry.id === page.id);
  return '<!-- bump:seo:start -->\n<title>' + html(page.metaTitle) + '</title>\n' +
    '<meta name="author" content="Bump">\n<meta name="description" content="' + html(page.description) + '">\n' +
    '<meta name="ai-summary" content="' + html(page.answer || page.description) + '">\n' +
    '<meta name="robots" content="index,follow,max-image-preview:large">\n' +
    '<link rel="canonical" href="' + html(url) + '">\n' +
    ['fr', 'en'].map(locale => '<link rel="alternate" hreflang="' + languageTag(locale) + '" href="' + html(absolute(pair[locale].path, origin)) + '">').join('\n') + '\n' +
    ['fr', 'en'].map(locale => '<link rel="alternate" hreflang="' + locale + '" href="' + html(absolute(pair[locale].path, origin)) + '">').join('\n') + '\n' +
    '<link rel="alternate" hreflang="x-default" href="' + html(absolute(pair.fr.path, origin)) + '">\n' +
    '<link rel="alternate" type="text/markdown" href="' + html(absolute(markdownPath(page.path), origin)) + '">\n' +
    '<meta property="og:site_name" content="Bump"><meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + html(page.metaTitle) + '"><meta property="og:description" content="' + html(page.description) + '">\n' +
    '<meta property="og:url" content="' + html(url) + '"><meta property="og:locale" content="' + languageTag(page.locale).replace('-', '_') + '">\n' +
    '<meta property="og:locale:alternate" content="' + (page.locale === 'fr' ? 'en_CA' : 'fr_CA') + '">\n' +
    '<meta property="og:image" content="' + html(absolute(site.image, origin)) + '"><meta property="og:image:alt" content="' + html(text(page.locale, 'Bump — les deux consultants de la scène Renaissance', 'Bump — the two consultants in the Renaissance scene')) + '">\n' +
    '<meta property="og:image:secure_url" content="' + html(absolute(site.image, origin)) + '"><meta property="og:image:type" content="image/webp"><meta property="og:image:width" content="1900"><meta property="og:image:height" content="900">\n' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + html(page.metaTitle) + '"><meta name="twitter:description" content="' + html(page.description) + '"><meta name="twitter:image" content="' + html(absolute(site.image, origin)) + '">\n' +
    '<script type="application/ld+json">' + jsonScript(schemaFor(page, origin)) + '</script>\n<!-- bump:seo:end -->';
}

export function markdownPath(path) { return path === '/' ? '/index.md' : path + '.md'; }
export function htmlAsset(page) { return page.type === 'home' ? page.locale === 'fr' ? '/index.html' : '/en.html' : page.path + '/index.html'; }
export function contentAssetPaths() {
  return [...listPages().flatMap(page => [htmlAsset(page), markdownPath(page.path)]), '/llms.txt', '/llms-full.txt', '/ai.txt', '/robots.txt', '/sitemap.xml', '/404.html'];
}

export function renderMarkdown(page, origin) {
  const lines = ['# ' + mdText(cleanTitle(page.title)), '', '> ' + mdText(page.description), '', 'Canonical: ' + absolute(page.path, origin), 'Last updated: ' + site.updated, '', mdText(page.lead), ''];
  if (page.answer) lines.push('## ' + text(page.locale, 'En clair', 'At a glance'), '', mdText(page.answer), '');
  for (const section of page.sections) {
    lines.push('## ' + mdText(section.title), '');
    if (section.example) lines.push('> ' + text(page.locale, 'Scénario illustratif — données fictives, aucun résultat client revendiqué.', 'Illustrative scenario — fictional data, no client result claimed.'), '');
    for (const paragraph of section.paragraphs || []) lines.push(mdText(paragraph), '');
    if (section.items) lines.push(...section.items.map(item => '- ' + mdText(item)), '');
    if (section.table) lines.push('| ' + section.table.headers.map(mdCell).join(' | ') + ' |', '| ' + section.table.headers.map(() => '---').join(' | ') + ' |', ...section.table.rows.map(row => '| ' + row.map(mdCell).join(' | ') + ' |'), '');
  }
  if (page.faqs.length) {
    lines.push('## ' + text(page.locale, 'Questions fréquentes', 'Frequently asked questions'), '');
    for (const faq of page.faqs) lines.push('### ' + mdText(faq.q), '', mdText(faq.a), '');
  }
  if (page.references?.length) {
    lines.push('## ' + text(page.locale,'Pour approfondir','Further reading'),'');
    for (const reference of page.references) lines.push('- [' + mdText(reference.title) + '](' + reference.url + ') — ' + mdText(reference.description));
    lines.push('');
  }
  lines.push(text(page.locale,'Publié par Bump · Consultation technologique à Montréal.','Published by Bump · Technology consulting in Montréal.'),'');
  lines.push('## Related', '');
  for (const id of page.related) { const related = pageFor(id, page.locale); lines.push('- [' + mdText(cleanTitle(related.title)) + '](' + absolute(related.path, origin) + ') — ' + mdText(related.description)); }
  return lines.join('\n') + '\n';
}


function sectionMarkup(section, index, locale) {
  return '<section id="' + section.id + '" class="seo-section' + (section.example ? ' seo-example' : '') + '"><div class="seo-section-index" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</div><div class="seo-section-main">' + (section.example ? '<p class="seo-eyebrow">' + text(locale, 'Scénario illustratif', 'Illustrative scenario') + '</p>' : '') + '<h2>' + html(section.title) + '</h2>' + (section.paragraphs || []).map(paragraph => '<p>' + html(paragraph) + '</p>').join('') + (section.items ? '<ul class="seo-list">' + section.items.map(item => '<li>' + html(item) + '</li>').join('') + '</ul>' : '') + (section.table ? '<div class="seo-table-wrap" role="region" aria-label="' + html(section.title) + '" tabindex="0"><table><thead><tr>' + section.table.headers.map(header => '<th scope="col">' + html(header) + '</th>').join('') + '</tr></thead><tbody>' + section.table.rows.map(row => '<tr>' + row.map((cell, i) => '<' + (i ? 'td' : 'th scope="row"') + '>' + html(cell) + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table></div>' : '') + '</div></section>';
}

function readingMarkup(page, toc, faq) {
  const sections = page.sections.map((section, index) => sectionMarkup(section, index, page.locale)).join('');
  const open = '<article class="seo-article" aria-label="' + html(cleanTitle(page.title)) + '">';
  const className = 'seo-reading seo-reading--' + page.id;
  if (page.id === 'faq') return '<div class="' + className + '">' + faq + open + sections + '</article></div>';
  if (['expertise','software','approach','about'].includes(page.id)) return '<div class="' + className + '">' + open + sections + '</article>' + faq + '</div>';
  return '<div class="' + className + '">' + toc + open + sections + faq + '</article></div>';
}

function referencesMarkup(page) {
  if (!page.references?.length) return '';
  return '<aside class="seo-sources"><h2>' + text(page.locale,'Pour approfondir','Further reading') + '</h2>' + page.references.map(reference => '<p><a href="' + html(reference.url) + '">' + html(reference.title) + '</a><span>' + html(reference.description) + '</span></p>').join('') + '</aside>';
}

export function renderHtml(page, origin) {
  const locale = page.locale, en = locale === 'en', other = pageFor(page.id, en ? 'fr' : 'en');
  const brief = homePath(locale) + '?projet=1', action = storyAction(page);
  const sound = musicLabels(locale);
  const music = '<audio src="/audio/timeless-resonance-background.mp3" loop preload="none" playsinline hidden aria-hidden="true" data-bump-background-audio></audio><button type="button" class="bump-background-music" hidden aria-label="' + html(sound.mute) + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path data-music-waves d="' + MUSIC_WAVES + '"/></svg><span class="bump-music-status" data-music-status role="status"></span></button>';
  const expertiseMenu = '<details class="seo-expertise-menu"><summary class="' + (page.id === 'expertise' || page.type === 'service' ? 'is-current' : '') + '">' + text(locale, 'Expertises', 'Expertise') + '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m3 6 5 5 5-5"/></svg></summary><div class="seo-expertise-panel"><p>' + text(locale, 'Nos expertises', 'Our expertise') + '</p>' + expertiseLinks(locale).map((item, index) => '<a href="' + item.path + '"' + (page.id === item.id ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</span><span>' + html(item.label) + '</span>' + arrow + '</a>').join('') + link('expertise', locale, text(locale, 'Toutes les expertises', 'All expertise'), 'seo-expertise-all') + '</div></details>';
  const nav = '<a class="seo-brand" href="' + homePath(locale) + '" aria-label="Bump — ' + (en ? 'home' : 'accueil') + '">' + wordmark + '</a><nav aria-label="' + text(locale, 'Navigation principale', 'Main navigation') + '">' + expertiseMenu + link('approach', locale, text(locale, 'Notre approche', 'Our approach'), page.id === 'approach' ? 'is-current' : '') + link('about', locale, 'Bump', page.id === 'about' ? 'is-current' : '') + '</nav><div class="seo-header-actions"><a class="seo-language" href="' + other.path + '" lang="' + other.locale + '" hreflang="' + languageTag(other.locale) + '" aria-label="' + (en ? 'Passer en français' : 'Switch to English') + '">' + (en ? 'FR' : 'EN') + '</a><a class="seo-project" aria-label="' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + '" href="' + brief + '"><span>' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + '</span>' + arrow + '</a></div>';
  const services = page.id === 'expertise' ? '<section class="seo-service-directory" id="domaines"><div class="seo-directory-heading"><p class="seo-eyebrow">' + text(locale, 'Trouver votre point de départ', 'Find your starting point') + '</p><h2>' + text(locale, 'Le bon levier, au bon endroit.', 'The right change, in the right place.') + '</h2></div>' + ['workflow', 'ai', 'software', 'security'].map((id, index) => {
    const service = pageFor(id, locale);
    return '<a class="seo-directory-row" href="' + service.path + '" data-accent="' + service.accent + '"><span class="seo-directory-number">' + ['I', 'II', 'II', 'III'][index] + '</span><div><h3>' + html(cleanTitle(service.title)) + '</h3><p>' + html(service.lead) + '</p></div>' + arrow + '</a>';
  }).join('') + '</section>' : '';
  const toc = '<aside class="seo-toc"><p class="seo-eyebrow">' + text(locale, 'Dans cette page', 'On this page') + '</p><nav aria-label="' + text(locale, 'Sommaire', 'Table of contents') + '">' + page.sections.map(section => '<a href="#' + section.id + '">' + html(section.title.replace(/^\d+\. /, '')) + '</a>').join('') + '<a href="#questions">' + text(locale, 'Questions fréquentes', 'Questions') + '</a></nav><a class="seo-toc-note" href="' + homePath(locale) + '#' + (page.chapter || 'hero') + '">' + text(locale, 'Explorer l’expérience Bump', 'Explore the Bump experience') + ' ' + arrow + '</a></aside>';
  const faq = '<section class="seo-faq" id="questions"><p class="seo-eyebrow">' + text(locale, 'Pour aller plus loin', 'A little more clarity') + '</p><h2>' + text(locale, 'Les questions qu’on se pose.', 'Questions worth asking.') + '</h2>' + (page.id === 'faq' ? '<label class="seo-faq-filter"><span>' + text(locale, 'Trouver une réponse', 'Find an answer') + '</span><input type="search" data-faq-search placeholder="' + text(locale, 'Ex. budget, outils, validation…', 'E.g. budget, tools, approval…') + '" autocomplete="off"></label><p class="seo-filter-empty" role="status" hidden>' + text(locale, 'Aucune question correspondante. Essayez un autre mot.', 'No matching question. Try another word.') + '</p>' : '') + page.faqs.map((item, index) => '<details class="seo-faq-item" id="question-' + (index + 1) + '"><summary>' + html(item.q) + '<span aria-hidden="true">+</span></summary><div><p>' + html(item.a) + '</p></div></details>').join('') + '</section>';
  const related = '<section class="seo-related"><div><p class="seo-eyebrow">' + text(locale, 'Les sujets se répondent', 'Connected expertise') + '</p><h2>' + text(locale, 'Poursuivre la réflexion.', 'Keep exploring.') + '</h2></div><div class="seo-related-links">' + page.related.slice(0, 4).map(id => {
    const item = pageFor(id, locale);
    return '<a href="' + item.path + '"><span>' + html(item.eyebrow) + '</span><strong>' + html(cleanTitle(item.title)) + '</strong>' + arrow + '</a>';
  }).join('') + '</div></section>';
  const footer = '<footer class="seo-footer"><div><a class="seo-brand" href="' + homePath(locale) + '">' + wordmark + '</a><p>' + text(locale, 'Donnons de l’élan à votre entreprise.', 'Give your business fresh momentum.') + '</p><span>Montréal, Québec</span></div><nav aria-label="' + text(locale, 'Nos services', 'Our services') + '"><span>' + text(locale, 'Expertises', 'Expertise') + '</span>' + link('workflow', locale, text(locale, 'Automatisation des processus', 'Workflow automation')) + link('ai', locale, text(locale, 'Intégration IA', 'AI integration')) + link('software', locale, text(locale, 'Logiciels sur mesure', 'Custom software')) + link('security', locale, text(locale, 'Cybersécurité', 'Cybersecurity')) + '</nav><nav aria-label="Bump"><span>Bump</span>' + link('expertise', locale, text(locale, 'Toutes les expertises', 'All expertise')) + link('approach', locale, text(locale, 'Notre approche', 'Our approach')) + link('about', locale, text(locale, 'À propos', 'About')) + link('faq', locale, text(locale, 'Questions fréquentes', 'Frequently asked questions')) + '</nav><div class="seo-colophon"><span>© ' + site.updated.slice(0, 4) + ' Bump</span><a href="#contenu">' + text(locale, 'Revenir en haut', 'Back to top') + ' ' + arrow.replace('<svg ', '<svg style="transform:rotate(-45deg);vertical-align:middle" ') + '</a></div></footer>';
  return '<!doctype html><html lang="' + languageTag(locale) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f1e8"><link rel="icon" href="' + site.logo + '" type="image/svg+xml"><link rel="preload" href="/bump/fonts/im-fell-english-regular.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/bump/seo/pages.css"><link rel="stylesheet" href="/bump/music.css">' + headMarkup(page, origin) + '<script type="module" src="/bump/seo/pages.js"></script></head><body class="seo-page seo-page--' + page.id + '" data-accent="' + page.accent + '"><a class="seo-skip" href="#contenu">' + text(locale, 'Aller au contenu', 'Skip to content') + '</a><header class="seo-header">' + nav + '</header><main id="contenu"><div class="seo-breadcrumb"><a class="seo-experience-return" href="' + homePath(locale) + '#' + (page.chapter || 'hero') + '"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>' + text(locale, 'Retour au site', 'Back to the site') + '</a><span aria-hidden="true">/</span>' + (page.type === 'service' ? link('expertise', locale, text(locale, 'Expertises', 'Expertise')) + '<span aria-hidden="true">/</span>' : '') + '<span>' + html(page.eyebrow.replace(/^\d+ — /, '')) + '</span></div><section class="seo-hero"><div class="seo-hero-copy"><p class="seo-eyebrow">' + html(page.eyebrow) + '</p><h1>' + page.title.split('\n').map(html).join('<br>') + '</h1><p class="seo-hero-lead">' + html(page.lead) + '</p><div class="seo-hero-links"><a class="seo-primary" href="' + action.href + '">' + html(action.label) + arrow + '</a><span>Montréal · Québec</span></div></div>' + renderStoryFigure(page) + '</section><section class="seo-answer" id="en-clair"><span class="seo-eyebrow">' + text(locale, 'En clair', 'At a glance') + '</span><p>' + html(page.answer) + '</p></section>' + services + readingMarkup(page, toc, faq) + referencesMarkup(page) + related + '<section class="seo-next"><p class="seo-eyebrow">' + text(locale, 'Votre prochain élan', 'Your next step') + '</p><h2>' + html(action.next) + '</h2><a href="' + brief + '" class="seo-primary">' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + arrow + '</a></section></main>' + '<aside class="seo-editorial-credit"><a href="' + pageFor('about',locale).path + '">' + text(locale,'Publié par Bump · Consultation technologique à Montréal','Published by Bump · Technology consulting in Montréal') + '</a><p>' + text(locale,'Mis à jour le ','Updated ') + '<time datetime="' + site.updated + '">' + site.updated + '</time></p></aside>' + footer + music + '</body></html>';
}

export function renderLlms(origin) {
  const lines = ['# Bump', '', '> ' + site.description, '', 'Fondée par deux entrepreneurs à Montréal, Québec. Services de consultation pour les PME du Québec. Français et anglais. Prix et périmètre établis par proposition après analyse.', '', 'Cyber AI, Developer AI et Workflow AI sont une vision future, pas des produits disponibles. Les démonstrations utilisent des données fictives.', '', '<!-- Keep in sync with robots.txt and ai.txt; generated from the public route catalog. -->', '', '## Pages principales — français', ''];
  for (const page of listPages().filter(page => page.locale === 'fr')) lines.push('- [' + cleanTitle(page.title) + '](' + absolute(markdownPath(page.path), origin) + '): ' + page.description);
  lines.push('', '## English pages', '');
  for (const page of listPages().filter(page => page.locale === 'en')) lines.push('- [' + cleanTitle(page.title) + '](' + absolute(markdownPath(page.path), origin) + '): ' + page.description);
  lines.push('', '## Machine-readable', '', '- [Full public text](' + origin + '/llms-full.txt): Both language editions, generated from the same catalog.', '- [Markdown catalog](' + origin + '/api/md/_catalog): Public routes and their HTML and markdown URLs.', '- [Sitemap](' + origin + '/sitemap.xml): Canonical HTML pages only.', '- [AI usage information](' + origin + '/ai.txt): Scope, attribution and factual boundaries.', '');
  return lines.join('\n');
}

export function renderLlmsFull(origin) {
  const value = '# Bump — full public content\n\n> ' + site.description + '\n\nContent updated: ' + site.updated + '\n\n' + listPages().map(page => '---\n<!-- source: ' + absolute(page.path, origin) + ' -->\n\n' + renderMarkdown(page, origin)).join('\n');
  if (value.length > 500000) throw new Error('Public content exceeds the full-text limit; define a documented collection limit.');
  return value;
}

export function renderRobots(origin) {
  const rules = ['Allow: /', ...site.privatePaths.map(path => 'Disallow: ' + path), 'Allow: /api/md/'];
  return '# Keep in sync with llms.txt and ai.txt. Generated from the public catalog.\n# Training crawler choices remain unchanged; no new training-specific restrictions.\n# robots.txt is discovery guidance, not authentication.\n\n' + ['*', ...site.searchCrawlers].map(agent => 'User-agent: ' + agent + '\n' + rules.join('\n')).join('\n\n') + '\n\nSitemap: ' + origin + '/sitemap.xml\n# Public text map: ' + origin + '/llms.txt\n# AI usage information: ' + origin + '/ai.txt\n';
}

export function renderAi(origin) {
  return '# AI usage information — public editorial text only\n# Keep in sync with robots.txt and llms.txt.\n# Informational guidance; this does not replace robots.txt or grant asset licences.\n\n[identity]\nname: ' + site.name + '\nurl: ' + origin + '/\ndescription: ' + site.description + '\n\n[permissions]\npublic_editorial_text: summarise; cite; quote with attribution within applicable rights; index for search and answers\n\n[restrictions]\nDo not fabricate quotes, endorsements, clients, results, reviews, ratings or certifications.\nDo not describe future Cyber AI, Developer AI or Workflow AI systems as available products.\nDo not treat fictional demonstrations as client deployments or measured outcomes.\nNo private, authenticated or unpublished information is included in this publication.\nNo additional rights to images, models, audio, code or third-party assets are granted here.\nTraining crawler preferences are not changed by this file; consult robots.txt.\n\n[attribution]\nname: Bump\nurl: Use the canonical HTML URL of the relevant page.\n\n[scope]\nincluded: Canonical public editorial routes listed in ' + origin + '/api/md/_catalog\nexcluded: /admin/; /dashboard/; /auth/; non-markdown /api/; /runtime/; /bump/; /assets/\n\n[contact]\nurl: ' + origin + '/a-propos\nemail: Not published\n\nLast updated: ' + site.updated + '\n';
}

export function renderSitemap(origin) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + listPages().map(page => '  <url><loc>' + html(absolute(page.path, origin)) + '</loc><lastmod>' + site.updated + '</lastmod></url>').join('\n') + '\n</urlset>\n';
}
