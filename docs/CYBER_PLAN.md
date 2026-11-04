# Bump Cyber — plan d'implémentation

But : livrer un parcours d'audit Cyber privé vérifiable à partir de Bump OS.
Spécification : cahier des charges utilisateur et [architecture](CYBER_ARCHITECTURE.md).
Exécution native dans cette session ; décisions réversibles déléguées par l'utilisateur.
- [x] Lire instructions, README, architecture, roadmap, Loi25, opérations,
  apps/packages/tests/workflows/Compose et les branches métier existantes.
- [ ] Réconcilier la base #12 avec main, sans modifier website ni SQL appliqué.
  Tester installation, typage, unités, migrations/RLS, jobs, S3 et Loi25 E2E.
- [ ] Créer la PR de réconciliation, obtenir ses résultats Actions et demander
  la revue Codex disponible avant de commencer les changements dépendants.
- [ ] Ajouter contrats/tableaux Cyber avec clés tenant, historique et contraintes.
  Tester refus cross-tenant, mandat expiré/exclu, séparation Loi25 et doublons.
- [ ] Ajouter les adaptateurs structurés et le runner Docker borné. Tester
  injection, liens symboliques, limites, erreurs, annulation, reprise et secrets.
- [ ] Normaliser les sorties réelles, dédupliquer par composant/CVE/règle/version,
  distinguer sévérité/confiance/risque, et imposer la validation humaine.
- [ ] Ajouter remédiations, retests et comparaison sensible à la couverture.
- [ ] Ajouter le parcours FR/EN privé et rapport approuvé HTML/PDF ; E2E
  synthétique création → mandat → analyse → revue → remédiation → rapport.
- [ ] Documenter outils/licences/versions, exploitation, coûts, limites et résultats
  réels ; ouvrir les PR découpées sans fusion ni déploiement.

Points de revue : données importées hostiles, frontières interclients, changement
de mandat pendant un job, stockage/exports de secrets et interprétation abusive
de l'absence de résultats. Chaque point doit avoir un test négatif.
