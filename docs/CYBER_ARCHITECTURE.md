# Bump Cyber — architecture et état de livraison

Décision du 2026-11-04. Produit interne distinct du prototype Loi 25. Aucun
déploiement, client réel, abonnement ni scan externe autorisé par ce document.

## Inspection et réutilisation

`main` c220029 contient Next/React, Fastify, PostgreSQL/Drizzle, Redis/BullMQ,
le prototype Loi 25 et le site public. Les branches existantes livrent déjà
Better Auth, membres/organisations, RLS, mandats versionnés, outbox/jobs clôturés
par jetons de tentative, annulation/arrêt d'urgence et ingestion privée.
La base retenue réconcilie `codex/audit-ingestion` 36f4bcb (PR #12, dépendances
#2/#3/#5) avec main. Les preuves historiques ne valent pas pour cette réunion.

Une deuxième base métier ou DefectDojo obligatoire dupliquerait les modules
existants. Des microservices de scanners ajouteraient trop d'exploitation.
Nous conservons le monolithe modulaire et des processus d'exécution séparés.

## Frontières

- `packages/identity` : Better Auth, vérification email, sessions et organisations.
- `packages/core` : contrôles serveur, mandats, orchestration et domaine Cyber.
- `packages/db` : données typées, SQL relu, rôle runtime non propriétaire, RLS.
- `packages/contracts` : validation stricte et observations canoniques.
- `apps/api` : routes authentifiées ; aucune commande utilisateur exécutée.
- `apps/worker` : jobs revalidés et connecteurs Docker hors control plane.
- `apps/web` : espace privé `/cyber`, FR/EN, proxy same-origin borné.
- Loi 25 : routes, tables, calculs et rapport existants conservés séparément.
- `website/` : aucun changement.

Le navigateur ne reçoit jamais de secret d'infrastructure. Les sources de code
sont des instantanés locaux préparés par l'opérateur, pas des URL de clone
arbitraires. Les scanners hors ligne n'ont aucun réseau, root ni socket Docker
dans leur conteneur. Le processus opérateur qui accède à Docker est privilégié :
il doit rester sur une machine dédiée de confiance. Les tests publics passifs
doivent résoudre et épingler uniquement des adresses publiques, revalider chaque
destination et refuser les redirections hors périmètre.

## Sécurité et données

Chaque accès passe par une session et `withTenant`. Les références de mandat
restent versionnées ; leur validité et l'appartenance sont vérifiées au lancement,
à la prise du job, pendant l'exécution et avant la sauvegarde. Alerte automatique
et vulnérabilité confirmée sont deux états différents. Le rapport publié est un
instantané revu humainement ; un résultat absent d'un retest incomplet ne clôture
aucun constat. Aucune mesure fictive ni progression inventée.

Les migrations SQL de main et des branches sont conservées octet pour octet.
Le journal ajoute la lignée de sécurité après Loi 25 pour permettre l'upgrade de
main. Les bases déjà migrées depuis une branche PR02–05 doivent être détectées
avant migration ; pas de réexécution silencieuse d'un CREATE existant. Les
snapshots Drizzle historiques ne constituent pas un schéma final à regénérer.

## Livraisons et vérification

1. Réconciliation de la base vérifiée ; migrations neuves et upgrade main,
   régressions Loi 25, identité/RLS/jobs/imports réels.
2. Domaine Cyber : clients, actifs, mandat enrichi, observations/constats,
   preuves minimisées, risque explicable, validation/remédiation/retests.
3. Connecteurs Semgrep/Trivy/Gitleaks, JSON/SARIF et contrôles Web passifs :
   exécution isolée, erreurs, annulation, périmètre et tests synthétiques.
4. Interface privée et rapports FR/EN, comparaison tenant/périmètre et PDF.

Chaque PR reste draft tant qu'une exigence ou une vérification requise manque.
Pas de fusion automatique. Cloudflare Access/Tunnel peut protéger la passerelle
ultérieurement ; aucun scanner natif dans Workers. R2 est facultatif : stockage
local privé initial et chiffrement/clé opérateur pour les preuves Cyber.

## Budget et blocages production

Logiciels auto-hébergés ; aucun abonnement créé. Prévoir CPU/RAM/disque pour
PostgreSQL, Redis, scanners et leurs bases de vulnérabilités. Cloudflare n'est
pas requis en local. Production exige identité/MFA configurés, TLS, sauvegarde et
restauration testées, rétention opérationnelle, revue indépendante et autorisation
d'infrastructure. Les connecteurs avancés ne sont pas déclarés disponibles avant
leur validation réelle.
