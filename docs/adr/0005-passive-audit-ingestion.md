# ADR 0005 — Sources privées et ingestion transactionnelle

Statut : accepté pour PR05, validation dans [INGESTION_VALIDATION.md](../INGESTION_VALIDATION.md). Dépend de PR02 identité/tenancy et PR04 moteur durable, base exacte `5939330f6959c34ae577895fe9db05d097fdfe3a`.

## Décision

Conserver les services d'ingestion dans `packages/core`, les contrats/parser dans `packages/contracts`, les tables dans `packages/db` et les adaptateurs privés local/S3 dans `packages/integrations`. API et worker existants sont leurs vrais appelants. Aucun package ni registre extensible de handlers supplémentaire.

PostgreSQL reste l'autorité sur reçus, quota, alias, provenance, observations et état des jobs. Redis ne transporte que le jobId. Les profils bornés JSON Bump, SARIF et CycloneDX produisent des observations déclaratives ; aucune URI ni commande du document n'est exécutée, aucune sévérité métier n'est inventée.

Un reçu staging réserve le quota avant l'écriture objet, qui demeure hors transaction. Son écriture est immuable et reprenable. Une seconde transaction réautorise et lie le reçu au job/outbox. La déduplication par contenu ne remplace pas l'alias durable par clé de requête : une clé réutilisée avec une autre requête doit toujours échouer.

Le worker utilise le fencing PR04 et relit le mandat actuel. Il vérifie octets/digest avant parsing puis réautorise dans la transaction finale. L'insertion des observations et le succès sont atomiques. Les permissions SQL empêchent de modifier provenance/observations avec le rôle runtime ; le rôle opérateur reste distinct.

## Conséquences

Une panne entre réserve, écriture et mise en file laisse un staging connu et comptabilisé, pas un succès fictif. Une resoumission identique termine le protocole. Un quota fixe borne la conservation des sources, y compris les échecs ; nettoyage/rétention réclameront la politique PR08. API et worker doivent partager le même stockage. Les tests S3 compatibles valident les primitives requises sans prouver une politique AWS de production. Les profils restent explicitement limités ; une extension de format réclame ses tests et une nouvelle version de convertisseur si la normalisation change.
