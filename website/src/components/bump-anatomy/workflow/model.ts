// Modèle pur de la planche de flux : une demande traverse des cartes reliées, se ramifie en
// tâches automatiques puis attend la validation d'une personne. La vue ne fait que lire cet état.
import { StepController } from "../shared/controller";

export const STATES = ["reception", "qualification", "preparation", "validation", "transmission", "resultat"] as const;
export type StateId = (typeof STATES)[number];

export type Kind = "devis" | "facture" | "support";
export const KIND_LABEL: Record<Kind, string> = { devis: "demande de devis", facture: "facture fournisseur", support: "demande de support" };

export const STATE_LABEL: Record<StateId, string> = { reception: "réception", qualification: "qualification", preparation: "préparation", validation: "validation", transmission: "transmission", resultat: "résultat" };

/** Texte de chaque carte selon le type de demande (exemple fictif). */
export const CARDS: Record<Kind, Record<string, [string, string]>> = {
  devis: {
    client: ["Boulangerie Lavoie", "Client · formulaire web"],
    task: ["Demande de devis", "Tâche créée automatiquement"],
    a: ["Fiche client CRM", "Créée automatiquement"],
    b: ["Devis préparé", "Brouillon assisté par IA"],
    c: ["Équipe notifiée", "Message au canal ventes"],
    human: ["Validation", "Chargée de projet"],
    out: ["Devis envoyé", "Courriel au client, devis joint"],
  },
  facture: {
    client: ["Imprimerie Nord", "Fournisseur · par courriel"],
    task: ["Facture fournisseur", "Tâche créée automatiquement"],
    a: ["Écriture comptable", "Saisie automatiquement"],
    b: ["Paiement planifié", "Échéance calculée à 30 jours"],
    c: ["Pièce archivée", "Classée dans le dossier"],
    human: ["Validation", "Responsable des finances"],
    out: ["Paiement approuvé", "Virement programmé"],
  },
  support: {
    client: ["Clinique Saint-Denis", "Client · par courriel"],
    task: ["Demande de support", "Tâche créée automatiquement"],
    a: ["Ticket ouvert", "Priorité calculée"],
    b: ["Réponse proposée", "Brouillon assisté par IA"],
    c: ["Technicien assigné", "Selon la disponibilité"],
    human: ["Validation", "Technicien responsable"],
    out: ["Réponse envoyée", "Ticket mis à jour"],
  },
};

export type Decision = "pending" | "accept" | "refuse";

export function createWorkflow(kind: Kind = "devis") {
  const steps = new StepController(STATES, 0.7);
  const state = { kind, decision: "pending" as Decision, revisions: 0 };
  const VALIDATION = STATES.indexOf("validation");

  // Règle métier : rien ne passe la carte de validation tant que la personne n'a pas approuvé.
  steps.canEnter = (to, from) => !(from === VALIDATION && to > VALIDATION && state.decision !== "accept");

  return {
    steps,
    state,
    /** Introduire une nouvelle demande : la bille repart de la carte client. */
    insert(next: Kind) { state.kind = next; state.decision = "pending"; state.revisions = 0; steps.reset(); },
    accept() {
      if (steps.get().id !== "validation") return false;
      state.decision = "accept";
      return steps.next();
    },
    /** Refus : la bille repart vers les tâches automatiques pour une nouvelle version. */
    refuse() {
      if (steps.get().id !== "validation") return false;
      state.decision = "refuse";
      state.revisions++;
      steps.select("preparation");
      state.decision = "pending";
      return true;
    },
    readout() {
      const s = steps.get();
      const what = KIND_LABEL[state.kind];
      if (s.id === "validation") return `${what} · en attente de validation`;
      if (s.id === "resultat") return `${what} · transmise après validation${state.revisions ? ` (${state.revisions} révision${state.revisions > 1 ? "s" : ""})` : ""}`;
      return `${what} · ${STATE_LABEL[s.id]}`;
    },
  };
}
