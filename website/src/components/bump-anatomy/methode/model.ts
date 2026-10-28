// « Notre méthode » sur la carte des outils d'une PME : cinq outils reliés entre eux, un lien cassé.
// Bump fait l'inventaire, trouve le maillon faible, propose trois raccords, pose le bon, puis surveille.
// Score de santé fictif.
import { StepController } from "../shared/controller";
import { METHOD, METHOD_LABEL } from "../shared/method";

export const STATES = METHOD;
export const STATE_LABEL = METHOD_LABEL;
export const TOOLS = ["COURRIELS", "VENTES", "FACTURATION", "COMPTABILITÉ", "INVENTAIRE"] as const;
/** Liens entre outils ; le second (ventes → facturation) est cassé avant l'implantation. */
export const LINKS = [[0, 1], [1, 2], [2, 3], [4, 2]] as const;
export const BROKEN = 1;
export const HEALTH = { before: 42, after: 92 } as const;
/** Maintenance : la liaison inventaire → facturation ralentit ; Bump le voit et règle avant le blocage. */
export const DRIFT = { link: 3, dip: 74 } as const;
export const MAINTENANCE = [
  "maintenance · surveillance continue · tout est au vert",
  `maintenance · ralentissement détecté · ${TOOLS[LINKS[3][0]].toLowerCase()} → ${TOOLS[LINKS[3][1]].toLowerCase()}`,
  `maintenance · réglé avant le blocage · santé ${92} / 100`,
] as const;
export const OPTIONS = ["Connecter les outils", "Remplacer la facturation", "Ajouter un tableur"] as const;
export const CHOSEN = 0;
export const READOUT = [
  `audit · inventaire des outils · santé ${HEALTH.before} / 100`,
  `analyse · ${TOOLS[LINKS[BROKEN][0]].toLowerCase()} et ${TOOLS[LINKS[BROKEN][1]].toLowerCase()} ne se parlent pas`,
  `proposition · 3 pistes · retenue : ${OPTIONS[CHOSEN].toLowerCase()}`,
  `implantation · lien posé · santé ${HEALTH.after} / 100`,
  "maintenance · suivi continu · alerte réglée avant le blocage",
] as const;

export function createToolMap() {
  const steps = new StepController(STATES, 0.7);
  return { steps, readout: (i: number, phase = 0) => (i === 4 ? MAINTENANCE[phase] : READOUT[i]) };
}
