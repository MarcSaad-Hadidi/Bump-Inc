# Bump Cyber — identité et MFA

La couche identité utilise Better Auth 1.7.12, son adaptateur Drizzle officiel et
son plugin `twoFactor`. L’activation TOTP et la connexion à deux facteurs sont
disponibles localement. Chaque compte choisit actuellement son activation :
aucune politique ne rend le MFA obligatoire pour tous les comptes. Aucun
fournisseur externe, Cloudflare Access, envoi SMTP de production ou déploiement
n’est configuré par cette livraison.

## Inscription et activation

Les inscriptions exigent `AUTH_ALLOW_SIGNUP=true` en développement ou test.
Elles sont refusées en production, même si ce drapeau est transmis. Le mot de
passe contient de 12 à 128 caractères. Better Auth vérifie l’adresse email avant
d’autoriser la connexion ; `/me` et les routes métier exigent aussi cette
vérification. Mailpit permet de tester les liens sans livraison externe.

Toutes les mutations utilisent JSON et un `Origin` exactement égal à
`AUTH_BASE_URL`. Conserver tous les `Set-Cookie` retournés, y compris pendant
l’activation et la désactivation qui remplacent la session courante. Les secrets
TOTP, URI d’authentification, codes de récupération, liens email, mots de passe
et cookies ne doivent jamais figurer dans les journaux, captures de test ou
fichiers versionnés.

| Étape                       | Requête                                                                     | Résultat                                                                |
| --------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Préparer l’authentificateur | `POST /api/auth/two-factor/enable` avec `{password}` et la session vérifiée | `{method:"totp", totpURI, backupCodes}` ; MFA encore désactivé          |
| Confirmer l’activation      | `POST /api/auth/two-factor/verify-totp` avec `{code}` et la même session    | Le code correct active le MFA et renouvelle le cookie de session        |
| Lire l’état                 | `GET /me`                                                                   | `twoFactorEnabled` est toujours un booléen ; aucun secret n’est renvoyé |
| Désactiver                  | `POST /api/auth/two-factor/disable` avec `{password}` et une session valide | `{status:true}`, suppression de l’enregistrement MFA, nouvelle session  |

`totpURI` utilise l’émetteur `Bump Cyber`, six chiffres et une période de
30 secondes. L’application d’authentification doit scanner ou importer cet URI.
Les codes de récupération sont affichés lors de la préparation et doivent être
conservés dans un gestionnaire sécurisé distinct de l’appareil TOTP. Un code TOTP
valide est obligatoire avant que `twoFactorEnabled` passe à `true` ; un code de
récupération ne termine pas cette activation.

## Connexion et récupération

Avec un compte MFA actif, `POST /api/auth/sign-in/email` valide le mot de passe
puis retourne `{twoFactorRedirect:true, twoFactorMethods:["totp"]}` et un cookie
de challenge signé. Il ne laisse aucune session authentifiée en base. `/me`
reste inaccessible jusqu’à la vérification du second facteur.

Le navigateur transmet ensuite ce cookie à
`POST /api/auth/two-factor/verify-totp` avec `{code}`, ou à
`POST /api/auth/two-factor/verify-backup-code` avec `{code}`. La réussite consomme
le challenge et crée la session. Un challenge absent, altéré, expiré ou déjà
consommé est refusé. Un code de récupération consommé ne peut pas servir à une
autre connexion. L’API n’expose pas la lecture des codes, leur régénération ni
les endpoints OTP par email. Sans authentificateur et sans code de récupération,
aucune procédure de récupération opérateur de production n’est livrée.

Les valeurs Better Auth par défaut sont conservées : challenge de dix minutes,
cinq échecs autorisés par challenge et verrouillage du compte après dix échecs
consécutifs, tous challenges et facteurs confondus, pendant quinze minutes.
Une réussite remet le compteur à zéro. Les endpoints MFA limitent aussi une
même adresse à trois requêtes par chemin sur dix secondes. Ces limites HTTP sont
en mémoire par processus ; un déploiement multi-instance nécessite un stockage
partagé avant exposition publique. Le client n’envoie pas `trustDevice` ; si un
autre client le transmet explicitement à `true`, Better Auth peut mémoriser cet
appareil pendant trente jours selon ses règles de confiance.

## Sessions et révocation

Les sessions sont vérifiées en PostgreSQL à chaque accès, sans cache de cookie.
Elles expirent après 24 heures ; leur actualisation intervient après une heure.
Les cookies sont `HttpOnly`, `SameSite=Lax` et `Secure` en production. La
configuration de production exige une origine HTTPS et des paramètres SMTP
explicites avec TLS ; un reverse proxy doit transmettre correctement les cookies
et conserver la validation d’origine.

