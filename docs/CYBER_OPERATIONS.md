# Bump Cyber — installation et exploitation locales

État du guide : 4 novembre 2026. Ce parcours utilise des données synthétiques
sur une machine locale de confiance. Il ne constitue ni une autorisation de
scanner un client, ni une procédure de déploiement en production. Les contrôles
Cyber utilisent PostgreSQL et le worker réel ; le mode mémoire du prototype
Loi 25 ne remplace pas ces dépendances.

## Composants et capacité disponible

| Composant                  | Version ou configuration du dépôt | Usage                                                            |
| -------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Node.js / pnpm             | 24.22.1 / 10.34.7                 | Versions de référence, dépendances épinglées dans le lockfile    |
| Next.js / React            | 16.4.2 / 19.3.1                   | Interface privée FR/EN à `/cyber`                                |
| Fastify                    | 5.12.7                            | API et contrôles serveur                                         |
| Better Auth                | 1.7.12                            | Email vérifié, sessions, organisations et TOTP                   |
| PostgreSQL / Drizzle ORM   | 17 / 0.45.4                       | Données métier, autorisations, RLS, outbox et preuves chiffrées  |
| Redis / BullMQ             | 7 / 5.81.5                        | Transport des jobs ; PostgreSQL reste la référence               |
| Semgrep / Trivy / Gitleaks | 1.183.0 / 0.76.1 / 8.30.1         | Images officielles épinglées par digest, exécution locale isolée |
| PDFKit                     | 0.20.2                            | PDF généré dans l’API, après approbation du rapport              |

Les imports JSON/SARIF restent utilisables quand les moteurs natifs sont
indisponibles, à condition que PostgreSQL, Redis, le worker et le coffre soient
opérationnels. L’interface affiche les capacités réellement annoncées par le
worker ; l’absence du worker rend les moteurs indisponibles.

Les adaptateurs et licences sont décrits dans [CYBER_SCANNERS.md](CYBER_SCANNERS.md).
ZAP, Nuclei, Prowler, Nmap, Greenbone et osquery sont seulement envisagés : aucun
adaptateur ni moteur installé n’est livré pour eux. Wazuh et DefectDojo restent
des options d’intégration futures, sans service installé ni nouvelle base métier.

## Préparer une installation neuve

Utiliser Linux, ou WSL2 avec un moteur Docker Linux local. Pour les scanners
natifs, le compte qui exécute le worker doit accéder au client Docker et au
daemon `unix:///var/run/docker.sock`. Ce compte est privilégié du fait de cet
accès : réserver le runner à une machine de confiance et ne pas exposer son
port de contrôle.

Le daemon doit prendre en charge les limites CPU, mémoire, swap et PID, et un
profil seccomp actif. La vérification de capacité exige notamment
`MemoryLimit`, `SwapLimit`, `CpuCfsQuota` et `PidsLimit`. Une installation
rootless sans cgroups utilisables reste **indisponible pour les scanners
natifs** ; aucune exécution moins confinée ne prend le relais. C’est la limite
du runner fourni pendant cette session. Les preuves d’exécution natives doivent
provenir d’un environnement Linux satisfaisant ces exigences, comme la CI.

Depuis la racine du dépôt, sur un nouveau clone sans fichiers d’environnement :

```sh
corepack enable
corepack prepare pnpm@10.34.7 --activate
cp .env.example .env
cp .env.test.example .env.test
chmod 600 .env .env.test
pnpm install --frozen-lockfile
pnpm infra:up
pnpm build:packages
pnpm db:migrate
pnpm cyber:init
pnpm cyber:tools
pnpm dev
```

Vérifier les versions Node/pnpm et relire les valeurs locales avant le lancement.
Conserver les fichiers existants lors d’une mise à jour, plutôt que recopier les
exemples par-dessus. Les variables exportées dans le shell prennent priorité
sur les fichiers `.env` ; un ancien `DATABASE_URL` peut donc sélectionner une
autre base. Les identifiants des exemples sont jetables et réservés au poste
local. Ne pas versionner `.env`, `.env.test`, `.artifacts`, sources ou preuves.

`infra:up` démarre PostgreSQL, Redis, Mailpit et le service S3 de test local.
`build:packages` prépare les imports TypeScript nécessaires aux migrations et
aux processus. `cyber:init` crée ou conserve les clés locales et de test, puis
ajoute leur chemin et celui du cache Trivy aux fichiers d’environnement déjà
présents ; il n’affiche jamais la clé. `cyber:tools` télécharge les images
épinglées et la base publique Trivy. Il n’analyse aucune cible. Cette préparation
nécessite Internet, mais les jobs natifs s’exécutent ensuite sans réseau. Elle
est facultative si l’on utilise uniquement les imports JSON/SARIF.

