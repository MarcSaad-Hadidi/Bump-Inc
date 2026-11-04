# Bump Cyber — frontière Cloudflare prévue

État au 2026-11-04 : aucun Access, Tunnel, Worker Cyber, domaine privé ou stockage
R2 n’a été créé ou déployé dans cette mission. Le site public `website/` et son
hébergement existant ne sont pas modifiés. Le parcours local reste autonome.

## Architecture retenue

Le navigateur utilise Next.js et son proxy HTTP borné ; Fastify contrôle les
sessions Better Auth, les rôles et les données PostgreSQL. Le worker BullMQ est
un processus séparé sur la machine Linux de confiance. Il démarre les moteurs
dans des conteneurs sans réseau, avec des profils et limites fixes. Les
contrôles DNS/HTTPS passifs sont séparés et désactivés par défaut.

Pour une future petite installation privée, l’option la plus simple est de
conserver cette application sur la machine de confiance et d’ajouter Cloudflare
Tunnel vers le service web, protégé par une application Access **self-hosted**.
Un sous-domaine distinct, par exemple `cyber.bumpconsultation.ca`, serait à valider
avant création. L’application publique Bump et ses routes restent indépendantes.

Access apporte la barrière d’identité à l’entrée ; Better Auth et PostgreSQL
continuent de contrôler chaque ressource et chaque job. Un en-tête déclarant un
courriel Cloudflare ne suffit pas à ouvrir une session Bump. Le rôle et le
périmètre autorisé sont vérifiés dans Bump, même derrière Access.

Les scanners natifs, PostgreSQL, Redis, le socket Docker et les routes de santé
du worker restent hors des routes publiées. Aucun scanner ne tourne dans un
Cloudflare Worker. Un Worker léger pourrait être ajouté ultérieurement pour une
passerelle si un besoin mesuré le justifie. Aucune adaptation Next.js vers Workers
n’est incluse : le runtime actuel est Node.js.

## Conditions d’un déploiement ultérieur

Une installation Access doit d’abord identifier les consultants autorisés et
l’IdP, configurer les facteurs d’authentification adaptés, attacher une politique
Allow explicite et tester les identités autorisées et refusées. Les politiques
réutilisables sont préférées pour une nouvelle configuration. L’origine doit
être accessible uniquement par le chemin protégé ; un port public alternatif
permettrait de contourner la barrière d’entrée.

Le proxy exige un Host et un Origin exacts. L’opérateur devra définir
`CYBER_PUBLIC_ORIGIN` et `AUTH_BASE_URL` sur l’origine HTTPS validée et aligner
les cookies sécurisés, les liens email et les routes `/api/auth/` du proxy. L’API
interne reste désignée par `API_INTERNAL_URL`. Aucun secret d’infrastructure ne
doit être transmis au navigateur ou ajouté à une variable `NEXT_PUBLIC_*`.

Les paramètres exacts, règles de session, groupes IdP et ressources du compte
devront être inspectés avant configuration. Le fonctionnement Access et la
protection de l’origine ne sont pas attestés par les tests locaux de cette PR.
Le retour arrière doit pouvoir retirer le routage privé sans toucher au site
public. Ces actions demandent une autorisation explicite de mise en production.

## Budget et stockage

La documentation Cloudflare One consultée indique l’existence de plans Free et
Paid avec des fonctions dépendant du plan. Ce projet ne souscrit à aucun plan et
n’active aucune option payante. Les conditions et limites du plan gratuit devront
être revérifiées pour le nombre réel de consultants avant tout déploiement.

R2 n’est pas requis pour le MVP : les sources bornées et preuves brutes sont
chiffrées dans PostgreSQL existant. Les PDF sont produits localement à la demande.
Cette décision évite un second stockage, des frais de consommation et une
configuration de facturation. Les coûts initiaux sont le matériel, le disque,
l’électricité, les sauvegardes et le temps d’exploitation ; un hébergement Linux
futur aurait un coût choisi séparément par l’opérateur.

## Sources consultées

- [Choisir le type d’application Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/)
- [Politiques Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Cloudflare One et liens vers les plans](https://developers.cloudflare.com/cloudflare-one/)
- [Plans Zero Trust](https://www.cloudflare.com/plans/zero-trust-services/)

Les documents officiels ont été lus pour cette proposition. Aucune limite
commerciale précise ni configuration du compte n’est supposée acquise.
