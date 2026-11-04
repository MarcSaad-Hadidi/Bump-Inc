# Bump Cyber — preuves de validation

## Réconciliation de la base, 2026-11-04

Compte GitHub vérifié : MarcSaad-Hadidi (shipping). Base main c220029 et branche
existante d'ingestion 36f4bcb. Aucun fichier de website modifié.
- `pnpm check` : lint, TypeScript strict, **202 tests unitaires**, builds réussis.
- `pnpm test:integration` : **122 tests réussis**, 16 fichiers, PostgreSQL 17,
  Redis 7 et S3 SeaweedFS réels. Inclut les deux migrations de lignées, leur
  rejeu idempotent et la préservation d'un rapport Loi 25 synthétique.
- `pnpm test:e2e` : **2 tests Chromium réussis**, diagnostic et parcours Loi 25
  avec éditions persistées, rapport et PDF synthétiques.
- `pnpm audit:dependencies` : aucune vulnérabilité connue signalée.
- Compose build, scan des secrets et GitHub Actions : à consigner après exécution.

Échecs corrigés : import de `node:net` serveur dans le bundle navigateur via le
barrel contracts (export navigateur Loi25 dédié) ; migration faite avec un rôle
runtime dans les anciens tests (URL opérateur séparée) ; bases de migrations
divergentes (réconciliation atomique par hash sous verrou PostgreSQL) ; lecture
S3 affichant un état terminé avec un compte antérieur à la transaction de fin
(une seule lecture jointe donne un instantané cohérent).

Les SQL historiques restent inchangés. Le journal conserve leurs timestamps
originaux et ordonne les membres manquants. Le migrateur compare les SHA-256,
refuse une migration inconnue et applique uniquement les hashes absents, dans
une transaction sérialisée. Un opérateur doit désormais utiliser ce migrateur,
pas directement le migrateur Drizzle fondé sur le seul timestamp maximal.

Les erreurs initiales d'environnement (cache pnpm non inscriptible, pnpm global
11 au lieu du 10 épinglé, base test absente) ont été corrigées localement sans
modifier les versions imposées ni supprimer de volume.

## Portée

Ces résultats valident la base réconciliée, pas encore le MVP Cyber. Aucun client
réel, aucun scan de domaine public ni aucun déploiement n'a été réalisé.