Le cache par défaut de cette commande est `.artifacts/trivy-cache`, à la racine
du dépôt. Pour un autre emplacement, transmettre aussi
`CYBER_TRIVY_CACHE_DIR` dans l’environnement de `pnpm cyber:tools` : ce script
opérateur ne charge pas lui-même `.env`. L’API et le worker doivent ensuite
utiliser le même chemin absolu de clé ; le worker doit retrouver le cache
préparé.

Ports locaux : interface `http://127.0.0.1:3000/cyber`, API 3001, contrôle worker
3002, PostgreSQL 5432, Redis 6379, SMTP Mailpit 1025 et interface Mailpit
`http://127.0.0.1:8025`. Le service S3 de test écoute sur 8333. Les publications
Compose sont limitées à loopback. `API_INTERNAL_URL` désigne l’API depuis Next ;
`CYBER_WORKER_URL` désigne le worker depuis l’API. Ce sont des origines choisies
par l’opérateur, sans identifiants, chemin, query ou fragment.

## Base existante et séparation des credentials

`DATABASE_URL` utilise `bump_app`, rôle runtime non propriétaire. Seule la
commande de migration utilise `MIGRATION_DATABASE_URL`, avec le credential
opérateur. Ne pas donner ce credential à la configuration de service de l’API
ou du worker ; les exemples locaux regroupent les variables pour le bootstrap,
ce qui ne constitue pas un modèle de distribution des secrets en production.

Pour un ancien volume de la fondation, suivre le bootstrap de rôle non
propriétaire dans [IDENTITY.md](IDENTITY.md). Les scripts d’initialisation
PostgreSQL ne sont exécutés automatiquement qu’à la création du volume. Garder
le volume et examiner les rôles/migrations déjà appliqués ; ne pas recréer la
base pour contourner un conflit de lignée. Les migrations historiques des
branches identité/mandats/ingestion nécessitent cette vérification préalable.

La base `bump_test` et Redis DB 1 sont réservés aux tests. Après compilation des
packages, une migration explicite de cette base peut être lancée depuis la
racine avec les variables de test :

```sh
node --env-file=.env.test --import tsx packages/db/src/migrate.ts
```

Vérifier l’environnement du shell avant cette commande. Aucun test ne doit
pointer vers une base contenant des données client.

## Ouvrir l’espace et préparer un audit

L’exemple local active `AUTH_ENABLED=true` et `AUTH_ALLOW_SIGNUP=true`. Créer
un compte synthétique depuis `/cyber`, ouvrir son lien de vérification dans
Mailpit, puis se connecter et créer une organisation. Un email non vérifié ne
peut pas ouvrir les routes métier. Mailpit ne démontre aucune livraison SMTP
externe. En production, `AUTH_ALLOW_SIGNUP` doit être `false` et l’inscription
publique est refusée ; le provisionnement du premier compte de production
nécessite encore une procédure opérateur approuvée.

Le TOTP et ses codes de récupération se configurent dans les paramètres du
compte. Chaque compte choisit actuellement son activation ; il n’existe pas
encore de politique qui l’impose à toute l’organisation. Conserver les codes
dans un gestionnaire privé séparé de l’authentificateur. Voir
[CYBER_IDENTITY.md](CYBER_IDENTITY.md) pour les sessions, révocations et limites.

| Rôle Cyber     | Opérations principales autorisées                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Administrateur | Membres/rôles Cyber, clients/actifs, mandats, analyses, revue, rapports, purge et arrêt d’urgence                         |
| Consultant     | Clients/actifs, sources, lancement autorisé, revue/remédiation/retests, préparation et lecture des rapports               |
| Analyste       | Sources, lancement autorisé et tâches de remédiation ; pas de confirmation des constats ni de lecture/export des rapports |
| Réviseur       | Revue/retests et préparation, lecture, approbation des rapports ; pas de lancement d’analyse                              |

Les propriétaires et administrateurs d’organisation sont administrateurs Cyber.
Un membre sans affectation Cyber est analyste. L’approbation d’un **mandat**
reste réservée au propriétaire de l’organisation par le moteur d’autorisation
existant ; l’approbation d’un **rapport** est permise à l’administrateur ou au
réviseur. Seul le responsable désigné peut lancer son mandat approuvé pendant
sa fenêtre de validité, sur les actifs et moteurs exacts autorisés. Les rôles
Cyber ne remplacent pas ces contrôles.

