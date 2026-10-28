# Intégrer les animations des pages SEO (bumpconsultation.ca)

Tu intègres des composants React déjà terminés et vérifiés, **une animation par page SEO**. **Ne les redessine pas et ne les réécris pas.** Ton travail : copier les fichiers, placer chaque animation dans sa page avec le composant `LazyFigure` (pour le SEO), ajouter l'image de partage de chaque page, vérifier.

Chaque animation tourne en boucle quand elle est visible, sans petite écriture dans le dessin. Le texte complet défile sous la figure.

## Quelle animation sur quelle page

| Page (FR) | Page (EN) | Composant | Poster | Image de partage |
|---|---|---|---|---|
| `/services/automatisation-processus` | `/en/services/workflow-automation` | `workflow/Workflow` | `/bump/automatisation-processus.webp` | `/og/automatisation-processus.png` |
| `/services/integration-ia` | `/en/services/ai-integration` | `ia/AssistantIA` | `/bump/integration-ia.webp` | `/og/integration-ia.png` |
| `/services/developpement-logiciel` | `/en/services/custom-software-development` | `logiciel/TableauOperations` | `/bump/developpement-logiciel.webp` | `/og/developpement-logiciel.png` |
| `/services/cybersecurite` | `/en/services/cybersecurity` | `security-engine/SecurityEngine` | `/bump/cybersecurite.webp` | `/og/cybersecurite.png` |
| `/expertises` | `/en/expertise` | `aiguillage/Aiguillage` | `/bump/expertises.webp` | `/og/expertises.png` |
| `/approche` | `/en/approach` | `methode/MethodLab` | `/bump/approche.webp` | `/og/approche.png` |
| `/a-propos` | `/en/about` | `port/BumpPort` | `/bump/a-propos.webp` | `/og/a-propos.png` |
| `/cas-d-usage` | `/en/use-cases` | un par cas : cas 1 `workflow`, cas 2 `ia`, cas 3 `logiciel`, cas 4 `security-engine` | posters des pages de services | `/og/expertises.png` |
| `/faq` | `/en/faq` | **aucune** (la page doit rester la plus légère) | — | `/og/expertises.png` |

