import { type Check, elements, visibleText } from './check.js';

export function detectTrackers(html: string): string[] {
  const scripts = elements(html, 'script').join(' ');
  return Object.entries({
    'Google Tag Manager': /googletagmanager\.com\/gtm\.js|\bgtm\.js\b/i,
    'Google Analytics': /google-analytics\.com|googletagmanager\.com\/gtag|\bgtag\s*\(/i,
    'Meta Pixel': /fbevents\.js|\bfbq\s*\(/i,
    Hotjar: /static\.hotjar\.com|\bhj\s*\(/i,
    TikTok: /analytics\.tiktok\.com|\bttq\./i,
    Clarity: /clarity\.ms\/tag/i,
  })
    .filter(([, pattern]) => pattern.test(scripts))
    .map(([name]) => name);
}

export function analyzeCookies(url: string, html: string, cookies: string[]): Check[] {
  const trackers = detectTrackers(html);
  const trackingCookieNames = cookies
    .map((cookie) => cookie.split('=', 1)[0] ?? '')
    .filter((name) => /^(?:_ga(?:_|$)|_gid$|_gat|_fb[pc]$|_hj|_ttp$|_clck$|_clsk$)/i.test(name));
  const cmp =
    /cookiebot|axeptio|onetrust|complianz|didomi|cookieyes/i.test(html) ||
    /(?:accepter|refuser|accept|reject).{0,120}(?:cookies|t[ée]moins)|(?:cookies|t[ée]moins).{0,120}(?:consent|accepter|refuser)/i.test(
      visibleText(html),
    );
  return [
    {
      key: 'trackers',
      category: 'CONSENTEMENT_COOKIES_PROFILAGE',
      severity: 'ELEVE',
      passed: trackers.length === 0 && trackingCookieNames.length === 0,
      titleFr: 'Traceurs présents dans le HTML initial',
      lawArticle: 'Loi 25, art. 8.1 et 14',
      descriptionFr:
        'La présence de code de suivi est un signal à vérifier. Ce scan sans JavaScript ne prouve ni son exécution avant consentement, ni l’efficacité d’une bannière détectée.',
      evidence: {
        url,
        trackers,
        cmpDetected: cmp,
        trackingCookieNames,
        initialCookieNames: cookies.map((c) => c.split('=', 1)[0]),
        execution: 'NON_OBSERVEE',
      },
      businessRiskFr:
        'Un profilage sans choix éclairé peut affecter la confiance et exposer l’entreprise à des plaintes.',
      remediationPitchFr:
        'Bump valide le déclenchement des traceurs et configure un consentement préalable avec refus aussi accessible que l’acceptation.',
      estimatedFixCad: trackers.length || trackingCookieNames.length ? 750 : 0,
    },
  ];
}
