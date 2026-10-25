import { type Check, visibleText } from './check.js';

export function analyzePrivacy(
  pages: { url: string; html: string }[],
  policyFound: boolean,
  complete = true,
): Check[] {
  const text = pages.map((page) => visibleText(page.html)).join(' ');
  const officer =
    /responsable de la protection des renseignements personnels|\bRPRP\b|privacy officer|d[ée]l[ée]gu[ée] [àa] la protection/gi;
  const sections = [...text.matchAll(officer)].map((match) =>
    text.slice(Math.max(0, match.index - 150), match.index + 650),
  );
  const contactFound = sections.some((section) =>
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?1[- .]?)?\(?\d{3}\)?[- .]\d{3}[- .]\d{4}/i.test(section),
  );
  const rights = {
    access: /acc[èe]s|\baccess\b/i.test(text),
    rectification: /rectif|correction/i.test(text),
    withdrawal: /retrait|retirer|r[ée]voquer|withdraw/i.test(text),
    retention: /conserv|r[ée]tention|destruct|retention|delet/i.test(text),
  };
  const base = {
    category: 'RESPONSABLE_ET_POLITIQUE' as const,
    severity: 'ELEVE' as const,
    businessRiskFr:
      'Des informations difficiles à trouver fragilisent la confiance et peuvent soulever des questions lors d’un examen de la CAI.',
    remediationPitchFr:
      'Bump aide à publier une politique claire, les coordonnées du responsable et les démarches pour exercer les droits.',
    estimatedFixCad: 450,
  };
  const observed = (passed: boolean) => (passed ? true : complete ? false : null);
  return [
    {
      ...base,
      key: 'privacy-policy',
      passed: observed(policyFound),
      titleFr: 'Politique de confidentialité accessible',
      lawArticle: 'Loi 25, art. 8.2',
      descriptionFr:
        'Recherche de liens et lecture des pages accessibles. Une politique hors des pages visitées peut ne pas être détectée.',
      evidence: { urls: pages.map((page) => page.url), policyFound, complete },
    },
    {
      ...base,
      key: 'privacy-officer',
      passed: observed(contactFound),
      titleFr: 'Responsable et coordonnées repérables',
      lawArticle: 'Loi 25, art. 3.1',
      descriptionFr:
        'Recherche d’un titre de responsable accompagné de coordonnées dans la même section.',
      evidence: {
        urls: pages.map((page) => page.url),
        snippet: sections.find((s) => s.includes('@')) ?? sections[0] ?? '',
        complete,
      },
    },
    {
      ...base,
      key: 'privacy-rights',
      passed: observed(Object.values(rights).every(Boolean)),
      severity: 'MOYEN',
      titleFr: 'Droits et conservation expliqués',
      lawArticle: 'Loi 25, art. 8, 14 et 23',
      descriptionFr:
        'Repérage lexical de l’accès, la rectification, le retrait du consentement et la conservation. Une lecture humaine doit confirmer le sens et l’exhaustivité.',
      evidence: { urls: pages.map((page) => page.url), rights, complete },
      estimatedFixCad: 300,
    },
  ];
}
