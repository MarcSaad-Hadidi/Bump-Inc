// Modèle pur de la section « Bump » : un port de Montréal. Deux remorqueurs (les deux fondateurs)
// amènent un navire vide au quai d'une PME ; l'ancre fixe Montréal ; le chenal mène du Québec vers
// le large ; le navire est chargé de conteneurs de trois couleurs, une par service de Bump ; la
// capitainerie s'allume et le navire repart chargé. Message : la technologie doit donner de l'élan.
import { StepController } from "../shared/controller";

export const STATES = ["realite", "montreal", "horizons", "besoin", "projet"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = {
  realite: "proches de votre réalité",
  montreal: "ancrés à Montréal",
  horizons: "de nouveaux horizons",
  besoin: "partons de votre besoin",
  projet: "parlons de votre projet",
};

export const MESSAGE = "La technologie doit vous donner de l'élan.";

/** Ce que Bump regarde d'abord dans l'entrepôt de la PME (étape 1). */
export const REALITY = ["outils", "équipes", "opérations", "contraintes"] as const;

/** Trois couleurs de conteneurs, une par service de Bump, chacune née d'un besoin concret (étape 4). */
export const NEEDS = [
  { id: "processus", color: "laiton", service: "Automatisation", label: "Un processus difficile à suivre", tag: "Automatisation" },
  { id: "outil", color: "vert", service: "Logiciel sur mesure", label: "Un outil manquant", tag: "Logiciel sur mesure" },
  { id: "securite", color: "rouge", service: "Cybersécurité", label: "Une question de sécurité", tag: "Cybersécurité" },
] as const;

/** Chargement : deux conteneurs par couleur, dans cet ordre. */
export const CARGO = [0, 0, 1, 1, 2, 2] as const;

/** Ancrage actuel et ambition : à ne pas confondre (étape 3). */
export const REACH = { today: "PME du Québec", tomorrow: "au-delà des frontières" } as const;

/** Ce que le visiteur décrit pour commencer (étape 5). */
export const BRIEF = ["besoin", "enjeux", "résultat visé"] as const;

export function createPort() {
  const steps = new StepController(STATES, 0.7);
  return {
    steps,
    /** Fiche d'une couleur (clic sur un conteneur). */
    inspect(i: number) {
      return `${NEEDS[i].service} · pour ${NEEDS[i].label.toLowerCase()}`;
    },
    readout(focus: number | null = null) {
      switch (steps.get().id) {
        case "realite": return `2 fondateurs · ${REALITY.join(", ")}`;
        case "montreal": return "ancrés à Montréal · née au Québec";
        case "horizons": return `aujourd'hui : ${REACH.today} · demain : ${REACH.tomorrow}`;
        case "besoin": return focus === null ? `navire chargé · ${NEEDS.map((n) => n.service.toLowerCase()).join(", ")}` : this.inspect(focus);
        default: return `parlons de votre projet · ${BRIEF.join(", ")}`;
      }
    },
  };
}
