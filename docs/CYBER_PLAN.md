# Bump Cyber — plan d'implémentation

But : livrer un parcours d'audit Cyber privé vérifiable à partir de Bump OS.
Spécification : cahier des charges utilisateur et [architecture](CYBER_ARCHITECTURE.md).
État au 5 novembre 2026 : le code réuni `72ecd41` est vérifié localement et
par les contrôles intégrés GitHub : 327 unités, 198 intégrations, 8 scénarios
natifs réels et 3 Chromium. Les preuves exactes sont dans
[CYBER_VALIDATION.md](CYBER_VALIDATION.md). Les ajouts documentaires suivants
ne changent pas ce code. Le runner local sans cgroups refuse les scanners
natifs ; leurs preuves viennent du runner Linux conforme.

## Implémentations réalisées

- [x] Lire instructions, README, architecture, roadmap, Loi 25, opérations,
  apps/packages/tests/workflows/Compose et les branches métier existantes.
- [x] Réconcilier la base #12 avec la fondation, sans modifier website ni SQL
  historique, puis vérifier migrations/RLS, jobs, S3 et régression Loi 25.
- [x] Ouvrir les lots de PR [#38](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/38)
  à [#42](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/42), avec les preuves
  de leurs versions testées et les corrections issues des revues.
- [x] Ajouter contrats et tables Cyber, clés tenant/client, historique et
  contraintes ; tester refus inter-organisations, mandats et doublons.
- [x] Ajouter les adaptateurs Semgrep/Trivy/Gitleaks, les imports JSON/SARIF et le
  connecteur passif optionnel ; borner le runner et refuser l’isolation absente.
- [x] Normaliser les sorties, dédupliquer par composant/CVE/règle/version,
  distinguer sévérité/confiance/risque, et imposer la validation humaine.
- [x] Ajouter remédiations, retests et comparaison sensible à la couverture,
  en distinguant « non observé » de « corrigé ».
- [x] Ajouter rapports HTML/PDF privés approuvés, preuve historique et résolution
  des constats clôturés, sans réécriture des snapshots antérieurs.
- [x] Ajouter le parcours privé FR/EN, paramètres de rôles/MFA et E2E synthétique
  création → mandat → analyse → revue → remédiation → rapport.
- [x] Implémenter TOTP Better Auth, codes de récupération et migration `0008`,
  sans prétendre à une politique MFA obligatoire ou à un bootstrap de production.
- [x] Implémenter dans `072ccc4` l’inventaire réel de couverture Trivy, le délai
  interne au conteneur et les retests renforcés issus de `041faad`.
- [x] Documenter versions/licences, Docker, exploitation/arrêt, coûts, limites,
  mesures de sécurité et outils seulement prévus ; [matrice des 16 livrables](CYBER_DELIVERY.md).

## Validation du MVP

- [x] Exécuter les huit scénarios natifs dans l’environnement Linux conforme,
  y compris retests positif/négatif et arrêt après SIGKILL du contrôleur.
- [x] Réunir les corrections domaine/scanners/reporting/interface et vérifier
  les tests unitaires, services réels, Chromium, Compose, dépendances et secrets.
- [x] Déclencher CodeQL et Dependency Review avec la PR de validation intégrée
  [#43](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/43) vers main.
- [x] Traiter les constats justifiés des revues Codex avec régressions ; la revue
  intégrée du code `72ecd41` ne signale plus de constat.
- [x] Fournir les 16 livrables et distinguer capacités fonctionnelles, limites
  matérielles et préalables avant données client réelles.

Les statuts courants de chaque tête de PR restent à relire avant intégration.
Aucune PR n’est fusionnée automatiquement ; ce MVP validé en laboratoire ne
constitue pas une autorisation de déploiement ou de scan client.

## Hors périmètre livré

- [ ] Scanners actifs/authentifiés/cloud et CredentialReferences, nouveaux moteurs
  avancés, gros imports et portail client : chaque capacité exige son propre lot.
- [ ] Politique MFA obligatoire, comptes initiaux et récupération de production,
  Access/IdP éventuel et HTTPS : configuration et acceptation d’infrastructure.
- [ ] Rotation de clés, restaurations testées, purge planifiée et archivage/effacement
  des rapports, historiques et sauvegardes avant données client réelles.
- [ ] Autorisation explicite et revue indépendante avant un déploiement ou un
  contrôle réseau client. Aucun déploiement Cyber en production n’a été réalisé.

Points de revue : données importées hostiles, frontières interclients, changement
de mandat pendant un job, stockage/exports de secrets et interprétation abusive
de l'absence de résultats. Les tests négatifs restent nécessaires à chaque
évolution de ces frontières ; une ancienne réussite ne certifie pas un nouveau profil.
