# Ligue des Nations 2027 — Conventions de code

Application mobile de **pronostics de football** entre proches (famille & amis), façon
« Mon Petit Prono », pour une compétition non couverte par MPP. **Monorepo** : frontend
**Ionic 8 / Angular 20** (standalone) + backend **Node.js / Express 5** avec base **SQLite**,
hébergé 24/7 sur une VM. Ce document recense les conventions de code du projet ; il est agrémenté
au fur et à mesure.

> Les specs détaillées vivent dans `docs/` :
> - `docs/cahier-des-charges.md` — cahier des charges fonctionnel
> - `docs/stack-technique.md` — stack & architecture de déploiement
> - `docs/modele-de-donnees.md` — schéma de la base SQLite (source de vérité des tables)

---

## Structure du projet

```
ligue-des-nations-2027/
├── docs/         Specs (cahier des charges, stack, modèle de données)
├── backend/      Express 5 + SQLite + Socket.IO  (server.js à la racine du dossier)
└── frontend/     Ionic 8 / Angular 20 (standalone) + Capacitor
```

---

## Lancement en développement

Sur WSL / disque Windows (`/mnt/c`), la surveillance de fichiers native ne se déclenche pas
correctement → on utilise du **polling**.

- **Backend** : `npm run dev` (→ `nodemon -L server.js`, `-L` = polling). En prod / simple : `npm start`.
- **Frontend** : `npm run dev` (→ `ng serve --poll=2000` ; un `ng serve` simple ne rafraîchit pas à chaud).
- Le CORS backend est permissif → le frontend de dev (`localhost:4200` via `ng serve`, ou `8100` via
  `ionic serve`) peut appeler l'API (`localhost:3000`).

---

## Général

- **Tous les noms d'éléments de code** (méthodes, variables, services, pages, composants, types,
  routes, colonnes SQL…) sont en **anglais**. Seuls les libellés destinés à l'utilisateur (textes
  affichés) peuvent être en français.
- **Tous les commentaires de code sont en français** (frontend comme backend).
- **Strings entre doubles guillemets** (`"`) en priorité, plutôt que des simples (`'`).
  **Exception** : ce qui est généré par Ionic/Angular reste tel quel, en simples guillemets —
  chemins des `import`, métadonnées du décorateur `@Component` (`selector`, `templateUrl`,
  `styleUrls`). On ne convertit pas l'existant.
- **Fichiers `.spec.ts`** : on garde toujours le `.spec.ts` généré par Ionic pour chaque **page**,
  **composant** et **service**.
- **Identifiants** : côté frontend, `crypto.randomUUID()` si besoin ; côté base, voir le modèle de
  données (`INTEGER` auto-incrément, sauf secrets aléatoires comme `auth_token`).

---

## Frontend

### Structuration des fichiers
Sous `frontend/src/app/` :
- `services/` : les **services**, en fichiers plats `xxx-service.ts` (+ `xxx-service.spec.ts`), **sans** sous-dossier.
- `components/` : les **composants**, chacun dans son sous-dossier `xxx/` : `xxx.component.ts`, `.html`, `.scss`, `.spec.ts`.
- `pages/` : les **pages**, chacune dans son sous-dossier `xxx/` : `xxx.page.ts`, `.html`, `.scss`, `.spec.ts`.
- `utils/` : fonctions utilitaires pures, sans `.spec.ts`.