Enregistrer un client synthétique, ses actifs, le mandat signé avec exclusions,
contact d’urgence et dates absolues, puis faire approuver le mandat. Ajouter
la source correspondant à chaque moteur choisi avant de lancer l’assistant
d’audit. Le serveur et le worker revalident l’appartenance, le rôle, le mandat,
l’arrêt d’urgence et la tentative ; l’interface seule ne fait pas autorité.

## Sources, imports et limites de couverture

Les moteurs natifs reçoivent un instantané de fichiers texte UTF-8 : au plus
100 fichiers, 128 Kio par fichier et 512 Kio pour l’ensemble sérialisé. Les
chemins sont relatifs et bornés ; les octets NUL, traversées et chemins absolus
sont refusés. Il n’y a ni import ZIP, ni clonage distant, ni téléchargement de
dépôt piloté par une URL utilisateur. L’actif `propriétaire/dépôt` est un
identifiant de périmètre, pas une instruction de clone.

Semgrep exécute les trois règles locales révisées ; Gitleaks analyse le
répertoire et rédige ses valeurs de secrets. Trivy analyse les dépendances et
configurations des fichiers fournis avec `trivy fs`. Le connecteur ne scanne
pas des images de conteneur, registres, comptes cloud ou hôtes distants. La
sous-commande `trivy image --download-db-only` de préparation télécharge
uniquement la base d’avis. Aucun de ces outils ne confirme une exploitation.

Un import JSON contient une enveloppe versionnée et la **sortie native** du
moteur déclaré. Par exemple, une forme Semgrep sans résultat :

```json
{
  "version": 1,
  "engine": "semgrep",
  "engineVersion": "1.183.0",
  "report": { "version": "1.183.0", "results": [], "errors": [] }
}
```

Les moteurs permis dans cette enveloppe sont `semgrep`, `trivy` et `gitleaks` ;
`engineVersion` est une version `x.y.z`. Un tableau générique d’observations
arbitraires n’est pas un format d’import. SARIF doit suivre le profil borné
2.1.0 accepté par le parseur. Les fichiers JSON/SARIF sont limités à 512 Kio ;
le parseur refuse une forme inconnue sans publier de résultats partiels.
La provenance importée reste déclarée et marquée comme telle : elle ne prouve
pas qu’un moteur est installé ou qu’un scan a été exécuté par Bump Cyber.

`web-passive` est désactivé par défaut avec `CYBER_PASSIVE_ENABLED=false`.
Une activation explicite par l’opérateur autorisé permet uniquement un hostname
exact, résolution A/AAAA entièrement publique, adresse épinglée dans HTTPS,
certificat vérifié, `HEAD /` et lectures TXT/SPF/DMARC. Les redirections ne sont
pas suivies ; une destination hors hôte/HTTPS est refusée. Un échec DNS fait
échouer le job, au lieu de devenir une politique absente ou un résultat
favorable. Aucun crawler, formulaire, cookie, JavaScript, scan actif ou scanner
authentifié n’est livré. Les commandes d’installation et de préparation de ce
guide n’effectuent aucun scan public.

## Mode Compose facultatif pour imports et rapports

Le mode principal avec scanners natifs garde API et worker Node sur l’hôte
Linux, lancés par `pnpm dev`, et exécute seulement les moteurs dans Docker.
Le profil applicatif de [compose.yaml](../compose.yaml) conserve le contrôle
local de la stack. [compose.cyber.yaml](../compose.cyber.yaml) ajoute la clé
Cyber et les connexions internes pour les imports et les rapports :

```sh
docker compose -f compose.yaml -f compose.cyber.yaml --profile app up --build -d --wait
```

Arrêter d’abord les processus `pnpm dev` pour libérer leurs ports. Exécuter
`cyber:init` avant ce mode et vérifier que `CYBER_EVIDENCE_KEY_FILE` désigne un
fichier hôte privé de 32 octets. Le bind mount est en lecture seule vers
`/run/secrets/cyber-evidence`. Les images API/worker utilisent l’utilisateur
`node`, UID 1000 : il doit pouvoir lire ce fichier en mode `0600`. Préparer la
propriété du fichier pour ce compte dédié, ou une copie privée correspondante,
et maintenir le répertoire hôte en `0700`. Ne pas rendre la clé lisible par
tous pour régler un problème de permission : le chargeur la refuserait.

