/** One source for method copy, resting states and the reversible GSAP story. */
export const METHOD_STAGES = [
  { key: 'audit', name: 'Audit', title: 'Comprendre votre réalité.', message: 'Nous examinons vos besoins, vos outils et vos contraintes.', instrument: 'Périmètre observé', action: 'Mesure & diagnostic' },
  { key: 'analyse', name: 'Analyse', title: 'Identifier les bonnes priorités.', message: 'Nous relions les constats aux causes et aux solutions possibles.', instrument: 'Priorités organisées', action: 'Tri & corrélation' },
  { key: 'proposition', name: 'Proposition', title: 'Dessiner la bonne solution.', message: 'Un plan concret, des responsabilités et des étapes claires.', instrument: 'Plan de réalisation', action: 'Traçage & conception' },
  { key: 'implantation', name: 'Implantation', title: 'Donner vie à la solution.', message: 'Nous construisons, intégrons et vérifions avec vos équipes.', instrument: 'Solution assemblée', action: 'Assemblage & verrouillage' },
  { key: 'maintenance', name: 'Maintenance', title: 'Faire évoluer votre solution.', message: 'Nous assurons le suivi et adaptons la solution dans le temps.', instrument: 'Fonctionnement stable', action: 'Réglage & suivi' },
] as const;

export type MethodStage = 0 | 1 | 2 | 3 | 4;
export type Move3 = [number, number, number];
export interface WorkshopPose {
  projectX: number;
  headX: number;
  penY: number;
  probeDrop: number;
  probeY: number;
  penDrop: number;
  driverDrop: number;
  driverY: number;
  sort: number;
  plan: number;
  coverX: number;
  coverY: number;
  coverLift: number;
  clamp: number;
  gauge: number;
  service: number;
  wheel: number;
  adjustment: number;
}

export interface WorkshopLayout {
  compact: boolean;
  stations: readonly [number, number, number, number, number];
  supplyX: number;
  supplyY: number;
  beamY: number;
  beamZ: number;
  gaugeX: number;
  serviceX: number;
}

export const DESKTOP_LAYOUT: WorkshopLayout = {
  compact: false, stations: [-112, -56, 0, 60, 60], supplyX: 169, supplyY: 7,
  beamY: -76, beamZ: 118, gaugeX: 175, serviceX: 137,
};
/** A shorter bed and a more upright camera are used on phones; this is not a scaled desktop. */
export const COMPACT_LAYOUT: WorkshopLayout = {
  compact: true, stations: [-74, -36, 0, 38, 38], supplyX: 90, supplyY: 113,
  beamY: -73, beamZ: 114, gaugeX: -120, serviceX: 105,
};

export const clampStage = (index: number): MethodStage => Math.min(4, Math.max(0, Math.round(index))) as MethodStage;

export function poseAt(stage: MethodStage, layout: WorkshopLayout): WorkshopPose {
  const x = layout.stations[stage];
  return {
    projectX: x,
    headX: x + (stage < 2 ? 14 : stage === 2 ? 28 : -14),
    penY: stage === 2 ? 24 : 0,
    probeDrop: stage === 0 ? 23.9 : 0,
    probeY: 0,
    penDrop: stage === 2 ? 43.8 : 0,
    driverDrop: stage >= 3 ? 23 : 0,
    driverY: 0,
    sort: stage === 1 ? 1 : stage === 2 ? 1.15 : 0,
    plan: stage >= 2 ? 1 : 0,
    coverX: stage >= 3 ? x : layout.supplyX,
    coverY: stage >= 3 ? 0 : layout.supplyY,
    coverLift: stage >= 3 ? 0 : 1,
    clamp: stage >= 3 ? 1 : 0,
    gauge: [0.63, 0.36, 0.47, 0.83, 0.75][stage],
    service: stage === 4 ? 1 : 0,
    wheel: stage * 0.45,
    adjustment: stage === 4 ? 1 : 0,
  };
}

export const STAGE_TIME = [0, 1.3, 3.5, 5.9, 7.3] as const;

/** Local cartridge offsets: two move out along their slides while one keeps the datum. */
export function cartridgeMove(index: number, sort: number): Move3 {
  const dir = index === 0 ? -1 : 1;
  return [0, dir * 49 * sort, 0];
}