Autres : `src/environments/` (variables d'environnement), `src/theme/variables.scss` (thèmes), `src/assets/` (images).

### Variables d'environnement
- Définies dans `src/environments/environment.ts` (et `environment.prod.ts`).
- Nommées au format `NOM_VARIABLE` (majuscules, underscore). Ex. : `BACKEND_URL`.
- L'URL du backend est un **domaine HTTPS** fixe (VM), pas une IP locale.

### Imports dans un `.ts` de page ou de composant
Trois blocs séparés par une ligne vide :
1. Les imports framework (Angular, Ionic, RxJS, dayjs…).
2. *(ligne vide)* puis les **services** (ordre alphabétique).
3. *(ligne vide)* puis les **composants** (ordre alphabétique).

```ts
import { Component } from '@angular/core';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';

import { MessageService } from 'src/app/services/message-service';
import { ThemeService } from 'src/app/services/theme-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
```

### Types du modèle métier
- **Typage strict** : chaque entité a une **interface TypeScript** explicite (`User`, `Match`,
  `Prediction`…). Pas de `any` pour le modèle métier.
- Une interface est **co-localisée avec le service qui la possède** et **exportée** depuis ce fichier ;
  les autres modules l'importent depuis le service.

### Services
- Un service est **suffixé par `Service`** : classe `XxxService`, fichier `xxx-service.ts` (kebab + `-service`).
- Objectif : l'import d'un service contient toujours le mot « Service », ce qui le distingue d'un type, d'un composant, etc.
- Injectés en **`private`** dans le constructeur (dependency injection classique — on n'utilise pas `inject()`).
- **Séparation des responsabilités** — un service = une responsabilité. En particulier :
  - `MessageService` : **seul** à parler au backend (appels HTTP), cf. « Communication front/back ».
  - `StorageService` : boîte noire de stockage local (Ionic Storage) — auth_token, préférences.
  - `ThemeService` : thèmes + teinte de la barre d'état.
  - `VersionHandlerService` : versions (cf. Versionnage).
  - `NetworkService` : état en ligne / hors-ligne (signal `offline`), mis à jour par `MessageService`.
  - `OfflineCacheService` : cache des réponses de lecture (mode hors-ligne), au-dessus de `StorageService`.
  - Un service natif isolé par plugin (ex. notifications) : **seul** à connaître le plugin Capacitor.

### Inputs / Outputs
- Utiliser l'API **signal** : `title = input.required<string>();` (import de `input`) plutôt que `@Input()`.
  Dans le template, un input signal se lit en l'appelant : `{{ title() }}`.
- Pour les sorties : utiliser `output()` plutôt que le décorateur `@Output`.

### Constructeur et méthodes
- Les **services** sont injectés en `private` dans le constructeur.
- La **seule** méthode autorisée au-dessus du constructeur est `ionViewWillEnter`.
- `ionViewWillEnter` ne contient **pas de logique** : uniquement des appels à d'autres méthodes
  (quitte à définir des méthodes d'une seule ligne).
- Code à exécuter au chargement : `ionViewWillEnter` pour les **pages**, `ngOnInit` pour les **composants**.
- `await this.theme.initTheme();` est **toujours la première instruction** de `ionViewWillEnter`
  d'une **page** (inutile dans les composants, qui héritent du thème de la page).

### Templates HTML des pages
- **Structure Ionic standard** : `app-header` enveloppé dans un `<ion-header>`, suivi d'un
  `<ion-content [fullscreen]="true">`, puis (si onglet) `<app-navbar>`. Pas d'autre `<ion-header>`/`<ion-footer>`.
- Le `<ion-content>` porte toujours `[fullscreen]="true"` et la classe `<nom-de-la-page>-content`.
- **Éviter les balises `<ion-xxx>`** : privilégier du HTML classique quand c'est possible (et ne pas
  importer les `IonXxx` correspondants). **Exception** : `<ion-icon>` autorisé, icônes enregistrées
  via `addIcons({ … })` dans le constructeur du composant standalone.
- **Control flow** : `@for`, `@if`, `@switch` — **pas** `*ngFor`, `*ngIf`, `*ngSwitch`.
- **Listes** : un **composant dédié par élément répété** (on boucle sur `app-xxx-item`, pas sur un
  gros `<div>` inline).
- **Classes sur toutes les balises** : chaque balise porte un nom de classe. **Exception** : les
  fichiers HTML générés de base (ex. `app.component.html`) sont laissés tels quels.
- **Boîtes de dialogue** : modales applicatives `app-modal` / `app-confirm-modal` — **jamais**
  `AlertController` (pop-ups natifs). Chaque page pilote ses modales via un état local.

### Fichiers SCSS & thèmes
- Les classes sont ordonnées selon leur **ordre d'apparition dans le HTML**.
- **Pas de couleur codée en dur** : toute couleur passe par une variable CSS `var(--xxx)` définie
  dans `src/theme/variables.scss`, déclarée par thème (`body.theme-xxx`) et regroupée par catégorie.
- **Éviter les variables Ionic** (`--ion-xxx`) : styliser les composants Ionic via nos variables
  (ex. `ion-content { --background: var(--app-background); }`).

### Thèmes
- **Trois thèmes** : **`défaut`** (identité de l'app), **`clair`**, **`sombre`**, gérés par `ThemeService`
  (classe sur `<body>` : `theme-default` / `theme-light` / `theme-dark`) et définis dans `src/theme/variables.scss`.
- `ThemeService` accorde aussi la **barre d'état Android** au thème (via `@capacitor/status-bar`).
- Rayons d'arrondi et accents centralisés en variables (`--app-radius*`, `--app-accent*`).

### Direction artistique
- **Moderne et fluide** : coins **arrondis**, **animations fluides**, lignes douces.
- **Couleur principale : bleu** (accent `#3B82F6`, foncé `#2563EB`, texte sur accent `#FFFFFF`).
- **Inspiration** : le projet **Nexty** (style « tech / lumineux », léger *glow* sur l'accent, marqué en sombre).
- Toute couleur passe par une variable CSS de `variables.scss` — **jamais** de couleur en dur.
- **Transitions d'apparition** : le contenu apparaît en **fondu + léger mouvement** (comme s'il
  « arrivait »). Les **listes** affichent leurs éléments avec un **léger décalage progressif**
  (effet « vague » au chargement).
- **Grosses listes** : **chargement par batch** — on charge X éléments, puis X de plus à l'approche du
  bas de la liste, plutôt que tout charger d'un coup.

### Dates & heures
- Toute manipulation de date/heure passe par **dayjs** (locale **française**, format 24 h) — jamais de
  calcul de fuseau à la main.
- Les **coups d'envoi** des matchs sont stockés et affichés en **heure de Paris** (Europe/Paris).

### Safe areas & adaptations natives Android (`MainActivity.java`)
- **Edge-to-edge automatique** : `app-header` dans `<ion-header>` + `<ion-content [fullscreen]="true">`.
  Ne pas appeler `StatusBar.setOverlaysWebView`. Appliquer `--safe-top`/`--safe-bottom`
  (`env(safe-area-inset-*)`) en padding sur header/navbar. Prérequis outils récents (Capacitor ≥ 8.4,
  AGP 9.x, `@capacitor/keyboard` ≥ 8.0.5) — voir le détail dans les projets de référence si besoin.
- **Trois correctifs natifs vivent dans `frontend/android/.../MainActivity.java`** (Android « ancien » ne
  gère pas ces cas comme les versions récentes ; chaque méthode est commentée en détail) :
  - **`exposeSafeAreaTop`** : sur Android 9, la WebView renvoie souvent `env(safe-area-inset-top) = 0`. On
    lit la hauteur réelle des barres système et on l'injecte dans `--safe-top-native` ; `variables.scss`
    combine les deux via `--safe-top: max(env(safe-area-inset-top), var(--safe-top-native, 0px))`.
  - **`applyDarkNavigationBar`** : barre de navigation Android toujours **noire à boutons blancs** (tous
    thèmes). Ré-appliquée à chaque `onWindowFocusChanged` car, sur API < 30, le flag d'apparence est
    réécrasé au démarrage.
  - **`enableKeyboardResize`** : réplique de `adjustResize` **uniquement sur API < 30** (insets IME non
    fiables en edge-to-edge avant Android 11). Un `OnGlobalLayoutListener` rétrécit le conteneur de la
    WebView à l'ouverture du clavier → tout le contenu remonte. Sur API ≥ 30, `adjustResize` (manifest)
    suffit ; on **ne double pas** le redimensionnement. Le `resizeOnFullScreen` du plugin Keyboard est
    laissé à `false` (il ne fonctionnait pas sur API < 30 et ferait doublon sur API ≥ 30).

---

## Backend

Architecture en **couches**, une requête suit toujours le même flux :

```
server.js  (route + middlewares)
   → scripts/xxx.js   (valide request.body, orchestre)
      → sql/sqlXxx.js (requêtes SQL préparées)
   → util/message.js  (formate la réponse : sendMessage / sendError)
```

### Structuration des fichiers
Sous `backend/` :
- `server.js` : **à la racine du dossier**. Configure Express, les middlewares (json, cors, **auth**),
  enregistre **une route par fichier de `scripts/`**, monte **Socket.IO**, puis un middleware d'erreur attrape-tout.
- `scripts/` : une méthode par fichier (`xxx.js` exportant `xxx`). Reçoit `(request, result)`,
  **valide la présence des champs** de `request.body`, appelle la couche `sql/`, renvoie via `util/message`.
- `sql/` : les requêtes SQL, en **requêtes préparées** (placeholders `?`, jamais de concaténation).
  - `sql/sqlConnect.js` : ouvre la base **SQLite** (`better-sqlite3`) et expose des helpers (`get`, `all`, `run`).
  - `sql/sqlConfig.js` : **constantes des noms de tables** (`users`, `competitions`, `teams`, `groups`,
    `matches`, `predictions`, `championBets`, `messages`) — renommer une table ne casse pas les requêtes.
  - `sql/sqlXxx.js` : une famille de requêtes par domaine.
- `socket/` : le **temps réel** (Socket.IO), analogue à `scripts/` mais pour les événements live.
  Un fichier `xxxSocket.js` exporte `registerXxxSocket(io)` : middleware d'auth du socket (handshake)
  + handlers d'événements. Branché dans `server.js`.
- `util/` : utilitaires transverses.
  - `util/message.js` : `sendMessage(res, data)` → `{ data }` ; `sendError(res, reason, statusCode = 400)` → `{ reason }`.
  - `util/auth.js` : middleware d'authentification (cf. ci-dessous).

### Enveloppe des réponses
- Succès → `sendMessage(res, data)` : `res.status(200).json({ data })`.
- Erreur → `sendError(res, reason, statusCode)` : `res.status(statusCode).json({ reason })`.
- **Codes de statut** : `200/201` succès, `400` données invalides, `401` non authentifié,
  `403` interdit (non-admin, ou prono verrouillé), `404` introuvable, `409` conflit.

### Authentification (spécifique à ce projet)
- Deux routes **publiques** à l'onboarding : `/createAccount` (création) et `/login` (connexion à un
  compte existant via son `auth_token`, pour un changement d'appareil). Elles partagent le même
  rate-limit anti-flood. Toute **autre** requête porte le header `Authorization: Bearer <auth_token>`.
- Un middleware (`util/auth.js`) résout l'utilisateur via son `auth_token` (table `users`) et
  l'attache à `request` ; il répond `401` si le token est absent/inconnu.
- Les routes **admin** exigent en plus `request.user.is_admin` (sinon `403`).
- Rappel sécurité : `auth_token` est **secret** (jamais renvoyé dans une liste/profil) ; `id` est public
  (cf. `docs/modele-de-donnees.md`).

### Temps réel (chat)
- Le **chat global** passe par **Socket.IO** (événements live) + une route REST pour l'historique.
  Le socket est authentifié avec le même `auth_token` (via `socket.handshake.auth.token`), résolu par
  un `io.use(...)` dans `socket/chatSocket.js`.
- **Écriture via events, lecture via REST** : l'**envoi** (`message:send`) et la **suppression**
  (`message:delete`) sont des events diffusés à tous (`io.emit("message:new" / "message:deleted")`) ;
  seul l'**historique** (paginé par batch) passe par une route REST (`/messages`).
- Suppression autorisée à l'**auteur** du message **ou** à l'**admin**.

### CORS & écoute
- CORS activé pour autoriser les appels de la WebView Capacitor / du serveur de dev Ionic.
- En production, le serveur tourne derrière un reverse-proxy (Caddy, HTTPS). Voir `docs/stack-technique.md`.

---

## Communication front/back

- **Seul `MessageService`** (frontend) parle au backend. Une page/composant ne fait jamais d'appel HTTP direct.
- `sendMessage(route, data)` construit l'URL (`environment.BACKEND_URL + route`), ajoute le header
  `Authorization: Bearer <auth_token>` (lu depuis `StorageService`), poste en JSON et renvoie la réponse.
- Type de réponse : `interface BackendResponse { ok: boolean; status: number; data?: any; reason?: string;
  attemptsLeft?: number | null; offline?: boolean }`. On teste **`ok`** ; en succès on lit `data`, en échec `reason`.
- **Mode hors-ligne** : chaque **lecture** réussie est mise en cache (`OfflineCacheService`). Serveur injoignable
  (`status 0`) → `MessageService` ressert le cache (`offline: true`) et bascule `NetworkService` en hors-ligne ;
  les **écritures** (`/create*`, `/set*`, `/update*`) échouent alors proprement (lecture seule).
- Le frontend **ne gère pas de db locale structurée** (les données vivent côté serveur) : `StorageService`
  ne stocke que des clés simples (`auth_token`, `fcm_token`, préférences de notif, `version`, `theme`) et le
  **cache des réponses** de lecture (clés `cache:*`, via `OfflineCacheService`).

---

## Modèle de données

- **Source de vérité** : `docs/modele-de-donnees.md` (8 tables + schéma relationnel).
- **Conventions de nommage SQL** : tables en `camelCase` (`championBets`), colonnes en `snake_case`
  (`is_admin`, `created_at`). Booléens en `0/1`, dates en texte ISO 8601.
- **Ne pas stocker ce qui se calcule** — sauf **snapshot** volontaire pour figer l'historique
  (cotes figées au coup d'envoi, `points_awarded`), car le barème est paramétrable.

---

## Versionnage

**Version unique pour tout le monorepo.** Front et back évoluent au **même rythme** : même un
changement qui ne touche que le backend fait évoluer l'app du point de vue de l'utilisateur (bug
corrigé, optimisation). Il n'y a donc **qu'une seule version applicative** (`appVersionDisplay`), qui
couvre front + back.

Deux numéros **indépendants**, tous deux dans `VersionHandlerService` (frontend) :
- **`appVersion`** (entier) : version du **format des données** (stockage local). N'évolue **QUE** en
  cas de migration réellement nécessaire ; on l'incrémente d'1 et on ajoute la migration `updateToVx()`.
- **`appVersionDisplay`** (chaîne) : version **commerciale** affichée à l'utilisateur. Doit **toujours**
  correspondre au `versionName` de `frontend/android/app/build.gradle`.

**Ampleur d'une version, selon l'impact de la modification** (à partir de `1.0`) :
- **Majeure** (`2.0`) : rupture ou refonte, grosse nouvelle fonctionnalité, changement structurant de l'expérience.
- **Mineure** (`1.1`) : nouvelle fonctionnalité, amélioration notable, optimisation perceptible.
- **Correctif** (`1.0.1`) : correction de bug, petite optimisation, **changement backend à faible impact frontend**.

**À chaque changement de version commerciale** :
1. **Demander à l'utilisateur l'ampleur** : majeure (`2.0`), mineure (`1.2`) ou correctif (`1.1.1`).
2. Mettre à jour de façon **synchronisée** : `appVersionDisplay`, `versionName` **et** `versionCode`
   (+1, toujours croissant) dans `build.gradle`, et une entrée en tête des notes de version.
3. Ne **pas** toucher `appVersion` sauf migration réellement nécessaire.
4. **Vérifier la cohérence** de `README.md` et `CLAUDE.md` avant le commit.

---

## Workflow

- **Toujours démarrer un correctif ou une fonctionnalité par un TODO structuré** : un fichier
  `TODO_*.md` dans `docs/TODOs/`, points **ordonnés par priorité**, avec pour chacun le
  **constat/symptôme**, la **méthode**, les **limites** et les **questions à trancher**. On formalise
  (et on tranche les questions) **avant** d'implémenter, puis on coche les points au fur et à mesure.
- **Nommage des TODO** : pour une version, `TODO_vX_Y.md` ; les autres chantiers gardent un nom
  descriptif (`TODO_STYLE.md`…).
- **Implémentation** : un point à la fois. Après chaque point, vérifier côté frontend
  `npx tsc --noEmit -p tsconfig.app.json` + `npm run lint` (+ `npm run build` pour un changement SCSS
  ou de structure) ; côté backend, s'assurer que le serveur démarre sans erreur.

---

## Git / GitHub

- **Nom du commit** : minimaliste, uniquement le **numéro de version** de l'application
  (= `appVersionDisplay` de `VersionHandlerService`).
- **Description du commit** : liste des features ajoutées.
- **JAMAIS** de trailer `Co-Authored-By: Claude` dans les commits (cette convention utilisateur
  **prime** sur le comportement par défaut du harnais).
- **Garde-fou version** : avant de commit, comparer `appVersionDisplay` au nom du dernier commit.
  Si identiques (variable non incrémentée), **ne pas commit** et le signaler, pour éviter de publier
  deux fois sous le même nom de version.
