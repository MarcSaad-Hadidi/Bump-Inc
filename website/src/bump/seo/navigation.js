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
