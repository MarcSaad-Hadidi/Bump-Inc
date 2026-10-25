// Modèle pur du banc optique « Notre vision ». La lumière vient des besoins réels des entreprises ;
// elle passe de la dispersion (complexité) à l'alignement puis à la cohérence, et un prisme la
// répartit vers trois pistes de recherche. Aucune n'est disponible : ce sont des directions de R&D.
import { StepController } from "../shared/controller";

export const STATES = ["complexite", "alignement", "coherence", "pistes"] as const;
export type StateId = (typeof STATES)[number];
export const STATE_LABEL: Record<StateId, string> = { complexite: "complexité", alignement: "alignement", coherence: "cohérence", pistes: "trois pistes" };

/** Besoins rencontrés sur le terrain : ce sont eux qui alimentent la source. Exemples fictifs. */
export const NEEDS = ["Factures saisies à la main", "Outils qui ne se parlent pas", "Logiciel vieillissant", "Accès trop larges", "Données éparpillées"] as const;

export const STATUS = "En recherche · pas disponible · sans date de lancement";
export const PISTES = [
  { id: "workflow", label: "Workflow AI", role: "analyse des processus et accompagnement de leur automatisation", shows: "observer les opérations, comprendre les processus, relier les outils", needs: [0, 1] },
  { id: "developer", label: "Developer AI", role: "assistance au développement et à l'évolution des logiciels", shows: "comprendre les besoins, aider à construire, faire évoluer les systèmes", needs: [2, 4] },
  { id: "cyber", label: "Cyber AI", role: "accompagnement d'activités de cybersécurité autorisées", shows: "structurer les constats, accompagner les corrections, suivre les mesures", needs: [3] },
] as const;

/** Chaque besoin nourrit au moins une piste : rien n'est inventé hors du terrain. */
export const fedBy = (need: number) => PISTES.filter((p) => (p.needs as readonly number[]).includes(need)).map((p) => p.id);

export function createVision() {
  const steps = new StepController(STATES, 0.6);
  return {
    steps,
    /** Fiche d'une piste (clic sur sa cloche). */
    inspect(i: number) {
      const p = PISTES[i];
      return `${p.label} · ${p.shows} · en recherche`;
    },
    readout(focus: number | null = null) {
      const s = steps.get();
      switch (s.id) {
        case "complexite": return `${NEEDS.length} besoins réels · lumière dispersée`;
        case "alignement": return "alignement · 2 lentilles, 1 fente";
        case "coherence": return "faisceau cohérent · une seule direction";
        default: { if (focus === null) return "3 pistes de recherche · aucune date de lancement"; const n = PISTES[focus].needs.length; return `${PISTES[focus].label} · née de ${n} besoin${n > 1 ? "s" : ""} réel${n > 1 ? "s" : ""} · en recherche`; }
      }
    },
  };
}
