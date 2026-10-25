/** Fictional local scenario, faithful to src/bump/workflow/config.js. */
export const WORKFLOW_STAGES = [
  { number: '01', name: 'Réception', title: 'Une demande arrive.', detail: 'Le formulaire habituel transmet la demande et son contexte.', inspect: 'Le poinçon enregistre la demande dans le parcours, sans nouvelle saisie.', status: 'Demande #024 · Planifier un rendez-vous' },
  { number: '02', name: 'Qualification', title: 'Les informations trouvent leur chemin.', detail: 'La demande est classée et orientée vers le bon dossier.', inspect: 'L’aiguillage dirige les informations vers le traitement adapté à la demande.', status: 'Demande #024 · Qualification en cours' },
  { number: '03', name: 'Préparation IA', title: 'L’IA prépare. Votre équipe décide.', detail: 'Le contexte est regroupé et une proposition est préparée pour la vérification.', inspect: 'Les instruments réunissent le contexte et repèrent les éléments à vérifier. L’IA prépare une proposition.', status: 'Demande #024 · Préparation de la proposition' },
  { number: '04', name: 'Votre validation', title: 'Le parcours attend votre équipe.', detail: 'Vérifiez la proposition avant d’autoriser la suite. La vanne reste fermée jusqu’à votre validation.', inspect: 'Cette barrière physique bloque le résultat. Seul le bouton « Valider la proposition » autorise son ouverture.', status: 'Demande #024 · En attente de validation' },
  { number: '05', name: 'Transmission', title: 'Vos outils prennent le relais.', detail: 'Après validation, le dossier CRM est mis à jour et la bonne personne est informée.', inspect: 'Le connecteur transmet la décision validée au CRM et le contexte à la personne qui prend le relais.', status: 'Demande #024 · Transmission autorisée' },
  { number: '06', name: 'Résultat', title: 'La bonne information, au bon endroit.', detail: 'Le dossier est à jour. Votre équipe peut poursuivre le travail.', inspect: 'Le même dossier arrive dans la cassette de sortie : mis à jour, validé et partagé.', status: 'Demande #024 · Dossier à jour · Équipe informée' },
] as const;


export const WORKFLOW_MOBILE_COPY = [
  ['Une demande arrive.', 'Le formulaire transmet la demande et son contexte.'],
  ['Le bon parcours.', 'La demande est orientée vers le bon dossier.'],
  ['L’IA prépare.', 'Une proposition est préparée pour votre équipe.'],
  ['Votre équipe valide.', 'La vanne reste fermée jusqu’à votre validation.'],
  ['Vos outils prennent le relais.', 'Le CRM est mis à jour. Le responsable est informé.'],
  ['Le dossier est à jour.', 'Validé et partagé, il est prêt pour la suite.'],
] as const;

export type WorkflowStage = 0 | 1 | 2 | 3 | 4 | 5;
export const WORKFLOW_TIMING = { sort: 1.45, prepare: 3.15, approval: 6.7, hold: 7.1, transfer: 7.16, complete: 11.35 } as const;
export const INITIAL_POSE = { travel: 0, intake: 0, diverter: 0, probeA: 0, probeB: 0, probeC: 0, gate: 0, connector: 0, completion: 0 };
export type WorkflowPose = typeof INITIAL_POSE;

export type Vec3 = [number, number, number];
export function pointAt(route: Vec3[], distance: number): Vec3 {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (remaining <= length) {
      const t = length ? remaining / length : 1;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
    remaining -= length;
  }
  return [...route[route.length - 1]];
}
export function routeLength(route: Vec3[]) {
  return route.slice(1).reduce((sum, b, i) => sum + Math.hypot(b[0] - route[i][0], b[1] - route[i][1], b[2] - route[i][2]), 0);
}
