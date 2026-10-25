export type SecurityModuleId = 'applications' | 'infrastructure' | 'users' | 'networks' | 'data' | 'external';
export type SecurityStatus = 'idle' | 'active' | 'verified' | 'warning' | 'danger' | 'correcting';

export const SECURITY_MODULES: { id: SecurityModuleId; name: string; shortName: string; purpose: string; detail: string }[] = [
  { id: 'applications', name: 'Applications', shortName: 'Applications', purpose: 'Les outils et leurs dépendances.', detail: 'Les processeurs représentent vos applications. Leurs connexions sont rapprochées des permissions nécessaires à leur fonctionnement.' },
  { id: 'infrastructure', name: 'Infrastructures', shortName: 'Infra\u00adstructures', purpose: 'Les systèmes qui soutiennent vos activités.', detail: 'Les deux unités serveur et leur refroidissement représentent les équipements, les configurations et leur maintien en condition.' },
  { id: 'users', name: 'Utilisateurs', shortName: 'Utilisateurs', purpose: 'Les identités, les rôles et leurs droits.', detail: 'Les clés de rôle passent par un verrou d’identité. Ce mécanisme illustre la vérification des accès attribués aux bonnes personnes.' },
  { id: 'networks', name: 'Réseaux', shortName: 'Réseaux', purpose: 'Les connexions entre vos environnements.', detail: 'Les ports et leurs canaux représentent les échanges permis entre vos systèmes, leurs limites et leurs points d’entrée.' },
  { id: 'data', name: 'Données & accès', shortName: 'Données & accès', purpose: 'Les informations et les permissions associées.', detail: 'Le compartiment protège les données. Son sélecteur et son verrou représentent des permissions limitées au besoin réel.' },
  { id: 'external', name: 'Services externes', shortName: 'Services externes', purpose: 'Les intégrations et les partenaires.', detail: 'Les fiches amovibles rendent visibles les intégrations externes, leurs autorisations et leur place dans le périmètre.' },
];

export const SECURITY_STAGES = [
  { id: 'initialisation', title: 'Initialisation', headline: 'Un périmètre commun.', description: 'Le noyau, ses modules et leurs connexions forment un seul système de protection.', start: 0, end: 2.6 },
  { id: 'activation', title: 'Activation des domaines', headline: 'Six domaines, un ensemble.', description: 'Chaque module rejoint le noyau. Les supports se verrouillent et les canaux s’activent.', start: 2.6, end: 6.6 },
  { id: 'analyse', title: 'Analyse en cours', headline: 'Examiner les connexions.', description: 'L’instrument parcourt les six domaines et vérifie leurs relations, dans ce scénario illustratif.', start: 6.6, end: 11.4 },
  { id: 'partiels', title: 'Résultats partiels', headline: 'Un point reste à examiner.', description: 'Cinq domaines sont vérifiés. Le contrôle des données et des accès demande une attention particulière.', start: 11.4, end: 14.5 },
  { id: 'correlation', title: 'Corrélation', headline: 'Relier les constats.', description: 'Applications et Données & accès partagent une même chaîne de permissions. Le noyau rapproche leurs signaux.', start: 14.5, end: 18 },
  { id: 'detection', title: 'Détection', headline: 'Un accès à resserrer.', description: 'Le sélecteur de permissions se décale. Le système illustre une anomalie à comprendre avant d’agir.', start: 18, end: 22 },
  { id: 'recommandation', title: 'Recommandation', headline: 'Un plan de correction clair.', description: 'Le compartiment s’ouvre pour révéler la configuration concernée. Quatre actions guident la correction.', start: 22, end: 27.8 },
  { id: 'correction', title: 'Correction illustrative', headline: 'Ajuster, puis vérifier.', description: 'Le sélecteur reprend sa place, le compartiment se referme et le verrou d’identité s’engage.', start: 27.8, end: 33.4 },
  { id: 'protection', title: 'Protection renforcée', headline: 'Périmètre maîtrisé', description: 'Suivi continu activé', start: 33.4, end: 38 },
] as const;

