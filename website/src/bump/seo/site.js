import {CONTACT_EMAIL,CONTACT_ORIGIN} from '../contact.js';
// Public contact facts come from PR34 and its verified Cloudflare setup.
// Other unknown company details and future products remain unpublished.
export const site = {
  name: 'Bump',
  email: CONTACT_EMAIL,
  primaryOrigin: CONTACT_ORIGIN,
  description: 'Bump est une entreprise de consultation technologique fondée par deux entrepreneurs à Montréal. Elle accompagne les PME en optimisation des processus, intégration IA, développement logiciel et cybersécurité.',
  location: 'Montréal, Québec',
  logo: '/bump/favicon.svg',
  image: '/bump/art/hero-fallback-v2.webp',
  updated: '2026-10-27',
  // First editorial release: Site v47, published 2026-10-26T01:51:46Z.
  // This is not an inferred founding date or the original landing launch date.
  editorialPublished: '2026-10-26',
  sourceUrl: 'https://github.com/MarcSaad-Hadidi/Bump-Inc/tree/main/website',
  languages: ['fr-CA', 'en-CA'],
  privatePaths: ['/admin/', '/dashboard/', '/auth/', '/api/'],
  // Training crawler choices are unchanged. Search discovery does not opt the
  // owner into a new training policy, nor grant rights to retained artwork.
  searchCrawlers: ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'],
};

export const originMarker = '__BUMP_ORIGIN__';
export const languageTag = locale => locale === 'en' ? 'en-CA' : 'fr-CA';
export const homePath = locale => locale === 'en' ? '/en' : '/';
export const text = (locale, fr, en) => locale === 'en' ? en : fr;
