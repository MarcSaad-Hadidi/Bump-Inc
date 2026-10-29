// Page « Intégration IA » : une tâche précise, les bonnes informations, une décision qui reste à
// l'équipe. L'assistant puise dans les sources autorisées (un tiroir verrouillé reste fermé), rédige
// une synthèse reliée à ses sources, et l'équipe la valide.
import { StepController } from "../shared/controller";

export const STATES = ["tache", "sources", "synthese", "decision"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = { tache: "une tâche précise", sources: "les bonnes sources", synthese: "une synthèse expliquée", decision: "votre équipe décide" };
export const SOURCES = ["DOCUMENTS", "CRM", "ERP"] as const;
export const READOUT = [
  "une tâche précise · résumer un dossier client",
  "les bonnes sources · documents, CRM, ERP · accès respectés",
  "une synthèse expliquée · chaque point relié à sa source",
  "votre équipe décide · valider, modifier ou refuser",
] as const;
export const BUTTONS = ["01 Tâche", "02 Sources", "03 Synthèse", "04 Décision"] as const;

export function createAssistant() {
  const steps = new StepController(STATES, 0.7);
  return { steps, readout: (i: number) => READOUT[i] };
}