export const SECURITY_ACTIONS = [
  ['Réduire les permissions', 'Limiter les droits au besoin réel.'],
  ['Appliquer la modification', 'Sur le serveur fictif DEMO-01.'],
  ['Vérifier la configuration', 'Contrôler les accès autorisés.'],
  ['Confirmer la résolution', 'Documenter et suivre le résultat.'],
] as const;

export const SECURITY_DURATION = 38;
export const SECURITY_PLAYBACK_RATE = 1.5;
export const representativeTime = (index: number) => {
  const stage = SECURITY_STAGES[Math.max(0, Math.min(8, index))];
  return Math.max(stage.start + 0.05, stage.end - 0.28);
};

export type SecuritySnapshot = {
  stage: number;
  activated: number;
  revealed: number;
  corrected: number;
  finalFollowup: boolean;
  signature: string;
};

export function securitySnapshotAt(time: number): SecuritySnapshot {
  const t = Math.max(0, Math.min(SECURITY_DURATION, time));
  let stage = 0;
  SECURITY_STAGES.forEach((entry, i) => { if (t >= entry.start) stage = i; });
  const activated = stage === 0 ? 0 : stage === 1 ? Math.min(6, Math.max(1, Math.floor((t - 2.6) / 0.52) + 1)) : 6;
  const revealed = stage < 6 ? 0 : stage > 6 ? 4 : Math.min(4, Math.max(1, Math.floor((t - 22.4) / 0.75) + 1));
  const corrected = stage < 7 ? 0 : stage > 7 ? 4 : [29.45, 30.85, 31.9, 32.75].filter(completedAt => t >= completedAt).length;
  const finalFollowup = t >= 34.8;
  return { stage, activated, revealed, corrected, finalFollowup, signature: [stage, activated, revealed, corrected, Number(finalFollowup)].join(':') };
}

export function moduleStatus(id: SecurityModuleId, snapshot: SecuritySnapshot): SecurityStatus {
  const index = SECURITY_MODULES.findIndex((module) => module.id === id);
  if (snapshot.stage === 0 || index >= snapshot.activated) return 'idle';
  if (snapshot.stage < 3) return 'active';
  if (id !== 'data') return 'verified';
  if (snapshot.stage < 5) return 'warning';
  if (snapshot.stage < 7) return 'danger';
  if (snapshot.stage === 7 && snapshot.corrected < 4) return 'correcting';
  return 'verified';
}

export const STATUS_LABELS: Record<SecurityStatus, string> = {
  idle: 'En attente', active: 'En analyse', verified: 'Vérifié', warning: 'À examiner', danger: 'Anomalie fictive', correcting: 'En correction',
};

// Exact cue times are shared by the live GSAP controller and the shape audit.
export const SECURITY_MECHANISM_CUES = {
  permission: { outAt: 18.1, outDuration: 0.9, backAt: 28.2, backDuration: 1.25 },
  hatch: { outAt: 22.1, outDuration: 1.3, backAt: 29.65, backDuration: 1.2 },
  'identity-lock': { outAt: 18.25, outDuration: 0.8, backAt: 31, backDuration: 0.9 },
} as const;
export const SECURITY_CORE_INSERTION = { at: 0.35, duration: 1.2 } as const;
const clampUnit = (n: number) => Math.max(0, Math.min(1, n));
const power2InOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export function securityMechanismSharesAt(time: number): Record<string, number> {
  const shares: Record<string, number> = {};
  for (const [name, cue] of Object.entries(SECURITY_MECHANISM_CUES)) {
    shares[name] = power2InOut(clampUnit((time - cue.outAt) / cue.outDuration)) * (1 - power2InOut(clampUnit((time - cue.backAt) / cue.backDuration)));
  }
  const insert = clampUnit((time - SECURITY_CORE_INSERTION.at) / SECURITY_CORE_INSERTION.duration);
  shares['core-insertion'] = Math.pow(1 - insert, 4); // GSAP power3.out
  return shares;
}
