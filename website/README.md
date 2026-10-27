# Bump — site public

Site complet en français et en anglais, initialement exporté de la version **46** du site Bump.
Source d'origine : commit `a937cad2d2b5baef0eff391892f32c7c0768b1bc`.

Ce dossier est autonome. Il contient les sources React, les scènes et modèles 3D,
les textures, les animations Anatomy, les polices, la musique et le curseur.
Il est indépendant de la plateforme Bump OS située à la racine du dépôt.

## Lancer le site

Prérequis : **Node.js 24** et npm. Depuis la racine de Bump-Inc :

```sh
cd website
npm ci
npm run build
npm start
```

Ouvrir `http://localhost:3000`. La version anglaise est sur `/en`.
Les pages éditoriales commencent sur `/expertises` et `/en/expertise`.
`PORT` (3000 par défaut) et `HOST` (0.0.0.0 par défaut) sont configurables.
`npm run dev` lance l'aperçu de développement sur le port 4173.

## Hébergement statique

Configurer l'hébergeur avec :

| Réglage | Valeur |
| --- | --- |
| Dossier du projet | `website` |
| Installation | `npm ci` |
| Build | `npm run build` |
| Dossier à publier, relatif au projet | `dist/client` |
| Version de Node | 24 |
| Page française | `/index.html` |
| Route anglaise | `/en` → `/en.html` |

Publier **tout le contenu de `dist/client`**, y compris `bump/`, `runtime/`,
`assets/`, `audio/` et `cursor/`. Les fichiers GLB, KTX2 et WASM sont nécessaires
à la 3D ; ne pas les remplacer par des pages HTML. Les types MIME attendus sont
`model/gltf-binary`, `image/ktx2` et `application/wasm`.

Les pages éditoriales sont générées dans des dossiers, par exemple
`expertises/index.html`. Les URL canoniques n'ont pas de barre finale. Une route
inconnue doit renvoyer 404 ; elle ne doit pas revenir sur l'accueil avec un statut
200. Les ancres des six chapitres restent sur la même page.

Pour un hébergement purement statique, définir `SITE_PUBLIC_ORIGIN` au build pour
résoudre les métadonnées absolues, configurer les URL propres et appliquer un
en-tête `X-Robots-Tag: noindex, follow` aux variantes `.md`. La négociation HTTP
`Accept` et `/api/md/` nécessitent le serveur Node ou le Worker fourni. Ils
appliquent automatiquement les alias, les en-têtes et les réponses 404.

Les assets utilisent par défaut le domaine courant : aucun domaine GPT Sites
n'est nécessaire pour charger le site. Pour des URL absolues dans les métadonnées
sociales et canoniques, définir `SITE_PUBLIC_ORIGIN` au moment du build :

```sh
SITE_PUBLIC_ORIGIN=https://votre-domaine.ca npm run build
```

PowerShell :

```powershell
$env:SITE_PUBLIC_ORIGIN = "https://votre-domaine.ca"
npm run build
```

Utiliser un domaine à sa racine, pas un sous-dossier. HTTPS est nécessaire pour
les fonctions de mouvement du téléphone et les permissions du navigateur.
Sans origine explicite, le serveur Node et le Worker résolvent les marqueurs de
métadonnées avec leur origine de requête. Derrière un proxy HTTPS, utiliser une
origine publique explicite pour conserver le bon protocole canonique.

## Pages éditoriales et lecture par les agents

Le catalogue `src/bump/seo/pages.js` contient neuf pages par langue, et les deux
accueils. Les quatre pages services couvrent l'automatisation, l'intégration IA,
le développement logiciel et la cybersécurité. Les autres présentent les
expertises, l'approche, Bump, les questions fréquentes et quatre études de cas
illustratives sur `/cas-d-usage` et `/en/use-cases`. Ces scénarios fictifs ne
revendiquent ni client ni résultat mesuré. L’accueil contient aussi une mini FAQ
et des liens vers les scénarios. Les informations officielles à compléter sont
listées dans `docs/seo/OFFICIAL-INFORMATION.md`.