Le conteneur worker actuel ne reçoit ni client Docker ni socket du daemon.
Les scanners natifs y sont donc indisponibles ; utiliser le worker hôte pour
eux. Le socket n’est pas monté dans l’API. Le mode Compose conserve
`web-passive` désactivé et n’est pas un déploiement de production.

## Surveillance, actualisation et arrêt

La concurrence du worker est initialement 2. Chaque conteneur natif est limité
à 1 CPU, 1536 Mio de mémoire, aucun swap supplémentaire, 128 PID et un tmpfs
de 128 Mio. Son réseau est coupé, son utilisateur est 65534, le système de
fichiers est en lecture seule, les capabilities sont retirées et
`no-new-privileges` est actif. Un job est borné à 30 secondes, sa sortie à
1 Mio et ses observations à 1000. Aucun secret de coffre, session ou credential
d’infrastructure n’entre dans le conteneur de scanner.

Consulter l’état réel des jobs, l’étape enregistrée et les erreurs dans `/cyber`.
Un moteur indisponible ou une analyse échouée ne constitue pas une analyse
réussie sans constat. Pour Trivy, une base absente ou dont `NextUpdate` est
dépassé rend le moteur indisponible. Actualiser avec `pnpm cyber:tools` pendant
une fenêtre sans jobs ; ne pas remplacer le cache utilisé par une analyse en
cours. La base, la version des règles/moteurs et les fichiers font partie de la
couverture : leur changement peut rendre un retest non comparable.

Pour arrêter proprement :
1. Annuler les jobs concernés depuis la vue des audits. L’auteur peut annuler
   ses jobs ; un administrateur d’organisation peut intervenir sur les autres.
2. En cas d’incident, l’administrateur active l’arrêt d’urgence de
   **l’organisation** depuis l’interface. Il bloque ses nouveaux jobs et demande
   l’arrêt des jobs en cours. Contrôler leurs états terminaux. La reprise
   n’exécute pas à nouveau les analyses annulées.
3. Arrêter `pnpm dev` avec Ctrl+C. Si les services applicatifs sont en Compose,
   les arrêter avec la même combinaison de fichiers Compose.
4. Arrêter ensuite l’infrastructure avec `pnpm infra:down`, ou avec
   `docker compose -f compose.yaml -f compose.cyber.yaml --profile app down`
   pour le mode facultatif. Ces commandes conservent les volumes ; ne pas
   ajouter `--volumes` sur des données à préserver.

L’annulation normale supprime le conteneur et les fichiers temporaires. Si un
crash laisse un conteneur, l’opérateur peut d’abord l’identifier par le label :

```sh
docker --host=unix:///var/run/docker.sock ps -a --filter label=bump.cyber=true
```

Après vérification du job et du nom exact `bump-cyber-<UUID>`, arrêter puis
supprimer **ce seul conteneur** avec `docker --host=unix:///var/run/docker.sock
stop --time 1 NOM_VERIFIE` et `docker --host=unix:///var/run/docker.sock rm
--force NOM_VERIFIE`. Le label peut désigner plusieurs jobs ; ne pas l’utiliser
pour supprimer en masse les ressources du daemon. Ne pas faire de `prune`
global pour cette récupération. Un arrêt manuel de conteneur ne remplace pas
la vérification de l’état du job en base et de ses leases.

## Clés, rétention, sauvegarde et diffusion

Les sources et preuves Cyber sont chiffrées en AES-256-GCM dans PostgreSQL avec
une clé opérateur de 32 octets. `cyber:init` crée
`.artifacts/cyber-keys/local.key` et `test.key` en mode `0600`, dans un
répertoire `0700`, sans écraser une clé existante. API et worker doivent partager
la même clé pour un environnement ; les clés locales et de test sont distinctes.
Le coffre vérifie l’intégrité et le contexte organisation/identifiant.

Sauvegarder PostgreSQL et sauvegarder les clés séparément, sous forme chiffrée
et privée avec accès limité. Une sauvegarde PostgreSQL sans sa clé ne permet
pas de relire les sources/preuves. Sauvegarder aussi la configuration secrète
nécessaire à l’identité et, si l’ingestion privée est utilisée, son stockage
d’artefacts : `ARTIFACT_BACKEND=local` et sa racine privée appartiennent à ce
module existant, distinct du coffre Cyber en base. Les volumes Compose ne sont
pas une sauvegarde. Tester la restauration dans un environnement isolé, avec
un rôle de sauvegarde approprié et sans remettre en route des jobs client.

