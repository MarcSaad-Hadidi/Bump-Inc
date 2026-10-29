// Page « Expertises » : le bon levier, au bon endroit. Un wagon (votre besoin) arrive à l'aiguillage
// Bump, qui l'envoie vers l'expertise qui convient. Quatre situations de départ, quatre voies.
import { StepController } from "../shared/controller";

export const STATES = ["repetitif", "information", "logiciel", "acces"] as const;
export type StateId = (typeof STATES)[number];
export const ROUTES = [
  { situation: "tâches répétitives", expertise: "automatisation des processus", station: "AUTOMATISATION" },
  { situation: "information difficile à trouver", expertise: "intégration IA ciblée", station: "INTÉGRATION IA" },
  { situation: "logiciel qui ne suit plus", expertise: "logiciel sur mesure", station: "LOGICIEL" },
  { situation: "accès à contrôler", expertise: "audit de cybersécurité autorisé", station: "CYBERSÉCURITÉ" },
] as const;
export const STATE_LABEL: Record<StateId, string> = { repetitif: ROUTES[0].situation, information: ROUTES[1].situation, logiciel: ROUTES[2].situation, acces: ROUTES[3].situation };
export const READOUT = ROUTES.map((r) => `${r.situation} → ${r.expertise}`);
export const BUTTONS = ["Tâches répétitives", "Information introuvable", "Logiciel dépassé", "Accès à contrôler"] as const;

export function createSwitchyard() {
  const steps = new StepController(STATES, 0.7);
  return { steps, readout: (i: number) => READOUT[i] };
}
