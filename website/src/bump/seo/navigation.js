// Shared by the editorial header and the landing's existing navigation panel.
export function expertiseLinks(locale) {
  const english = locale === 'en';
  return [
    ['workflow', 'Automatisation des processus', 'Workflow automation', '/services/automatisation-processus', '/en/services/workflow-automation'],
    ['ai', 'Intégration IA', 'AI integration', '/services/integration-ia', '/en/services/ai-integration'],
    ['software', 'Logiciels sur mesure', 'Custom software', '/services/developpement-logiciel', '/en/services/custom-software-development'],
    ['security', 'Cybersécurité', 'Cybersecurity', '/services/cybersecurite', '/en/services/cybersecurity'],
  ].map(([id, fr, en, frPath, enPath]) => ({id, label: english ? en : fr, path: english ? enPath : frPath}));
}

export function editorialLinks(locale) {
  const english = locale === 'en';
  return [
    ...expertiseLinks(locale),
    {id:'expertise',label:english?'All expertise':'Toutes les expertises',path:english?'/en/expertise':'/expertises'},
    {id:'approach',label:english?'Our approach':'Notre approche',path:english?'/en/approach':'/approche'},
    {id:'about',label:english?'About Bump':'À propos de Bump',path:english?'/en/about':'/a-propos'},
    {id:'faq',label:english?'Frequently asked questions':'Questions fréquentes',path:english?'/en/faq':'/faq'},
    {id:'cases',label:english?'Illustrative case studies':'Études de cas illustratives',path:english?'/en/use-cases':'/cas-d-usage'},
  ];
}

export function searchEditorialPages(query, locale) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const term = normalize(query.trim());
  if (!term) return [];
  const keywords = {
    workflow:'workflow automatisation automation processus process api',
    ai:'ia ai intelligence artificielle artificial intelligence agents crm erp',
    software:'logiciel logiciel sur mesure software développement development application web',
    security:'cybersecurite cybersecurity securite security audit protection',
    expertise:'expertises expertise services',
    approach:'methode method approche approach audit analyse proposition implantation maintenance',
    about:'bump montreal quebec entreprise company entrepreneurs propos about',
    faq:'faq question questions reponse answer budget prix price',
    cases:'etude etudes cas usage scenario exemple projet case studies use cases example project',
  };
  return editorialLinks(locale).filter(item => normalize(item.label + ' ' + keywords[item.id]).includes(term));
}