`scripts/build-seo.mjs` génère l'HTML, le Markdown, `sitemap.xml`, `robots.txt`,
`llms.txt`, `llms-full.txt` et `ai.txt` depuis les mêmes données. Les fichiers
Markdown sont des variantes noindex ; le sitemap ne contient que les 20 URL HTML.

Trois accès au même texte sont pris en charge : `/services/integration-ia.md`,
`/api/md/services/integration-ia`, ou `/services/integration-ia` avec une
préférence `Accept: text/markdown` supérieure à `text/html`. Le catalogue est sur
`/api/md/_catalog`. Les navigateurs, `*/*` et les égalités de préférence reçoivent
l'HTML. Les routes privées ou techniques ne sont jamais des sources Markdown.

Pour ajouter une page, ajouter ses deux éditions au catalogue. La génération,
la navigation de pied de page, les variantes et les fichiers de découverte
utilisent ce registre. Les tests signalent une page HTML sans renderer ou motif
d'exclusion explicite. Les décisions et limites sont dans `docs/seo/`.

La politique des robots d'entraînement est conservée. Ces fichiers facilitent
la découverte et la lecture ; ils ne garantissent ni classement ni citation IA.

## Hébergement Cloudflare Workers

Le fichier `wrangler.jsonc` pointe sur le Worker construit dans
`dist/server/index.js`, avec les assets de `dist/client`. Faire le build avant
le déploiement. Le Worker s'exécute avant le routage des pages afin de gérer
`Accept`, les métadonnées, les variantes Markdown et les statuts HTTP.
`html_handling` est `none` pour que la récupération interne des fichiers ne
provoque pas de redirections concurrentes.

## Hébergement Node ou Docker

Un hébergeur Node peut utiliser `npm start` après le build. Le serveur ne demande
ni dépendances Node en production, ni base de données, ni compte ChatGPT.

Depuis la racine du dépôt :

```sh
docker build -t bump-site website
docker run --rm -p 8080:3000 bump-site
```

Ouvrir `http://localhost:8080`. Pour définir les métadonnées du domaine :

```sh
docker build --build-arg SITE_PUBLIC_ORIGIN=https://votre-domaine.ca -t bump-site website
```

Le conteneur ne contient que le client construit et son serveur statique. Il
s'exécute avec l'utilisateur `node`.

## Vérification et structure

```sh
npm ci
npm run build
npm test
```

- `src/bump/content.json` : contenu français ; `src/bump/locales/` et le builder
  anglais produisent la seconde édition.
- `src/bump/` : interactions, scroll assisté, caméras et hôtes des animations.
- `src/components/bump-anatomy/` : modèles fournis et leurs licences conservés.
- `public/` : tous les assets livrés avec le site, y compris les modèles 3D.
- `scripts/serve-production.mjs` : serveur statique de production.
- `docs/` : provenance des assets et documents de développement conservés.
- `.openai/hosting.json` et `worker/` : publication GPT Sites et routage du Worker ;
  le serveur Node partage le même contrat sans exiger Cloudflare.

Le formulaire « Parlons de votre projet » est une démonstration d'interface ;
aucun envoi de courriel ni CRM réel n'est connecté. Les démonstrations utilisent
des données fictives. Les agents propriétaires sont une vision future.

L'export conserve les modèles et animations de la version 46. Les tests de rendu
et les captures en mode de secours ne constituent pas une nouvelle validation
visuelle WebGL sur téléphone réel. Les fichiers de `docs/` conservent leur date et
leur contexte d'origine. Le build ne publie pas les outils de contrôle mobile.

## Mesure d’audience — Microsoft Clarity

