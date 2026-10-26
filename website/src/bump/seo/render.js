import {site, languageTag, text, homePath} from './site.js';
import {catalog, pageFor, listPages} from './pages.js';

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
  const webpage = {'@type': page.type === 'about' ? 'AboutPage' : page.type === 'faq' ? 'FAQPage' : page.type === 'hub' ? 'CollectionPage' : 'WebPage', '@id': url + '#webpage', url, name: cleanTitle(page.title), description: page.description, inLanguage: languageTag(page.locale), isPartOf: {'@id': websiteId}, publisher: {'@id': organizationId}, dateModified: site.updated};
  const nodes = [organization, website, webpage];
  if (page.type === 'service') {
    webpage.mainEntity = {'@id': url + '#service'};
    nodes.push({'@type': 'Service', '@id': url + '#service', name: cleanTitle(page.title), serviceType: cleanTitle(page.title), description: page.answer, provider: {'@id': organizationId}, areaServed: {'@type': 'AdministrativeArea', name: 'Québec'}, url});
  }
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
    '<meta name="description" content="' + html(page.description) + '">\n' +
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
  lines.push('## Related', '');
  for (const id of page.related) { const related = pageFor(id, page.locale); lines.push('- [' + mdText(cleanTitle(related.title)) + '](' + absolute(related.path, origin) + ') — ' + mdText(related.description)); }
  return lines.join('\n') + '\n';
}

