// Notes describe substantive changes made on 2026-10-27. Do not roll these
// dates forward merely because a build or deployment runs.
export const revisions = {
  home: {
    fr: ['Ajout d’une lecture des processus et des contrôles à conserver.', 'Présentation des cinq étapes du mandat et des liens vers les expertises.'],
    en: ['Added a readable overview of processes and controls to retain.', 'Presented the five engagement stages and links to the service guides.'],
  },
  expertise: {
    fr: ['Précision du choix entre automatisation, IA, logiciel et cybersécurité.', 'Ajout de l’attribution et de la méthode de révision des informations.'],
    en: ['Clarified the choice between automation, AI, software and cybersecurity.', 'Added publisher attribution and the content review approach.'],
  },
  workflow: {
    fr: ['Ajout d’une grille pour choisir un premier workflow.', 'Ajout d’un calcul de charge manuelle avec des hypothèses modifiables.'],
    en: ['Added a checklist for choosing a first workflow.', 'Added a manual workload calculation with editable assumptions.'],
  },
  ai: {
    fr: ['Ajout de cinq cas d’essai : données manquantes, sources, accès, approbation et reprise.', 'Précision des critères de validation avant mise en service.'],
    en: ['Added five test cases covering missing data, sources, access, approval and recovery.', 'Clarified validation criteria before launch.'],
  },
  software: {
    fr: ['Ajout des points à valider avant la mise en service.', 'Précision des responsabilités à convenir pour la maintenance.'],
    en: ['Added checks to complete before launch.', 'Clarified maintenance responsibilities to agree on.'],
  },
  security: {
    fr: ['Ajout d’une grille de préparation d’un audit autorisé.', 'Précision du périmètre, des limites et du suivi des corrections.'],
    en: ['Added an authorized-audit preparation checklist.', 'Clarified scope, limits and remediation follow-up.'],
  },
  approach: {
    fr: ['Précision des éléments à convenir avant l’implantation.', 'Ajout des livrables et des décisions attendus aux cinq étapes.'],
    en: ['Clarified what to agree on before implementation.', 'Added deliverables and decisions for each of the five stages.'],
  },
  about: {
    fr: ['Ajout de la méthode éditoriale et des limites des démonstrations.', 'Lien vers le code public de la vitrine comme référence vérifiable.'],
    en: ['Added the editorial approach and demonstration boundaries.', 'Linked the public website source as a verifiable reference.'],
  },
  faq: {
    fr: ['Ajout d’une grille pour préparer une première discussion.', 'Précision des informations utiles et de celles à ne pas transmettre.'],
    en: ['Added a checklist for preparing a first conversation.', 'Clarified useful information and what should not be shared.'],
  },
};

export const publisherBio = locale => locale === 'en'
  ? 'Bump is a technology consulting company founded by two entrepreneurs in Montréal. Its services connect workflow optimization, AI and software development, and cybersecurity for SMEs.'
  : 'Bump est une entreprise de consultation technologique fondée par deux entrepreneurs à Montréal. Ses services relient optimisation des processus, IA et développement logiciel, et cybersécurité pour les PME.';
