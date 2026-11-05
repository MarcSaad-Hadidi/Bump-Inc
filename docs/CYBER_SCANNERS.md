# Connecteurs Bump Cyber

Ce lot dépend du domaine #39 (`ba130a7`) et de la base #38. Il n'autorise aucun
scan de client réel ni déploiement. Les moteurs avancés ne sont pas implémentés.

## Outils choisis et licences vérifiées

Métadonnées de release et fichiers LICENSE officiels consultés le 2026-11-04.
Les licences permettent l'utilisation commerciale des trois moteurs retenus,
avec leurs obligations de notices/source lors d'une éventuelle redistribution.
Nous référençons les images officielles, sans modifier ni redistribuer leur code.
Aucune fonction SaaS payante ni connexion au service cloud Semgrep n'est utilisée.

| Moteur                                                    | Version du lot | Licence du dépôt | Couverture réelle du connecteur                                                                                                                                        |
| --------------------------------------------------------- | -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Semgrep](https://github.com/semgrep/semgrep)             | 1.183.0        | LGPL-2.1         | Trois règles locales révisées : eval Python/JS et shell Python. Aucun pack de règles distant. Couverture volontairement limitée, aucune conclusion d'exploitation.     |
| [Trivy](https://github.com/aquasecurity/trivy)            | 0.76.1         | Apache-2.0       | Vulnérabilités de dépendances et mauvaises configurations des fichiers téléversés ; CVE, versions affectées/corrigées, CVSS et références disponibles.                 |
| [Gitleaks](https://github.com/gitleaks/gitleaks)          | 8.30.1         | MIT              | Répertoire de fichiers, configuration de règles par défaut épinglée, rédaction native à 100 % et projection sans Secret/Match/snippets/auteur.                         |
| [Betterleaks](https://github.com/betterleaks/betterleaks) | 1.9.0 observée | MIT              | Étudié, non installé. Projet maintenu du même auteur, évolutions plus récentes ; Gitleaks conserve la continuité avec l'outillage du dépôt pour ce premier adaptateur. |

Les digests des images sont inscrits dans `apps/worker/src/cyber/registry.ts`.
Ne remplacez pas un digest sans vérifier release, licence, vulnérabilités et tests.
Les conditions des règles et des bases d'avis restent distinctes de la licence
du moteur. Les règles Semgrep de ce lot sont locales ; aucune licence d'un pack
commercial n'est implicitement acquise.

## Contrat et confinement

`ScannerAdapter` expose validation, préparation, exécution, parsing,
normalisation, collecte de preuve et nettoyage. Les seuls paramètres sont les
profils révisés : aucun shell, binaire, argument ou image venant de l'utilisateur.
Le runner produit un argv structuré avec `spawn(..., shell: false)`.

Chaque conteneur : image épinglée, pull interdit au lancement, utilisateur
65534, système de fichiers en lecture seule, code et règles montés en lecture
seule, aucun réseau, aucune capability, no-new-privileges, seccomp du daemon,
128 processus, 1 CPU, 1536 Mio, pas de swap supplémentaire, fichiers ouverts
bornés, core dumps interdits et tmpfs de 128 Mio. Il ne reçoit ni clé de coffre,
ni session, ni credentials, ni socket Docker ; les variables de proxy sont vidées.
Le processus opérateur ayant accès au daemon Docker reste un composant privilégié
à maintenir sur une machine de confiance dédiée.

Le daemon doit déclarer la prise en charge effective des limites mémoire/CPU/PID.
Sans ces capacités, les moteurs natifs sont **indisponibles**. Le runner local
fourni à cette session est rootless sans cgroups utilisables : l'acceptation native
y est bloquée, sans fallback permissif. Les tests natifs sont obligatoires en CI
Linux via `pnpm test:scanners` et ne sont pas remplacés par des fixtures.
`pnpm cyber:doctor` expose uniquement les capacités mémoire/swap/CPU/PID/seccomp
et l’état des images, sans nom de machine, configuration Docker ou erreur brute.
Le probe local Docker est borné à 10 secondes : une exécution CI a dépassé son
ancien délai de 3 secondes lors du précontrôle, tandis que le job PR parallèle
a exécuté les six tests. Ce délai ne change aucune limite ni condition d’autorisation.

La durée maximale est 30 secondes/job, les sorties sont limitées à 1 Mio et les
observations à 1000. Le code est préparé dans un répertoire privé temporaire.
Chaque image épinglée contient BusyBox 1.37.0 et `/usr/bin/timeout`. Le profil
utilise ce binaire comme entrypoint structuré avec `-s KILL`, le temps restant
arrondi vers le bas (1–30 s), puis le chemin absolu du scanner. Docker `--init`
place Tini au PID 1 : le scanner et le watchdog ne sont pas PID 1 et le watchdog
peut imposer SIGKILL même après la mort brutale du contrôleur Node. La sortie de
Tini termine le namespace ; `--rm` supprime le conteneur. Aucun shell ni binaire
additionnel n’est ajouté au profil de production. BusyBox (GPL-2.0-only), musl
et Tini (MIT) sont déjà fournis par les images/le daemon, sans modification.
Le délai du processus commence au démarrage effectif du conteneur ; le délai
préalable de création du daemon reste surveillé par le parent tant qu’il vit.
Le délai absolu du job et les jetons PostgreSQL empêchent une clôture tardive.
La disponibilité exige également la limite de swap Docker ; une limite mémoire
sans cette capacité ne suffit pas. L’annulation force la suppression du conteneur
avec une commande indépendante bornée et termine le client Docker par SIGKILL,
même si le scanner ignore SIGTERM. Les sorties trop volumineuses suivent ce même arrêt.

Les fichiers de contrôle `.semgrepignore`/`.gitleaksignore` téléversés ne pilotent
pas les scanners ; les règles sont celles du runner. Le profil Gitleaks ignore
les commentaires `gitleaks:allow` afin qu’un fichier fourni ne puisse masquer un secret.
Le profil Trivy refuse tout contenu comportant une directive `trivy:ignore` ou
`tfsec:ignore`, y compris dans les documents : ce refus conservateur empêche de
présenter une suppression source comme une correction. Son profil de couverture
est versionné. Semgrep utilise `--disable-nosem` ; les directives ne valent pas revue humaine.
Les conteneurs sont supprimés
à l'annulation et en nettoyage final, et les fichiers temporaires sont retirés.
Un SIGKILL du worker peut laisser le répertoire privé de code déchiffré sur
l’hôte ; le watchdog ne nettoie que le conteneur. Un `TMPDIR` privé en mémoire
ou chiffré et une récupération après incident restent des préalables à l’usage
client ; voir [l’exploitation](CYBER_OPERATIONS.md).
Le worker revalide membership, rôle, mandat, arrêt d'urgence et tentative pendant
l'analyse, puis avant la sauvegarde transactionnelle. Une perte d'autorisation ou
de base de données interrompt l'analyse. Le contrôle de concurrence et le transport
conservent l'outbox PostgreSQL et BullMQ existants.

## Couverture native Trivy et retests

Le profil `reviewed-default-v3-native-package-and-executed-check-inventory`
fixe `--list-all-pkgs`, `--include-non-failures` et
`--detection-priority precise`. Ces options ont été vérifiées dans les sources
officielles de [Trivy 0.76.1, rapport](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/flag/report_flags.go),
[contrôles](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/flag/misconf_flags.go)
et [détection](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/flag/scan_flags.go).
Le mode `comprehensive` peut déduire une version minimale d’une contrainte
Python ; cette approximation ne démontre pas la version résolue. Il n’est
donc pas utilisé comme preuve de correction dans ce profil.

L’empreinte conserve les fichiers source, le profil, l’identité de la base
d’avis, puis les cibles, classes et types réellement renvoyés par Trivy,
l’identité de chaque composant inventorié et les identifiants de contrôles
exécutés. Les versions de paquet et les états PASS/FAIL sont exclus de cette
identité pour permettre un véritable upgrade ou une correction de configuration.
La multiplicité des composants et contrôles est conservée. Perdre un paquet,
une cible ou un contrôle change la couverture, même si les chemins téléversés
n’ont pas changé. Les contrôles PASS et EXCEPTION ne produisent aucun constat.

Un inventaire natif absent, inconnu, incohérent avec les vulnérabilités ou
incomplet par rapport au résumé des contrôles fait échouer le job. Un état de
contrôle inconnu ou EXCEPTION ne peut pas établir une couverture comparable.
Pour `requirements.txt`, seules les déclarations exactes `nom==version` du
sous-ensemble reconnu, éventuellement avec extras et commentaires, sont
acceptées pour cette preuve ; chaque déclaration est rapprochée de
l’inventaire natif. Plages, wildcards, URL, inclusions d’autres fichiers,
conditions d’environnement et continuations non prises en charge sont refusées
avant la sauvegarde du résultat. Par exemple, remplacer `Django==1.2` par
`Django>=1.2` laisse un manifeste partiellement analysé en mode precise, pas
une correction vérifiée. Le profil v3 rend aussi les anciens profils non
comparables. Les limites de 1 Mio de sortie et 1000 observations restent
inchangées ; un inventaire devenu trop volumineux échoue sans résultat partiel.

## Importation et contrôles passifs

SARIF 2.1.0 : profil borné, règles/localisations/niveaux et outil/version déclarés.
Il n'exécute ni URI, ni code, ni liens. Les messages et snippets ne sont pas repris.
JSON : enveloppe `{version:1, engine:"semgrep"|"trivy"|"gitleaks",
engineVersion:"x.y.z", report: ...sortie native...}`. Les versions importées
portent explicitement la mention imported et ne valent pas preuve d'installation.
Une forme inconnue échoue sans constats partiels. Les preuves brutes restent
chiffrées, sans endpoint de téléchargement brut. Aucun secret complet ne doit
apparaître dans les DTO, logs ou rapports.

`web-passive` est désactivé par défaut (`CYBER_PASSIVE_ENABLED=true` pour
l'opérateur autorisé). Il valide un hostname exact, toutes ses réponses A/AAAA,
épingle l'adresse publique dans la connexion HTTPS, valide le certificat, fait
uniquement HEAD / et lit TXT/SPF/DMARC. Les redirections ne sont pas suivies ;
toute destination hors hôte/HTTPS est refusée. Pas de cookies, de JavaScript,
de formulaires, de crawler ni d'exploitation. Timeouts réseau et signal d'arrêt
sont bornés. DNS en échec reste inconnu et fait échouer le job ; ce n'est pas une
politique absente. Les tests utilisent des réponses synthétiques, pas un domaine
public scanné dans cette mission.

## Installation et exploitation locales

Linux ou WSL2, Node/pnpm épinglés, Docker avec cgroups et seccomp. Prévoir au moins
8 Gio RAM (16 recommandés), plusieurs CPU et 10 Gio de disque libre ; estimations,
pas des benchmarks. La DB Trivy téléchargée dans cette session occupe environ
1,7 Gio, pour environ 132 Mio compressés. Concurrence initiale du worker : 2.

```sh
cp .env.example .env
cp .env.test.example .env.test
pnpm install --frozen-lockfile
pnpm infra:up
pnpm cyber:init
pnpm build:packages
pnpm db:migrate
pnpm cyber:tools
pnpm dev
```

Pour un volume historique, suivre aussi le bootstrap non propriétaire de
[IDENTITY.md](IDENTITY.md), sans supprimer le volume. `cyber:init` crée des clés
privées local/test et configure seulement les `.env` locaux existants ; aucune
clé n'est affichée ni écrasée. Conserver une copie chiffrée de la clé : sa perte
rend les sources/preuves illisibles. Ne jamais commettre `.env` ni `.artifacts`.

`cyber:tools` télécharge les images et la DB publique Trivy, sans cible d'audit.
Ne pas actualiser la DB pendant des jobs. Son expiration rend le moteur
indisponible jusqu'à actualisation. La version du moteur, le pack de règles, la
liste de fichiers analysés et la DB Trivy participent à l'empreinte de couverture.
Un retest ne transforme pas une couverture différente en preuve de correction.

Lancer les tests : `pnpm check`, `pnpm test:integration`, `pnpm test:e2e`,
`pnpm test:scanners`, `pnpm audit:dependencies`. Les tests natifs utilisent un
répertoire synthétique (eval, lodash ancien et faux secret généré à l'exécution),
aucune cible externe. Arrêter avec Ctrl+C puis `pnpm infra:down`. Conserver les
volumes et les clés ; ne pas lancer `down --volumes` sur des données à conserver.
L'arrêt d'urgence par organisation est disponible via le moteur existant ; les
jobs interrompus sont clôturés/récupérés par leurs leases, sans résultat partiel.

Le profil Compose applicatif existant reste un contrôle de la fondation. Le mode
initial Cyber avec scanners tourne avec API/worker sur l'hôte Linux et les moteurs
dans leurs conteneurs. Ne pas monter le socket Docker dans l'API ni exposer le
worker publiquement pour contourner cette séparation.

## Moteurs seulement prévus

| Projet officiel                                               | Release observée             | Licence/source et décision initiale                                                                                                       |
| ------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [ZAP](https://github.com/zaproxy/zaproxy)                     | 2.17.0                       | Apache-2.0 ; Java/conteneur ; passif d'abord, actif avec méthodes/fenêtre/approbation distinctes.                                         |
| [Nuclei](https://github.com/projectdiscovery/nuclei)          | 3.11.1                       | MIT ; Go/conteneur ; futur catalogue de templates révisés non destructifs, licence des templates à vérifier séparément.                   |
| [Prowler](https://github.com/prowler-cloud/prowler)           | 5.47.0                       | Apache-2.0 ; Python/conteneur ; permissions minimales en lecture seule et coffre requis, aucun credential cloud pris en charge ici.       |
| [Nmap](https://github.com/nmap/nmap)                          | pas de release GitHub latest | NPSL 0.95 (LICENSE lu) ; conditions OEM/intégration/redistribution à résoudre avant inclusion commerciale. Non installé.                  |
| [Greenbone](https://greenbone.github.io/docs/latest/)         | openvas-scanner 23.52.8      | Composant GPL-2.0 ; autres composants/feeds à évaluer séparément, installation lourde non minimale.                                       |
| [osquery](https://github.com/osquery/osquery)                 | 5.24.1                       | Apache-2.0 OU GPL-2.0-only selon LICENSE ; consentement agent/inventaire et permissions adaptés.                                          |
| [Wazuh](https://github.com/wazuh/wazuh)                       | 4.14.9                       | GPL-2.0, moteur AGPL-3.0-or-later et bibliothèques duales selon LICENSE actuel ; surveillance continue optionnelle, distincte des audits. |
| [DefectDojo](https://github.com/DefectDojo/django-DefectDojo) | 3.5.0                        | BSD-3-Clause ; intégration/export optionnel préféré, pas de deuxième plateforme ni DB déployée.                                           |

Ces releases observées ne sont ni installées ni validées fonctionnellement par
Bump Cyber. Aucun abonnement, service payant, infrastructure publique ou scan réel
n'a été créé. Sauvegarde/restauration, MFA/identité de production, TLS, rétention
opérationnelle et revue d'infrastructure restent des conditions avant client réel.
