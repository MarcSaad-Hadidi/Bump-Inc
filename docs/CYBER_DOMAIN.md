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

Une affectation ou révocation de rôle Cyber verrouille la ligne d'appartenance
du membre ciblé en `FOR UPDATE`. Les transactions autorisées détiennent déjà
cette ligne en `FOR SHARE` via `withTenant` : le changement attend donc leur fin,
y compris pour un analyste par défaut qui n'a pas encore de ligne `cyber_role`.
Les rôles owner/admin hérités ne peuvent pas être remplacés par une affectation
Cyber (`inherited_admin_role`) ; un utilisateur sans appartenance courante est
refusé (`current_member_required`). Aucun verrou `FOR SHARE` n'est ajouté sur
`cyber_role`, dont les politiques RLS distinguent lecture et administration.

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

Le contrôle d'absence est volontairement plus conservateur que le fingerprint
de corrélation. Dans le même audit, client, actif et organisation, une observation
interdit « absent » si elle présente le même fingerprint, le même composant et
la même CVE quelle que soit la version affectée, ou le même moteur/règle dans le
même fichier après retrait du suffixe `:ligne[:colonne]`. Une localisation
manquante pour le même moteur/règle reste ambiguë et interdit aussi une correction
vérifiée. Déplacer une ligne Semgrep ou installer une autre version encore
vulnérable d'un composant ne constitue donc pas une correction. Les titres ne
sont jamais comparés et les constats restent distincts : aucune fusion ni
confirmation automatique n'est faite à partir de ces correspondances possibles.

Une correspondance renvoie `retest_evidence_conflict` sans modifier le constat.
La revue peut enregistrer `inconclusive`, qui conserve son statut, ou apporter
un nouveau retest comparable. Une conclusion `present` continue d'exiger le
fingerprint exact. La recherche d'absence examine au plus 6 000 observations par
audit/actif (six moteurs, mille observations chacun) et refuse explicitement un
dépassement avec `retest_observation_limit` ; aucun candidat n'est ignoré par
troncature. Les contrôles préalables de couverture, moteur/version, autorisation,
expiration et chronologie de la dernière détection restent obligatoires.

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

## Revue et régressions

La revue Codex a signalé la réutilisation possible d'un ancien retest après une
réapparition et une limite de fichier mesurée en caractères plutôt qu'en octets.
Les tests A positif → B absent → C positif refusent désormais de réutiliser B ;
chaque contenu est borné à 128 Kio UTF-8 et refuse les octets NUL. Les appels aux
contrats stricts communs projettent explicitement les champs permis : approbation
HTTP, annulation et finalisation ne propagent pas d'ID de route supplémentaire.
Le téléversement vérifie la session avant de demander une clé de chiffrement.

Les régressions supplémentaires utilisent PostgreSQL et le pipeline de scans
contrôlés avec des observations exclusivement synthétiques : déplacement de
ligne/colonne, CVE encore présente dans une nouvelle version, homonymie sans lien,
présence similaire sur un autre actif et refus d'un changement de couverture ou
de version du moteur. Les deux fausses corrections ont été acceptées avant le
correctif puis refusées après celui-ci. Le test de concurrence observe dans
`pg_stat_activity` qu'un changement de rôle attend le verrou du membre détenu par
une transaction déjà autorisée. Aucun scanner réel ni cible externe n'est lancé.

Validation historique du domaine : `pnpm check` réussissait avec 210 tests
unitaires ; 129 tests service-backed et 2 tests Chromium avaient réussi. Les régressions ont été reproduites
avant correction, dont le refus HTTP 400 à l'approbation et l'ancien retest accepté
à tort. Aucun contrôle n'a été assoupli.

La révision des retests apparentés et du verrouillage des rôles passe
`pnpm check` avec 215 unités et la suite complète de 136 intégrations réelles.
Elle utilise la base isolée `bump_domain_test` et une instance Redis locale
distincte sur le port 16383, base `/1`, afin de ne pas partager les files d'un
autre worktree. Les trois régressions ciblées ont échoué avant correction puis
réussi après celle-ci. Les tests Chromium historiques n'ont pas été réexécutés
dans cette révision du domaine.
