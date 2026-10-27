// Public facts only. Keep contact details and proprietary products unpublished
// until Bump supplies them; deployment origins come from the host or build env.
export const site = {
  name: 'Bump',
  description: 'Bump est une entreprise de consultation technologique fondée par deux entrepreneurs à Montréal. Elle accompagne les PME en optimisation des processus, intégration IA, développement logiciel et cybersécurité.',
  location: 'Montréal, Québec',
  logo: '/bump/favicon.svg',
  image: '/bump/art/hero-fallback-v2.webp',
  updated: '2026-10-27',
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
