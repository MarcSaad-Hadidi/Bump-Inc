// Modèle pur du coffre-fort « Security Engine ». Neuf étapes, six domaines (un tiroir chacun),
// un risque fictif trouvé, corrélé, corrigé, puis le coffre se referme. La vue ne fait que lire cet état.
import { StepController } from "../shared/controller";

export const STATES = ["initialisation", "activation", "analyse", "resultats", "correlation", "detection", "recommandation", "correction", "protection"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = {
  initialisation: "initialisation", activation: "activation des domaines", analyse: "analyse en cours", resultats: "résultats partiels",
  correlation: "corrélation", detection: "détection d'un risque", recommandation: "recommandation", correction: "correction illustrative", protection: "protection renforcée",
};

/** Ordre des tiroirs : de haut en bas, gauche puis droite. */
export const DOMAINS = [
  { id: "applications", label: "Applications", short: "Applis" },
  { id: "infrastructures", label: "Infrastructures", short: "Infra" },
  { id: "reseaux", label: "Réseaux", short: "Réseaux" },
  { id: "donnees", label: "Données & accès", short: "Données" },
  { id: "utilisateurs", label: "Utilisateurs", short: "Usagers" },
  { id: "externes", label: "Services externes", short: "Externes" },
] as const;
export const RISK = 3; // Données & accès : un compte de service a accès à tout (scénario fictif)
export const LINKED = 0; // Applications : l'application qui utilise ce compte
export const FINDING = "Compte de service « app-sync » : accès en écriture à tous les dossiers";
export const PLAN = ["Réduire les permissions", "Appliquer le correctif", "Vérifier la configuration", "Confirmer le résultat"] as const;

export type Status = "eteint" | "actif" | "conforme" | "examiner" | "correle" | "risque" | "corrige";
export const STATUS_LABEL: Record<Status, string> = { eteint: "hors tension", actif: "actif", conforme: "conforme", examiner: "à examiner", correle: "risque commun", risque: "risque détecté", corrige: "corrigé" };

const at = (id: StateId) => STATES.indexOf(id);

/** État de chaque domaine à une étape donnée. */
export function statusesAt(index: number): Status[] {
  return DOMAINS.map((_, i) => {
    if (index < at("activation")) return "eteint";
    if (index < at("resultats")) return "actif";
    if (i === RISK) {
      if (index >= at("correction")) return "corrige";
      if (index >= at("detection")) return "risque";
      if (index === at("correlation")) return "correle";
      return "examiner";
    }
    if (i === LINKED && index === at("correlation")) return "correle";
    return "conforme";
  });
}

/** Actions du plan : 0 = pas encore proposée, 1 = proposée, 2 = faite. */
export function planAt(index: number): number[] {
  return PLAN.map(() => (index >= at("correction") ? 2 : index >= at("recommandation") ? 1 : 0));
}

export function createSecurityEngine() {
  const steps = new StepController(STATES, 0.85);
  return {
    steps,
    statuses: () => statusesAt(steps.get().index),
    /** Lire l'état d'un domaine (clic sur son tiroir). */
    inspect(i: number) {
      const s = statusesAt(steps.get().index)[i];
      return `${DOMAINS[i].label} : ${STATUS_LABEL[s]}`;
    },
    readout() {
      const s = steps.get();
      const st = statusesAt(s.index);
      const ok = st.filter((x) => x === "conforme" || x === "corrige").length;
      switch (s.id) {
        case "initialisation": return "noyau activé · coffre fermé";
        case "activation": return "6 domaines actifs";
        case "analyse": return "analyse des 6 domaines en cours";
        case "resultats": return `${ok} conformes · 1 à examiner`;
        case "correlation": return "Applications × Données & accès : risque commun";
        case "detection": return "risque : permissions trop larges (fictif)";
        case "recommandation": return `plan de correction · ${PLAN.length} actions`;
        case "correction": return "Données & accès : corrigé après vérification";
        default: return "Périmètre maîtrisé — Suivi continu activé";
      }
    },
  };
}
