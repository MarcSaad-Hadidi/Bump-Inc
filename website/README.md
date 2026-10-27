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

Le formulaire « Parlons de votre projet » envoie désormais les demandes via
`POST /api/contact` sur Cloudflare Workers. Il valide les champs côté serveur,
protège le point de contact par Turnstile, et utilise le binding `EMAIL` du
service Cloudflare Email Service pour transmettre une notification à l'adresse
personnelle vérifiée (la destination est volontairement limitée à une seule
adresse). Le succès ne s'affiche qu'après acceptation de l'envoi par le
fournisseur. **Avant fusion de la PR**, ajouter dans Cloudflare Workers,
`bump-consultation → Settings → Variables and Secrets`, un secret
`TURNSTILE_SECRET` avec la clé secrète du widget Turnstile nommé
« Bump Consultation - Contact Form » (clé publique
`0x4AAAAAAFnvTBtc-P3OUjx3`). Ne jamais stocker ni publier le secret dans
GitHub. Vérifier un envoi réel et la réception Gmail après déploiement.

Le routage MX vers Cloudflare et le transfert de
`contact@bumpconsultation.ca` vers la destination vérifiée sont configurés
directement dans Cloudflare. Les démonstrations du reste du site utilisent
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
