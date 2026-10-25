// Modèle pur du train d'engrenages « Vos outils, un fonctionnement commun ».
// Cinq outils (engrenages) tournent chacun à leur rythme ; Bump répare celui qui est cassé,
// pose un adaptateur pour chacun, les engrène sur un moyeu commun, puis tout tourne ensemble.
// La vue ne fait que lire cet état : on peut retirer un adaptateur et voir l'outil décrocher.
import { StepController } from "../shared/controller";

export const STATES = ["isole", "repare", "adapte", "connecte", "synchronise", "unifie"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = { isole: "outils isolés", repare: "système réparé", adapte: "interface adaptée", connecte: "connexion établie", synchronise: "échange synchronisé", unifie: "écosystème unifié" };

/** Les outils du client. `own` : vitesse propre (tours/s) quand l'outil tourne seul (Excel : une fois réparé). */
export const TOOLS = [
  { id: "courriel", label: "Courriel", own: 0.16, version: 14 },
  { id: "crm", label: "CRM", own: -0.07, version: 9 },
  { id: "compta", label: "Comptabilité", own: 0.24, version: 11 },
  { id: "agenda", label: "Agenda", own: 0.05, version: 7 },
  { id: "excel", label: "Excel", own: 0.11, version: 3 },
] as const;
export const BROKEN = TOOLS.length - 1; // Excel : dents cassées tant que l'étape « réparé » n'est pas atteinte

const CONNECTED = STATES.indexOf("connecte");
const SYNCED = STATES.indexOf("synchronise");

export function createToolkit() {
  const steps = new StepController(STATES, 0.8);
  const state = { removed: new Set<number>() };

  /** L'outil i tourne-t-il avec le moyeu ? Il faut être connecté et avoir son adaptateur. */
  const connected = (i: number) => steps.get().index >= CONNECTED && !state.removed.has(i);
  const synced = () => TOOLS.map((_, i) => i).filter((i) => steps.get().index >= SYNCED && connected(i));

  return {
    steps,
    state,
    connected,
    synced,
    /** Retirer ou remettre l'adaptateur d'un outil (seulement une fois les adaptateurs posés). */
    toggleAdapter(i: number) {
      if (i < 0 || i >= TOOLS.length || steps.get().index < STATES.indexOf("adapte")) return false;
      if (state.removed.has(i)) state.removed.delete(i);
      else state.removed.add(i);
      return true;
    },
    reset() { state.removed.clear(); steps.reset(); },
    /** Version de la fiche client que chaque outil affiche : la même partout une fois synchronisé. */
    versions(turns: number) {
      const common = 15 + Math.max(0, Math.floor(turns));
      return TOOLS.map((t, i) => (synced().includes(i) ? common : t.version));
    },
    readout() {
      const s = steps.get();
      const out = [...state.removed].map((i) => TOOLS[i].label);
      if (s.index >= CONNECTED && out.length) return `${out.join(", ")} sans adaptateur · ${TOOLS.length - out.length} outils sur ${TOOLS.length} ensemble`;
      if (s.id === "isole") return "5 outils, 5 rythmes · Excel bloqué";
      if (s.id === "repare") return "Excel réparé · chacun tourne encore seul";
      if (s.id === "adapte") return "5 adaptateurs posés";
      if (s.id === "connecte") return "5 outils engrenés sur le moyeu";
      if (s.id === "synchronise") return "même fiche client dans les 5 outils";
      return "écosystème unifié · 1 rythme, 1 cadran";
    },
  };
}
