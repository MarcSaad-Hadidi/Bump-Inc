import { attribute, type Check, elements, privacyTerms, visibleText } from './check.js';
import { detectTrackers } from './cookies-and-trackers.js';

export function analyzeFormsAndWidgets(
  pages: { url: string; html: string }[],
  complete = true,
): Check[] {
  const forms = pages.flatMap((page) =>
    elements(page.html, 'form').flatMap((form, index) => {
      const personal =
        /<(?:input|textarea)\b[^>]*(?:email|phone|t[ée]l[ée]phone|tel\b|name\s*=\s*["']?(?:full[-_]?name|nom|pr[eé]nom|first[-_]?name|last[-_]?name))/i.test(
          form,
        );
      if (!personal) return [];
      const privacyLink = elements(form, 'a').some((a) =>
        privacyTerms.test(`${attribute(a, 'href')} ${visibleText(a)}`),
      );
      const checkbox =
        /<input\b[^>]*type\s*=\s*(?:"checkbox"|'checkbox'|checkbox\b)/i.test(form) &&
        /consent|accepte|agree/i.test(visibleText(form));
      return [{ url: page.url, formIndex: index, privacyLink, consentCheckbox: checkbox }];
    }),
  );
  const html = pages.map((p) => p.html).join(' ');
  const scripts =
    [...elements(html, 'script'), ...elements(html, 'iframe')].join(' ') +
    (/<[^>]+\bdata-ai-widget\b/i.test(html) ? ' data-ai-widget' : '');
  const widgets = Object.entries({
    Intercom: /intercom/i,
    Drift: /js\.driftt\.com|drift\.load/i,
    'HubSpot Chat': /js\.hs-scripts\.com|hubspot.*chat/i,
    Tidio: /code\.tidio\.co/i,
    Crisp: /client\.crisp\.chat/i,
    Zendesk: /static\.zdassets\.com/i,
    'Assistant IA personnalisé': /data-ai-widget|chatbase|voiceflow|botpress|assistant[-_]ai/i,
  })
    .filter(([, pattern]) => pattern.test(scripts))
    .map(([name]) => name);
  const text = visibleText(html);
  const automationDisclosure =
    /d[ée]cision.{0,80}automatis|automated decision|intelligence artificielle|AI assistant|assistant IA/i.test(
      text,
    );
  const transferDisclosure =
    /hors.{0,30}qu[ée]bec|outside.{0,30}quebec|[ée]tats[- ]unis|united states|transfert.{0,50}(?:international|[ée]tranger)/i.test(
      text,
    );
  const thirdParties = [...new Set([...widgets, ...detectTrackers(html)])];
  return [
    {
      key: 'forms',
      category: 'FORMULAIRES_ET_COLLECTE',
      severity: 'ELEVE',
      passed: forms.some((f) => !f.privacyLink && !f.consentCheckbox)
        ? false
        : complete
          ? true
          : null,
      titleFr: 'Information au moment de la collecte',
      lawArticle: 'Loi 25, art. 8 et 14',
      descriptionFr:
        'Repérage de formulaires recueillant des coordonnées sans lien de confidentialité ni choix de consentement dans le formulaire. Le consentement requis dépend du contexte.',
      evidence: { forms, complete },
      businessRiskFr:
        'Une collecte mal expliquée peut entraîner des plaintes et réduire les demandes de clients.',
      remediationPitchFr:
        'Bump intègre les finalités, les avis et les choix de consentement adaptés à chaque formulaire.',
      estimatedFixCad: 600,
    },
    {
      key: 'ai-widgets',
      category: 'TRANSPARENCE_IA_CHATBOT',
      severity: 'MOYEN',
      passed: widgets.length ? automationDisclosure : complete ? true : null,
      titleFr: 'Transparence des assistants et décisions automatisées',
      lawArticle: 'Loi 25, art. 12.1 (si décision exclusivement automatisée)',
      descriptionFr:
        'Un widget ne prouve pas l’existence d’une décision automatisée. Son rôle, les données utilisées et les avis doivent être confirmés par un expert.',
      evidence: { widgets, automationDisclosure, urls: pages.map((p) => p.url), complete },
      businessRiskFr:
        'Un usage opaque de l’IA peut diminuer la confiance et empêcher les personnes de comprendre une décision.',
      remediationPitchFr:
        'Bump documente les usages IA, les avis nécessaires et le recours à une personne responsable.',
      estimatedFixCad: 500,
    },
    {
      key: 'third-parties',
      category: 'TRANSFERT_HORS_QUEBEC_ET_TIERS',
      severity: 'MOYEN',
      passed: thirdParties.length ? transferDisclosure : complete ? true : null,
      titleFr: 'Services tiers et transferts à documenter',
      lawArticle: 'Loi 25, art. 17',
      descriptionFr:
        'Les noms de fournisseurs ne permettent pas de déduire le lieu d’hébergement. La localisation, les contrats et l’évaluation des facteurs relatifs à la vie privée restent à confirmer.',
      evidence: { thirdParties, transferDisclosure, hostingLocation: 'NON_DETERMINEE', complete },
      businessRiskFr:
        'Un transfert non évalué peut exposer les renseignements et rendre les obligations contractuelles difficiles à démontrer.',
      remediationPitchFr:
        'Bump cartographie les fournisseurs et accompagne l’évaluation des transferts et des garanties.',
      estimatedFixCad: 650,
    },
  ];
}