- Projet Clarity : `z3i6jyq003`, monté dans le composant React partagé FR/EN.
- Le script Microsoft n’est **pas chargé avant accord explicite** du visiteur. Le choix est mémorisé dans le navigateur et révocable via « Préférences statistiques » / « Analytics preferences ».
- L’API Clarity Consent V2 autorise uniquement le stockage analytique après accord ; le stockage publicitaire reste refusé.
- Le tracker ne se charge que sur `bumpconsultation.ca` et `www.bumpconsultation.ca` : pas de sessions de test dans le tableau de bord depuis `workers.dev`, localhost ou les previews.
- `src/bump/ui/BumpClarityConsent.js` est monté dans `BumpNav` après le rendu React de l’application. Il installe la feuille CSS depuis `src/bump/ui/clarity-consent.css` lors de son effet et la retire au démontage. Le build publie cette feuille dans `public/runtime/clarity-consent.css`. Aucun script Clarity n’est injecté par le HTML statique. La CSP autorise les connexions Microsoft nécessaires.
- Vérification : après déploiement sur le domaine officiel, refuser les statistiques et confirmer l’absence de requêtes `clarity.ms`. Puis accepter et vérifier `https://www.clarity.ms/tag/z3i6jyq003` et les requêtes de collecte dans les DevTools. Tester également la révocation.
- **Avant publication** : vérifier que les règles de masquage Clarity excluent toute information confidentielle et ajouter la description du suivi et les coordonnées de Bump à sa politique de confidentialité. Le consentement technique ne remplace pas ces obligations d’information.

## Aperçus de lien et identité Bump

Le build génère `public/bump/brand/bump-social-v1.png` (1200 × 630) et
`public/bump/apple-touch-icon.png` (180 × 180) directement depuis le tracé
vectoriel Bump `src/bump/chapters/branding/symbol-outline.json`, sans
dépendance externe. Le favicon SVG reste indépendant et identique à la marque.

Les rôles sont volontairement distincts :
- **Grande vignette du lien** : les personnages de la scène originale,
  `/bump/art/hero-fallback-v2.webp`, dans `og:image` et `twitter:image`
  (1900 × 900 ; WEBP).
- **Identité de l'onglet et de l'app mobile** : le véritable symbole Bump
  via `/bump/favicon.svg?v=2`, `/bump/icon-32-v2.png`,
  `/favicon.ico`, `/bump/apple-touch-icon-v2.png` et `/site.webmanifest`
  avec PNG 192 et 512. Les variantes raster proviennent du tracé vectoriel
  officiel. Le fichier `bump-social-v1.png` existe toujours en ressource de
  marque, mais n'est plus utilisé pour l'aperçu principal.

`SITE_PUBLIC_ORIGIN` définit l'URL absolue des métadonnées en production
(`https://bumpconsultation.ca`). Ne pas le définir dans les previews Workers
pour garder leurs JS et médias sur le domaine de prévisualisation.

Après merge, vérifier le HTML source, les icônes et l'image
`https://bumpconsultation.ca/bump/art/hero-fallback-v2.webp`.
Les applications de messagerie conservent parfois les anciennes previews ;
le cache des cartes sociales est externe au site. Un petit pictogramme
superposé à une carte peut également provenir de l'interface de l'application
et ne pas être contrôlable via les métadonnées.

Le consentement Clarity disparaît totalement après autorisation **ou refus**.
Pour le modifier, ouvrir le menu **Expertises → Préférences statistiques**
(**Analytics preferences** sur l'édition anglaise). Aucun badge fixe ne
masque la scène et le lien demeure accessible aux visiteurs des domaines
officiels.

## Préparer un paquet GPT Sites

Le routage natif de GPT Sites donne la priorité aux fichiers statiques existants.
Le build embarque donc les petits contenus HTML/Markdown dans le Worker. Après
le build et les tests, exécuter `node scripts/prepare-gpt-routing.mjs` juste avant
le packaging Sites. Ce script retire seulement les 42 chemins de texte générés
du client de ce paquet pour que le Worker serve les pages, les canoniques, la
négociation Accept et leurs en-têtes. Les médias, polices et scènes restent
statiques. Aucune liaison ASSETS n'est nécessaire pour ces contenus.

Cette préparation est réservée au paquet GPT Sites. Ne pas la lancer pour un
hébergement Node ou Cloudflare normal. `npm run build` recrée le client complet
si un autre mode d'hébergement doit ensuite être testé.