`POST /api/auth/sign-out` révoque la session courante. Une réinitialisation du
mot de passe révoque les sessions du compte. Les routes existantes
`POST /api/auth/revoke-session` avec `{token}`,
`POST /api/auth/revoke-other-sessions` et
`POST /api/auth/revoke-sessions` permettent respectivement de révoquer une session
du compte, ses autres sessions ou toutes ses sessions. Elles exigent une session
valide et l’origine autorisée. Une suppression d’appartenance à une organisation
retire immédiatement son accès métier, indépendamment de la session identité.

L’activation et la désactivation MFA renouvellent la session courante ; elles ne
révoquent pas automatiquement les autres sessions déjà ouvertes. Après activation
sur un compte existant, révoquer les autres sessions depuis la session confirmée
pour qu’elles repassent par une connexion MFA. La révocation de sessions ne doit
pas être interprétée comme une révocation globale de tous les challenges ou
appareils de confiance Better Auth.

## Chiffrement et migration

La migration `0008_identity_mfa` ajoute `user.two_factor_enabled` initialisé à
`false` et la table globale d’identité `two_factor`, avec sa clé étrangère vers
`user` et ses index. Comme les sessions et comptes Better Auth, ces données ne
portent pas de locataire. Better Auth choisit l’identité à partir de la session
ou du challenge signé ; aucun identifiant utilisateur envoyé dans un formulaire
ne remplace cette vérification. Les droits CRUD du rôle `bump_runtime` permettent
au plugin de gérer l’identité, sans élargir les droits ni modifier les politiques
RLS des tables métier.

Les écritures applicatives passent exclusivement par Better Auth. Le plugin
chiffre directement le secret TOTP et utilise explicitement
`backupCodeOptions.storeBackupCodes: 'encrypted'` pour les codes de récupération.
Les colonnes SQL `text` contiennent ses valeurs chiffrées ; leur type seul ne
constitue pas un contrôle cryptographique contre une écriture SQL privilégiée.
Les tests déchiffrent les valeurs réellement persistées avec la bibliothèque et
vérifient leur correspondance en mémoire, sans afficher de secret.

`AUTH_SECRET` protège les données MFA et signatures Better Auth. Le remplacer
sans procédure de conservation/migration des clés peut rendre les facteurs
existants inutilisables. Le conserver hors du dépôt et le sauvegarder par un
canal opérateur protégé. Il doit être différent de la clé privée de 32 octets
référencée par `CYBER_EVIDENCE_KEY_FILE`, utilisée par le coffre de preuves Cyber.
Le coffre ne remplace pas la clé identité ; les sauvegardes et restaurations
doivent conserver séparément les deux clés et la base correspondante.

## Bootstrap local et attente de production

Le bootstrap opérateur livré concerne uniquement une base de développement ou
test contenant des données synthétiques :
1. Configurer `AUTH_ENABLED=true`, `AUTH_ALLOW_SIGNUP=true`, l’origine locale et
   Mailpit. Provisionner le rôle runtime non propriétaire puis appliquer les
   migrations avec le compte opérateur séparé selon [IDENTITY.md](IDENTITY.md).
2. Exécuter `pnpm cyber:init` pour créer ou conserver les clés privées locales et
   test du coffre. Ce script refuse `NODE_ENV=production` et ne crée aucun compte.
3. Inscrire le compte, ouvrir son lien de vérification dans Mailpit, se connecter
   puis activer et confirmer le TOTP. Conserver les codes de récupération hors
   des journaux. Créer l’organisation synthétique avec ce compte propriétaire.
4. Révoquer les autres sessions, puis fermer les inscriptions locales en réglant
   `AUTH_ALLOW_SIGNUP=false` quand l’enrôlement est terminé.

L’approvisionnement initial d’un compte de production n’est pas livré ; ouvrir
temporairement l’inscription publique en production n’est pas une procédure de
bootstrap. Une éventuelle passerelle Cloudflare Access devra imposer sa propre
politique MFA, ses identités/groupes autorisés et ses règles de durée de session,
vérifier qu’aucune origine API/Web ne contourne la passerelle, puis prouver les
refus et la révocation. Access ne remplace ni la session Better Auth ni
l’appartenance au locataire. Aucune politique Access n’a été créée ou validée ici.

Les tests ciblés couvrent PostgreSQL réel, rôle runtime non propriétaire,
inscription et vérification email capturées en mémoire, activation TOTP RFC 6238,
chiffrement en base, challenge avant session, refus de challenge invalide ou
rejoué, code de récupération unique, limites/verrouillage et désactivation.
La validation de l’infrastructure, sauvegarde/restauration, TLS et contrôle
indépendant de production reste une étape séparée.