**Pages anglaises :** les textes qui défilent sous les animations sont en français. Sur les pages `/en/...`, affiche **seulement le poster** (sans charger l'animation), avec l'`alt` et la légende anglais ci-dessous. Une version anglaise des animations pourra suivre.

## Fichiers

```
bump-anatomy/
  kit/                    utilitaires Anatomy (licence MIT : garder LICENSE-anatomy)
  shared/AnatomyFigure.tsx  enveloppe React commune ("use client")
  shared/LazyFigure.tsx   NOUVEAU : poster + légende en texte, animation chargée à l'approche (SEO)
  shared/runtime.ts, controller.ts, method.ts, step-loop.ts
  shared/bump-theme.css   palette Bump (styles de tous les modèles)
  workflow/  ia/  logiciel/  security-engine/  aiguillage/  methode/  port/
                          un dossier par animation ; art.generated.ts est GÉNÉRÉ, ne jamais le modifier
public/bump/*.webp        posters (1200 px de large), à copier dans public/
public/og/*.png           images de partage 1200×630, à copier dans public/
apercu/*.html             démo autonome de chaque page (référence visuelle, ne pas déployer)
```

**Si certains modèles sont déjà intégrés** (workflow, security-engine, methode, port) : remplace leurs dossiers et `shared/` par ceux de ce paquet. Ce sont les mêmes versions, avec `shared/` à jour.

## Comment placer une animation (exemple : Intégration IA)

Place la figure **après le premier bloc de texte (« En clair »)**, pas dans le H1. Le titre et l'introduction doivent rester le premier contenu de la page.

```tsx
import { LazyFigure } from "@/components/bump-anatomy/shared/LazyFigure";

const loadIA = () => import("@/components/bump-anatomy/ia/AssistantIA");

<LazyFigure
  load={loadIA}
  poster="/bump/integration-ia.webp"
  width={1200} height={920}
  alt="Assistant IA qui consulte les documents, le CRM et l'ERP autorisés, rédige une synthèse reliée à ses sources, puis attend la validation de l'équipe"
  caption="Intégration IA : l'assistant puise seulement dans les sources autorisées, relie chaque point à sa source, et votre équipe décide. Scénario illustratif."
/>
```

- `load` doit être une fonction **définie hors du composant** (constante de module). Elle ne doit pas être recréée à chaque rendu.
- `width` et `height` doivent être ceux du poster (tableau ci-dessous). Ils réservent la place et évitent les sauts de mise en page.
- Next.js : `LazyFigure` est déjà `"use client"`. L'import dynamique sépare le code de chaque animation, et rien n'est rendu côté serveur à part le poster et la légende.

### Dimensions des posters

| Poster | width × height |
|---|---|
| automatisation-processus | 1200 × 1078 |
| integration-ia | 1200 × 920 |
| developpement-logiciel | 1200 × 892 |
| cybersecurite | 1200 × 1208 |
| expertises | 1200 × 920 |
| approche | 1200 × 920 |
| a-propos | 1200 × 975 |

### Textes alt et légende par page

| Page | alt (FR) | caption (FR) | caption (EN) |
|---|---|---|---|
| automatisation-processus | Flux d'une demande de devis : réception, qualification, préparation, validation humaine, transmission au CRM | Automatisation des processus : du formulaire au CRM, avec la validation de votre équipe. Scénario illustratif. | Workflow automation: from form to CRM, with your team's approval. Illustrative scenario. |
| integration-ia | (voir l'exemple ci-dessus) | (voir l'exemple ci-dessus) | AI integration: the assistant only uses authorized sources, links each point to its source, and your team decides. Illustrative scenario. |
| developpement-logiciel | Tableau des opérations : une demande D-024 passe de reçue à terminée avec un responsable, puis met à jour le CRM | Logiciel sur mesure : une demande, un responsable, un état visible, relié à vos outils. Scénario illustratif. | Custom software: one request, one owner, one visible status, connected to your tools. Illustrative scenario. |
| cybersecurite | Coffre-fort à tiroirs : domaines inspectés dans un périmètre autorisé, risque révélé, corrigé puis vérifié | Cybersécurité : audit autorisé, faiblesses priorisées, corrections vérifiées. Scénario illustratif. | Cybersecurity: authorized audit, prioritized weaknesses, verified fixes. Illustrative scenario. |
| expertises | Aiguillage : chaque besoin est envoyé vers l'expertise qui convient, de l'automatisation à la cybersécurité | Le bon levier, au bon endroit : on part de ce qui vous ralentit et Bump oriente vers la bonne expertise. Scénario illustratif. | The right lever, in the right place: we start from what slows you down and route it to the right expertise. Illustrative scenario. |
| approche | Carte des outils d'une PME : audit, analyse, proposition, implantation et maintenance, santé de 42 à 92 | Notre méthode en 5 étapes : comprendre, choisir, convenir, construire, faire durer. Scénario illustratif. | Our five-step method: understand, choose, agree, build, sustain. Illustrative scenario. |
| a-propos | Port de Montréal : un navire arrive vide, est chargé de trois services, puis repart avec élan | Ancrés à Montréal, tournés vers la suite : la technologie doit vous donner de l'élan. Scénario illustratif. | Rooted in Montréal, looking ahead: technology should give you momentum. Illustrative scenario. |

### Image de partage

Dans les métadonnées de chaque page, remplace l'image Renaissance commune par celle de la page :
```ts
openGraph: { images: [{ url: "/og/integration-ia.png", width: 1200, height: 630, alt: "…même texte que l'alt…" }] },
twitter: { card: "summary_large_image", images: ["/og/integration-ia.png"] },
```

## Règles

- **Ne modifie pas** `art.generated.ts`, `live.ts`, `step-loop.ts`, `iso-kit.ts` ni `iso.css`.
- **Une animation `port/BumpPort` maximum par page** : elle utilise un identifiant SVG unique.
- **Garde la mention « Scénario illustratif »** dans chaque légende.
- **N'ajoute pas** de texte par-dessus les figures, ni de bibliothèque d'animation.
- Les figures respectent déjà `prefers-reduced-motion` et s'arrêtent hors écran.

## Vérification attendue avant de dire « terminé »

- [ ] `tsc --noEmit` passe. Le paquet a été vérifié en mode `strict` avec TypeScript 5.6, `moduleResolution: "bundler"` et `jsx: "react-jsx"`.
- [ ] Sur chaque page, le **HTML initial** contient le poster et la légende, mais pas le SVG de l'animation. Pour le vérifier : « afficher la source », chercher `iso-figure` ; il ne doit pas apparaître.
- [ ] En faisant défiler, chaque animation remplace son poster sans saut de mise en page, et sa lecture défile seule.
- [ ] Lecture attendue au départ de chaque nouvelle animation :
  - Intégration IA : « une tâche précise · résumer un dossier client »
  - Développement logiciel : « une demande arrive · D-024 · reçue au bon endroit »
  - Expertises : « tâches répétitives → automatisation des processus »
- [ ] Les pages `/en/...` affichent le poster et la légende anglaise, sans animation.
- [ ] Chaque page a son image `og:image` propre (testable avec un outil d'aperçu de partage).
- [ ] La console est sans erreur, et à 390 px de large la page ne défile pas horizontalement.
- [ ] Lighthouse mobile : le LCP reste le H1 ou le texte d'introduction, pas une animation.