function figure(page) {
  const locale = page.locale;
  const labels = {
    expertise: [['Processus', 'Logiciels', 'Sécurité'], ['Processes', 'Software', 'Security']],
    workflow: [['Formulaire', 'Courriel', 'Document'], ['Form', 'Email', 'Document']],
    ai: [['CRM', 'Documents', 'ERP'], ['CRM', 'Documents', 'ERP']],
    software: [['Équipe', 'Processus', 'Outils'], ['Team', 'Processes', 'Tools']],
    security: [['Applications', 'Accès', 'Systèmes'], ['Applications', 'Access', 'Systems']],
    approach: [['Besoins', 'Contexte', 'Priorités'], ['Needs', 'Context', 'Priorities']],
    about: [['Montréal', 'PME', 'Équipe'], ['Montréal', 'SMBs', 'Team']],
    faq: [['Objectifs', 'Outils', 'Contraintes'], ['Goals', 'Tools', 'Constraints']],
  };
  const notes = {
    expertise: [
      ['Nous partons de ce qui ralentit votre entreprise.', 'Nous choisissons les bons outils avec votre équipe.', 'Une solution adaptée, puis un suivi dans le temps.'],
      ['We start with what slows your business down.', 'We choose the right tools with your team.', 'A fitting solution, followed by ongoing support.']],
    workflow: [
      ['Les informations utiles se réunissent dans un même parcours.', 'Les actions sensibles attendent l’accord de votre équipe.', 'Les données suivent dans les outils concernés.'],
      ['Useful information comes together in one journey.', 'Sensitive actions wait for your team’s approval.', 'Information flows to the tools that need it.']],
    ai: [
      ['L’information est organisée dans son contexte.', 'Une proposition expliquée, avec ses sources.', 'Votre équipe décide avant l’exécution.'],
      ['Information is organized in context.', 'An explained recommendation, with its sources.', 'Your team decides before execution.']],
    software: [
      ['Vos façons de travailler guident la conception.', 'Un outil testé et ajusté avec ses utilisateurs.', 'Des connexions utiles et un logiciel qui peut évoluer.'],
      ['The way you work guides the design.', 'A tool tested and refined with its users.', 'Useful connections and software that can evolve.']],
    security: [
      ['L’audit se limite aux systèmes et aux accès autorisés.', 'Les constats sont expliqués et classés par priorité.', 'Les correctifs convenus sont mis en place et vérifiés.'],
      ['The audit is limited to authorized systems and access.', 'Findings are explained and prioritized.', 'Agreed fixes are implemented and verified.']],
    approach: [
      ['Nous observons votre fonctionnement et vos contraintes.', 'Le périmètre, les priorités et les moyens sont convenus ensemble.', 'Nous implantons la solution et préparons son suivi.'],
      ['We examine how you work and your constraints.', 'Scope, priorities and resources are agreed together.', 'We implement the solution and prepare ongoing support.']],
    about: [
      ['Deux entrepreneurs, un point de départ à Montréal.', 'Une collaboration directe avec les PME.', 'Des solutions pensées pour le travail de votre équipe.'],
      ['Two entrepreneurs, starting in Montréal.', 'Direct collaboration with small and medium-sized businesses.', 'Solutions designed for the work your team does.']],
    faq: [
      ['Une situation concrète plutôt qu’une technologie imposée.', 'Des choix expliqués, avec leurs contraintes.', 'Vous gardez la décision sur la suite du projet.'],
      ['A concrete situation, rather than a prescribed technology.', 'Explained choices, including their constraints.', 'You decide how the project moves forward.']],
  };
  const key = Object.hasOwn(notes, page.id) ? page.id : 'expertise';
  const sources = labels[key][locale === 'fr' ? 0 : 1];
  const explanations = notes[key][locale === 'fr' ? 0 : 1];
  const icons = [
    '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/>',
    '<path d="M4 7h13l-3-3M20 17H7l3 3M17 7l-3 3M7 17l3-3"/>',
  ];
  const icon = index => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[index] + '</svg>';
  const approval = ['workflow', 'ai'].includes(key);
  return '<figure class="seo-explainer" aria-label="' + html(text(locale, 'Parcours illustratif', 'Illustrative journey')) + '"><div class="seo-explainer-bar"><span class="seo-explainer-brand"><span class="seo-mark" aria-hidden="true"></span>Bump</span><span>' + text(locale, 'Scénario illustratif', 'Illustrative scenario') + '</span></div><div class="seo-flow-sources">' + sources.map(source => '<span>' + html(source) + '</span>').join('') + '</div><div class="seo-flow-join" aria-hidden="true"><svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="M50 0v12h200V0M150 12v18"/></svg></div><ol class="seo-flow-steps">' + page.figure.map((step, index) => '<li><span class="seo-flow-number">' + String(index + 1).padStart(2, '0') + '</span><div class="seo-flow-node' + (approval && index === 1 ? ' seo-flow-node--approval' : '') + '"><span class="seo-flow-icon">' + icon(index) + '</span><div><strong>' + html(step) + '</strong><p>' + html(explanations[index]) + '</p>' + (approval && index === 1 ? '<span class="seo-flow-status"><i aria-hidden="true"></i>' + text(locale, 'Validation humaine', 'Human approval') + '</span>' : '') + '</div></div></li>').join('') + '</ol><figcaption><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>' + text(locale, 'Votre fonctionnement guide la solution.', 'The way you work guides the solution.') + '</figcaption></figure>';
}

function sectionMarkup(section, index, locale) {
  return '<section id="' + section.id + '" class="seo-section' + (section.example ? ' seo-example' : '') + '"><div class="seo-section-index" aria-hidden="true">' + String(index + 1).padStart(2, '0') + '</div><div class="seo-section-main">' + (section.example ? '<p class="seo-eyebrow">' + text(locale, 'Scénario illustratif', 'Illustrative scenario') + '</p>' : '') + '<h2>' + html(section.title) + '</h2>' + (section.paragraphs || []).map(paragraph => '<p>' + html(paragraph) + '</p>').join('') + (section.items ? '<ul class="seo-list">' + section.items.map(item => '<li>' + html(item) + '</li>').join('') + '</ul>' : '') + (section.table ? '<div class="seo-table-wrap" role="region" aria-label="' + html(section.title) + '" tabindex="0"><table><thead><tr>' + section.table.headers.map(header => '<th scope="col">' + html(header) + '</th>').join('') + '</tr></thead><tbody>' + section.table.rows.map(row => '<tr>' + row.map((cell, i) => '<' + (i ? 'td' : 'th scope="row"') + '>' + html(cell) + '</' + (i ? 'td' : 'th') + '>').join('') + '</tr>').join('') + '</tbody></table></div>' : '') + '</div></section>';
}

