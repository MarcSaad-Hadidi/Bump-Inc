# Bump — site public

Site complet en français et en anglais, exporté de la version **46** du site Bump.
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

L'hébergeur doit servir `/en.html` pour `/en`. Les autres routes de page peuvent
revenir sur `/index.html`, tandis qu'un fichier JS/WASM/GLB manquant doit renvoyer
404. Les ancres de chapitres restent sur la même page. Le serveur Node fourni
applique déjà ces règles, les requêtes HEAD et les plages audio HTTP.

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
- `.openai/hosting.json` et `worker/` : compatibilité de l'export Sites d'origine ;
  ils ne sont pas nécessaires pour lancer le serveur Node.

Le formulaire « Parlons de votre projet » est une démonstration d'interface ;
aucun envoi de courriel ni CRM réel n'est connecté. Les démonstrations utilisent
des données fictives. Les agents propriétaires sont une vision future.

L'export conserve les modèles et animations de la version 46. Les tests de rendu
et les captures en mode de secours ne constituent pas une nouvelle validation
visuelle WebGL sur téléphone réel. Les fichiers de `docs/` conservent leur date et
leur contexte d'origine. Le build ne publie pas les outils de contrôle mobile.
