# Domaine Bump Cyber

La PR de domaine dépend de la base #38, commit vérifié `9ab360d` : tous les
contrôles GitHub ont réussi. Elle ne déploie rien et n'active aucun scanner natif.

## Modèle et frontières

La migration additive `0006_cyber_domain.sql` ajoute les tables préfixées
`cyber_` : client, asset, mandate, source, audit, scan, finding, observation,
evidence, task, retest, report, event et role. L'identité, les sessions,
organisations, membres, mandats versionnés, approbations, tentatives et outbox
réutilisent les tables existantes. Les CredentialReferences ne sont pas encore
utilisées : aucun scanner authentifié/cloud n'est disponible dans ce lot.

Les clés étrangères composites imposent la même organisation et le même client
pour les références métier. Les observations, mandats Cyber, retests et événements
sont append-only pour le runtime. La RLS exige le contexte transactionnel et une
appartenance actuelle. Le runtime ne possède aucune table métier.

Rôles Cyber : owner/admin d'organisation → administrateur ; membre non affecté
→ analyste. L'administrateur affecte consultant/analyste/réviseur. Seuls les
administrateurs créent les mandats ; le propriétaire approuve selon le moteur
existant. Le responsable désigné est le seul acteur autorisé à exécuter ce mandat.
Consultant/réviseur/administrateur peuvent revoir les constats ; un analyste ne
peut pas confirmer un constat ni publier un rapport. Le client en lecture seule
reste une phase ultérieure.

## Mandat, exécution et données

Un mandat Cyber contient signataire, date, référence, texte d'autorisation,
contact d'urgence, fenêtre absolue, actifs exacts, exclusions et moteurs permis.
Sa création et celle de la version du mandat commun sont atomiques. Le mode
initial est passif/hors ligne ; tout mode actif ou authentifié est rejeté.
La sélection d'un moteur ne vaut pas approbation. Chaque job réutilise les
contrôles d'autorisation, d'idempotence et d'arrêt de l'exécution durable.

Les instantanés de code sont téléversés comme fichiers UTF-8 bornés (100 fichiers,
128 Kio/fichier, 512 Kio au total), sans chemins absolus, traversée ni commandes.
Le contenu est chiffré AES-256-GCM avant stockage, avec contexte organisation/ID,
nonce aléatoire et tag d'intégrité. Les preuves brutes suivent le même mécanisme.
Les DTO ne contiennent ni ciphertext, ni sources brutes, ni clés. La clé opérateur
est un fichier privé de 32 octets, jamais un champ de DB ni une variable publique.
Sans clé configurée, le téléversement et le lancement échouent.

Rétention : 90 jours par défaut, 1–365 par client ; une source expirée ne peut
plus être employée. La purge administrative explicite efface les ciphertexts
expirés et conserve hashes, provenance et événement. La planification automatique
et l'effacement des sauvegardes doivent être configurés avant tout client réel.
Les autres données métier restent archivables ; leur suppression complète et les
sauvegardes relèvent d'une politique d'exploitation non encore validée.

## Constats, risque et retest

Toute nouvelle observation crée un constat **à examiner**. Aucun outil ne peut
confirmer une vulnérabilité. Le fingerprint SHA-256 porte sur actif, composant,
version et CVE (si composant+CVE connus), sinon actif, composant, version, règle
et localisation. Le titre n'intervient jamais. Chaque observation est conservée.

Priorité `cyber-risk-v1` : arrondi et bornes 0–100 de
`(6 × baseTechnique + exposition + 3 × criticité + 10 × EPSS + KEV) × confiance
- contrôlesCompensatoires + ajustementHumain`. Base technique = CVSS, sinon
  unknown/info/low/medium/high/critical → 0/0/2/5/8/10. Exposition public/internal/
  restricted → 10/3/0. Confiance low/medium/high → 0,6/0,8/1. KEV connu ajoute 10 ;
  contrôles compensatoires validés retirent 10 ; ajustement humain -20 à +20.
  EPSS et KEV restent **inconnus** tant qu'aucune source vérifiée n'est intégrée.
  Ils ne sont jamais affichés comme nuls/faux mesurés. Les facteurs sont retournés
  pour expliquer la priorité ; la sévérité technique est conservée séparément.

Une correction vérifiée exige un retest humain lié à un audit terminé du même
client/actif, même moteur/version et même empreinte de couverture. Une présence
contredit une conclusion « absent ». Une réapparition après clôture rouvre le
constat à examiner. Une comparaison distingue nouveaux/persistants/non observés
et avertit des réductions de couverture. « Non observé » n'est pas « corrigé ».

## API et limites

Routes sous `/organizations/:id/cyber`, protégées par Better Auth, vérification
email, contrôles Origin et `withTenant`. Pas de routes publiques de preuves.
Clients/actifs/mandats/sources/audits, revue, tâches, retests, comparaison, rôles et
purge sont disponibles côté API. Le registre de capacités interroge uniquement
l'URL de worker configurée par l'opérateur ; un worker absent rend les moteurs
indisponibles. Les premiers connecteurs et l'interface arrivent dans les PR
suivantes. Les listes ont des bornes explicites ; les statistiques comptent les
données complètes via PostgreSQL. Pagination avancée et gros volumes restent à
étendre avant usage massif.

Ce lot ne revendique ni MVP complet, ni certification, ni disponibilité de
scanners, ni identité/MFA de production validée. Loi25 et website restent séparés.
