// Modèle pur du laboratoire de calibration « Notre méthode » : un système (rotor) tourne mal,
// on le mesure, on trouve la cause, on compare trois réglages, on pose le meilleur, puis on suit.
import { StepController } from "../shared/controller";

export const STATES = ["audit", "analyse", "proposition", "implantation", "maintenance"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = { audit: "audit", analyse: "analyse", proposition: "proposition", implantation: "implantation", maintenance: "maintenance" };
export const STEP_TEXT: Record<StateId, string> = {
  audit: "Comprendre les besoins, les outils existants et les contraintes.",
  analyse: "Examiner les informations, identifier les problèmes et leurs causes.",
  proposition: "Définir une solution adaptée et un plan de réalisation clair.",
  implantation: "Mettre en place la solution, l'intégrer et vérifier son fonctionnement.",
  maintenance: "Assurer le suivi, ajuster et faire évoluer la solution.",
};

/** Vibration mesurée (mm/s) avant correction, et vibration prévue pour chaque réglage essayé. Valeurs fictives. */
export const MEASURED = 3.2;
export const SETTINGS = [
  { id: "A", label: "Réglage A", vibration: 2.1 },
  { id: "B", label: "Réglage B", vibration: 1.2 },
  { id: "C", label: "Réglage C", vibration: 0.4 },
] as const;
export type SettingId = (typeof SETTINGS)[number]["id"];
export const BEST: SettingId = [...SETTINGS].sort((a, b) => a.vibration - b.vibration)[0].id;
export const LIMIT = 1.0; // seuil acceptable
export const LOG = ["J+0   calibré 0,4", "J+7   contrôle OK", "J+14  dérive → ajusté", "J+21  contrôle OK", "J+28  contrôle OK"] as const;

const at = (id: StateId) => STATES.indexOf(id);

export function createLab() {
  const steps = new StepController(STATES, 0.8);
  const state = { trial: null as SettingId | null };
  const vibration = () => {
    const i = steps.get().index;
    if (i >= at("implantation")) return SETTINGS.find((s) => s.id === BEST)!.vibration;
    if (i === at("proposition") && state.trial) return SETTINGS.find((s) => s.id === state.trial)!.vibration;
    return MEASURED;
  };
  return {
    steps,
    state,
    vibration,
    /** Essayer un réglage : seulement pendant la proposition. */
    tryTrial(id: SettingId) {
      if (steps.get().index !== at("proposition")) return false;
      state.trial = id;
      return true;
    },
    readout() {
      const s = steps.get();
      const v = vibration().toFixed(1).replace(".", ",");
      switch (s.id) {
        case "audit": return `vibration ${v} mm/s · seuil ${LIMIT.toFixed(1).replace(".", ",")}`;
        case "analyse": return "cause : masse mal placée sur le rotor";
        case "proposition": return state.trial ? `essai ${state.trial} · ${v} mm/s prévu${state.trial === BEST ? " · retenu" : ""}` : `3 réglages comparés · ${BEST} retenu`;
        case "implantation": return `contrepoids posé · ${v} mm/s · vérifié`;
        default: return "suivi continu · ajustements au besoin";
      }
    },
  };
}
