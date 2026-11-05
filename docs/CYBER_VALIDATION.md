# Bump Cyber — preuves de validation

## Version fonctionnelle vérifiée — 5 novembre 2026

Référence du code : [`72ecd41`](https://github.com/MarcSaad-Hadidi/Bump-Inc/commit/72ecd413533a99858b02aa4d87ab8325a9e6c45f).
Les résultats ci-dessous ont été lus dans les sorties réelles du
[job intégré quality](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943129181/job/126968628516),
et dans les suites locales de cette même version. Les décomptes couvrent le
workspace, dont la fondation et la régression Loi 25 ; ce ne sont pas des
résultats d’audit client. Les commits de documentation suivants ne changent pas
le code fonctionnel ; leurs contrôles courants figurent dans les
[checks de #42](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/42/checks) et
[checks intégrés de #43](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/43/checks).

| Contrôle                     | Résultat réel                                                                    | Preuve et portée                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                 | Réussi : **327 tests unitaires**, 34 fichiers, lint, TypeScript strict et builds | Job quality ci-dessus et exécution locale                                                                                                                                                                      |
| `pnpm test:integration`      | **198/198**, 22 fichiers                                                         | PostgreSQL 17 non propriétaire, Redis 7, S3 SeaweedFS réels ; environnements isolés                                                                                                                            |
| `pnpm test:scanners`         | **8/8 scénarios natifs réels**                                                   | Linux avec CPU/mémoire/swap/PID/seccomp/init appliqués ; images officielles épinglées                                                                                                                          |
| `pnpm test:e2e`              | **3/3 Chromium**                                                                 | Diagnostics, régression Loi 25 et parcours privé Cyber FR/EN/mobile ; 22,3s en CI, 19,2s sur le dernier laboratoire local                                                                                      |
| Compose avec extension Cyber | Build et parcours réel réussis                                                   | [Job Compose](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943129181/job/126968628208) : SMTP, sessions, mandats, worker, import chiffré, revue humaine, approbation et PDF avec police déployée |
| CodeQL                       | Analyses JavaScript/TypeScript, Python et Actions réussies                       | [Exécution CodeQL](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943126033) ; contrôle CodeQL réussi                                                                                              |
| Dépendances                  | Aucune vulnérabilité connue signalée par `pnpm audit`; Dependency Review réussi  | [Dependency Review](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943129172)                                                                                                                      |
| Secrets                      | Gitleaks CI réussi                                                               | [Job secrets](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943129181/job/126968628432) ; aucune donnée client réelle dans les fixtures                                                           |
| Site public                  | Build, tests, audit et smoke Docker réussis ; aucun fichier `website/` modifié   | [Job public-site](https://github.com/MarcSaad-Hadidi/Bump-Inc/actions/runs/41943129181/job/126968628513)                                                                                                       |
| Revue Codex                  | Revue de `72ecd41` terminée sans constat nouveau ni non résolu signalé           | [PR43](https://github.com/MarcSaad-Hadidi/Bump-Inc/pull/43) ; corrections et régressions discutées dans les lots dépendants                                                                                    |

## Ce que les tests établissent

Les huit scénarios natifs exécutent réellement Semgrep 1.183.0, Trivy 0.76.1 et
Gitleaks 8.30.1, sans réseau, sur des fichiers de laboratoire synthétiques. Ils
vérifient les sorties normalisées, les valeurs de secrets masquées, la perte
réelle d’un paquet Trivy après remplacement d’un pin Python par une contrainte,
les contrôles PASS exclus des alertes, l’annulation et un conteneur ignorant
SIGTERM. Le scénario de queue effectue une revue, une action de remédiation,
un nouveau scan Semgrep encore positif enregistré `present`, puis un scan
corrigé enregistré `absent`. Un autre scénario tue le contrôleur Node par
SIGKILL et vérifie l’arrêt indépendant du conteneur.

Les tests de service exercent mandats expirés/révoqués/hors périmètre,
permissions actuelles, RLS/interclients, idempotence, leases, annulation,
chiffrement/rétention, normalisation, retests et rapports privés. Les régressions
PostgreSQL reproduisent les conflits de verrous et les preuves historiques
obsolètes avant correction. La dernière référence native est choisie avant la
comparaison pour une absence ; un retest positif utilise sa référence
antérieure. L’historique persistant des résolutions protège aussi un cycle
rouvert. Les retests non concluants restent neutres.

Le parcours navigateur utilise Semgrep réel en CI Linux conforme. Il crée un
client, son actif et son mandat synthétiques, exige l’approbation, lance deux
audits par le worker, examine/confirme un constat, assigne une action, enregistre
un retest, génère et approuve un rapport, télécharge son PDF, teste FR/EN/mobile,
l’arrêt d’urgence, le refus hors périmètre, la comparaison, les accès depuis une
autre organisation et le refus après déconnexion. Les tests d’identité incluent
le TOTP Better Auth, les codes de récupération et la révocation des sessions.

Le PDF réel de l’E2E a été contrôlé visuellement et avec `pdfinfo`/`pdftotext` :
**5 pages A4**, accents lisibles, provenance historique explicite, aucune page
supplémentaire due aux pieds de page. Le format v1 conserve son digest ; les
nouveaux snapshots v2 conservent provenance et résolution.

Les contrôles passifs DNS/HTTPS utilisent des transports simulés et couvrent
adresses privées/mixtes, DNS rebinding, épinglage et redirections dangereuses.
Aucun domaine public ou client n’a été scanné. Aucun résultat importé n’est
présenté comme une exécution native.

## Limites et contrôles indisponibles

Le daemon local fourni ne peut pas appliquer les cgroups CPU/mémoire/swap/PID.
Les scanners natifs y restent indisponibles, sans fallback permissif. Le parcours
local utilise un import explicitement synthétique et conserve son retest
`inconclusive`, sans correction vérifiée. L’acceptation native provient du runner
Linux conforme ; ce blocage local ne peut pas être contourné par l’interface.

La lecture détaillée des alertes via l’API GitHub
`/repos/MarcSaad-Hadidi/Bump-Inc/code-scanning/alerts` a retourné **HTTP 403,
Resource not accessible by integration**, avec les permissions actuelles.
Aucun outil connecté ne fournit cette lecture supplémentaire. Les conclusions
des jobs et du contrôle CodeQL sont accessibles et réussies ; elles ne sont pas
présentées comme une preuve d’absence de toute vulnérabilité.

Les worktrees de test isolent **PostgreSQL et Redis ensemble** : partager Redis
`/1` ferait consommer les notifications par un autre worker. Les Redis temporaires
ont été retirés et les triggers/fonctions transitoires de concurrence nettoyés.
La limite HTTP 120/min n’a pas été relevée : le test natif qui l’atteignait a
révélé des lectures redondantes du dashboard ; leur suppression a fait passer
le même scénario, sans assouplissement des contrôles ni retry de contournement.

Aucune restauration de production, charge soutenue, passerelle Access/TLS/IdP,
politique MFA obligatoire ou rétention opérationnelle client n’est validée par
ces suites. Les préalables et capacités restantes figurent dans
[CYBER_DELIVERY.md](CYBER_DELIVERY.md) et [CYBER_OPERATIONS.md](CYBER_OPERATIONS.md).
Aucun déploiement Cyber en production ni aucune fusion automatique n’a eu lieu.

## Historique : réconciliation de la base, 2026-11-04

La section suivante conserve les preuves du lot de réconciliation initial.
Ses décomptes et son état « MVP à venir » décrivent ce lot, pas la livraison
intégrée ni les corrections récentes présentées ci-dessus.

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
barrel contracts (export navigateur Loi 25 dédié) ; migration faite avec un rôle
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

## Portée des preuves historiques de réconciliation

Ces résultats valident la base réconciliée, pas encore le MVP Cyber. Aucun client
réel, aucun scan de domaine public ni aucun déploiement Cyber en production n'a été réalisé.