export function renderHtml(page, origin) {
  const locale = page.locale, en = locale === 'en', other = pageFor(page.id, en ? 'fr' : 'en');
  const brief = homePath(locale) + '?projet=1';
  const nav = '<a class="seo-brand" href="' + homePath(locale) + '" aria-label="Bump — ' + (en ? 'home' : 'accueil') + '">' + wordmark + '</a><nav aria-label="' + text(locale, 'Navigation principale', 'Main navigation') + '">' + link('expertise', locale, text(locale, 'Expertises', 'Expertise'), page.id === 'expertise' || page.type === 'service' ? 'is-current' : '') + link('approach', locale, text(locale, 'Notre approche', 'Our approach'), page.id === 'approach' ? 'is-current' : '') + link('about', locale, 'Bump', page.id === 'about' ? 'is-current' : '') + '</nav><div class="seo-header-actions"><a class="seo-language" href="' + other.path + '" lang="' + other.locale + '" hreflang="' + languageTag(other.locale) + '" aria-label="' + (en ? 'Passer en français' : 'Switch to English') + '">' + (en ? 'FR' : 'EN') + '</a><a class="seo-project" aria-label="' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + '" href="' + brief + '"><span>' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + '</span>' + arrow + '</a></div>';
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
  return '<!doctype html><html lang="' + languageTag(locale) + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4f1e8"><link rel="icon" href="' + site.logo + '" type="image/svg+xml"><link rel="preload" href="/bump/fonts/im-fell-english-regular.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="/bump/seo/pages.css">' + headMarkup(page, origin) + '<script src="/bump/seo/pages.js" defer></script></head><body class="seo-page" data-accent="' + page.accent + '"><a class="seo-skip" href="#contenu">' + text(locale, 'Aller au contenu', 'Skip to content') + '</a><header class="seo-header">' + nav + '</header><main id="contenu"><div class="seo-breadcrumb"><a href="' + homePath(locale) + '">' + text(locale, 'Accueil', 'Home') + '</a><span aria-hidden="true">/</span>' + (page.type === 'service' ? link('expertise', locale, text(locale, 'Expertises', 'Expertise')) + '<span aria-hidden="true">/</span>' : '') + '<span>' + html(page.eyebrow.replace(/^\d+ — /, '')) + '</span></div><section class="seo-hero"><div class="seo-hero-copy"><p class="seo-eyebrow">' + html(page.eyebrow) + '</p><h1>' + page.title.split('\n').map(html).join('<br>') + '</h1><p class="seo-hero-lead">' + html(page.lead) + '</p><div class="seo-hero-links"><a class="seo-primary" href="' + (page.id === 'expertise' ? '#domaines' : '#en-clair') + '">' + text(locale, page.id === 'expertise' ? 'Explorer les expertises' : 'Comprendre l’approche', page.id === 'expertise' ? 'Explore our expertise' : 'Understand the approach') + arrow + '</a><span>Montréal · Québec</span></div></div>' + figure(page) + '</section><section class="seo-answer" id="en-clair"><span class="seo-eyebrow">' + text(locale, 'En clair', 'At a glance') + '</span><p>' + html(page.answer) + '</p></section>' + services + '<div class="seo-reading">' + toc + '<article class="seo-article" aria-label="' + html(cleanTitle(page.title)) + '">' + page.sections.map((section, index) => sectionMarkup(section, index, locale)).join('') + faq + '</article></div>' + related + '<section class="seo-next"><p class="seo-eyebrow">' + text(locale, 'Votre prochain élan', 'Your next step') + '</p><h2>' + text(locale, 'Et si on partait<br>de votre réalité ?', 'What if we started<br>with your reality?') + '</h2><a href="' + brief + '" class="seo-primary">' + text(locale, 'Parlons de votre projet', 'Let’s talk about your project') + arrow + '</a></section></main>' + footer + '</body></html>';
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
