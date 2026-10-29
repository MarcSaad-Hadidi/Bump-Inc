// Page « Développement logiciel » : une demande, un responsable, un état visible. Un ticket traverse
// les colonnes d'un tableau, un responsable s'y attache, et le CRM est mis à jour à la fin.
import { StepController } from "../shared/controller";

export const STATES = ["recue", "attribuee", "en-cours", "terminee"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = { recue: "demande reçue", attribuee: "un responsable", "en-cours": "état visible", terminee: "terminée" };
export const COLUMNS = ["REÇUE", "ATTRIBUÉE", "EN COURS", "TERMINÉE"] as const;
export const TICKET = "D-024";
export const READOUT = [
  `une demande arrive · ${TICKET} · reçue au bon endroit`,
  "un responsable · une seule prochaine action",
  "un état visible · toute l'équipe sait où en est la demande",
  "terminée · le CRM est mis à jour automatiquement",
] as const;
export const BUTTONS = ["01 Demande", "02 Responsable", "03 Suivi", "04 Terminée"] as const;

export function createBoard() {
  const steps = new StepController(STATES, 0.7);
  return { steps, readout: (i: number) => READOUT[i] };
}