Il n’existe pas de rotation automatique ni de migration multi-clés du coffre.
Remplacer le fichier de clé rend les anciens contenus illisibles. Définir une
procédure de rotation, de récupération et de conservation des clés historiques
avant un usage client ; ne pas régénérer une clé pour réparer un problème de
lecture. Les sauvegardes et clés ne doivent jamais être jointes à un ticket,
exportées dans des logs ou placées dans le dépôt public.

La rétention des nouveaux contenus est configurable par client de 1 à 365 jours,
90 par défaut. Une source expirée ne peut plus être utilisée. La purge est
explicite, dans les paramètres administrateur : elle vide les ciphertexts
expirés des sources et preuves, conserve les métadonnées/empreintes et écrit
un événement. Elle n’est pas planifiée automatiquement. Modifier la durée du
client ne recalcule pas les échéances des contenus déjà créés.

Les historiques et instantanés de rapports sont conservés ; la purge des
preuves ne les efface pas. Ils contiennent les constats et le contexte revus,
mais pas les sources ni sorties brutes. Leur archivage, leur effacement et le
cycle des sauvegardes doivent faire l’objet d’une politique approuvée avant
toute donnée client réelle. Le PDF exige l’approbation explicite de
l’empreinte du rapport par un administrateur ou réviseur. Sa diffusion hors de
l’espace privé relève ensuite d’une décision humaine ; aucun portail client
ni lien public de partage n’est livré. Voir [CYBER_REPORTING.md](CYBER_REPORTING.md).

## Coûts et conditions avant usage client

Aucun abonnement ou service payant n’est requis pour ce parcours auto-hébergé.
Aucun compte Cloudflare, Tunnel ou Access n’est installé ou créé par ces
commandes. Une éventuelle passerelle d’accès doit faire l’objet d’une
configuration distincte ; elle ne remplace pas les autorisations de Bump Cyber
et n’héberge pas les scanners natifs.

Le coût matériel, électrique, stockage/sauvegarde et temps d’exploitation reste
réel. Pour planifier un poste avec développement et scanners, prendre comme
point de départ **estimé, non mesuré** : 4 vCPU, 8 Gio de RAM avec 16 Gio
recommandés et au moins 10 Gio de disque libre. La base Trivy observée dans
cette session occupe environ 1,7 Gio, auxquels s’ajoutent images, dépendances,
PostgreSQL, Redis et sauvegardes. Ces chiffres ne sont ni un benchmark ni une
garantie de capacité ; mesurer selon la concurrence et surveiller la croissance.
L’actualisation de la base et le téléchargement des images consomment aussi du
réseau. Vérifier les licences et obligations de redistribution des outils.

Avant un client réel, il reste notamment à valider : accès HTTPS et passerelle
éventuelle Access/IdP, provisionnement du premier compte de production, politique
MFA et récupération, SMTP de production, secrets et rotation, isolation du runner,
sauvegardes/restauration, archivage des rapports et purge opérationnelle. Le code
exige en production PostgreSQL avec `sslmode=verify-full`, Redis en `rediss:`,
origine d’authentification HTTPS et SMTP TLS explicite ; les exemples locaux
ne satisfont pas ces conditions. Le backend d’artefacts de l’ingestion privée
exige aussi une configuration S3 explicite en production.

Une revue indépendante et l’autorisation d’infrastructure restent nécessaires,
ainsi qu’un mandat client effectif et la validation du périmètre réseau avant
tout contrôle public. Les fonctions locales d’identité, de PDF ou de scan ne
constituent pas une attestation de préparation à la production.

## Vérifications opérateur

```sh
pnpm check
pnpm test:integration
pnpm exec playwright install --only-shell chromium
pnpm test:e2e
pnpm test:scanners
pnpm audit:dependencies
```

Les tests d’intégration utilisent les services isolés de `.env.test`. Les tests
natifs utilisent des fichiers synthétiques et les moteurs réels dans leurs
conteneurs ; des fixtures ou mocks ne remplacent pas cette acceptation. Sur un
runner dépourvu de cgroups, consigner le blocage au lieu d’affaiblir le contrôle
d’isolation. Les tests passifs DNS/HTTPS utilisent un transport simulé, sans
domaine public scanné. Enregistrer les résultats effectivement obtenus et le
commit concerné ; la présence d’une commande ou d’un workflow ne prouve pas sa
réussite sur une version ultérieure.
