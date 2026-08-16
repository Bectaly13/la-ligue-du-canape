# La Ligue du Canapé 🛋️⚽

Application mobile de **pronostics de football** entre proches (famille & amis), façon
« Mon Petit Prono », pour les compétitions non couvertes par MPP. Chacun pronostique les scores
depuis son canapé, gagne des points selon des **cotes dynamiques**, et s'affronte dans un
**classement** convivial — avec chambrage via un **chat** en temps réel.

> **Monorepo** — frontend **Ionic 8 / Angular 20** (standalone) + Capacitor, et backend
> **Node.js / Express 5** avec base **SQLite**, hébergé 24/7 sur une VM Oracle Cloud.
>
> Version applicative actuelle : **1.0.1** · Première compétition couverte : **Ligue des Nations 2027**.

---

## Fonctionnalités

- **Pronostics de score** sur chaque match, avec **cotes dynamiques** à somme constante (pari-mutuel :
  plus une issue est pariée, moins elle rapporte) et **bonus de score exact**.
- **Pari « vainqueur du tournoi »** avant le coup d'envoi, avec compte à rebours.
- **Classement** général par compétition (points, bons pronos, pronos exacts) avec départage.
- **Phase de poules** (classements calculés) et **bracket** à élimination directe (matchs simples ou
  **aller-retour**), rempli automatiquement puis ajustable par l'admin.
- **Chat global** en temps réel (Socket.IO).
- **Notifications** : rappels locaux avant match + push « score » après match (FCM).
- **Mode hors-ligne** (lecture depuis la dernière version connue) et **thèmes** (défaut / clair / sombre).
- **Espace admin** : saisie des résultats, placement du bracket, message d'accueil.

Le détail fonctionnel vit dans [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md).

## Stack technique

| | Technologies |
|---|---|
| **Frontend** | Ionic 8, Angular 20 (standalone), Capacitor 8 (Android), dayjs |
| **Backend** | Node.js, Express 5, better-sqlite3 (SQLite), Socket.IO, firebase-admin (FCM) |
| **Hébergement** | VM Oracle Cloud « Always Free », Caddy (HTTPS), PM2 |

Voir [`docs/stack-technique.md`](docs/stack-technique.md) pour les choix et l'architecture de déploiement.

## Structure du monorepo

```
ligue-des-nations-2027/
├── docs/         Specs (cahier des charges, stack, modèle de données) + TODOs
├── backend/      Express 5 + SQLite + Socket.IO  (server.js à la racine du dossier)
└── frontend/     Ionic 8 / Angular 20 (standalone) + Capacitor
```

## Prérequis

- **Node.js** (LTS récente) et **npm**.
- Cloner le dépôt, puis installer les dépendances de chaque package :

```bash
git clone https://github.com/Bectaly13/la-ligue-du-canape.git
cd la-ligue-du-canape

(cd backend  && npm install)
(cd frontend && npm install)
```

> Sous WSL / disque Windows (`/mnt/c`), la surveillance de fichiers native ne se déclenche pas
> correctement : les scripts `dev` ci-dessous utilisent du **polling**.

## Lancement en développement

**Backend** (API sur `http://localhost:3000`) :

```bash
cd backend
npm run dev      # nodemon -L (polling) ; ou `npm start` en simple
```

**Frontend** (sur `http://localhost:4200`) :

```bash
cd frontend
npm run dev      # ng serve --poll=2000 (rafraîchissement à chaud sous WSL)
```

Le CORS backend est permissif : le frontend de dev peut appeler l'API en local.

## Vérifications & build

Depuis `frontend/` :

```bash
npx tsc --noEmit -p tsconfig.app.json   # typage
npm run lint                            # lint
npm run build                           # build de production (dossier www/)
```

Côté backend, s'assurer que le serveur démarre sans erreur (`npm start`). Les migrations légères du
schéma SQLite s'appliquent au démarrage.

## Données & seed

Le schéma SQLite (source de vérité) est décrit dans
[`docs/modele-de-donnees.md`](docs/modele-de-donnees.md). Un **seed unique** met en place la compétition
complète (compétition + poules + équipes + matchs de poule + phase finale) :

```bash
cd backend
node seed/seedLdn2027.js   # idempotent ; à ne relancer qu'avant le début du tournoi (reset complet)
```

## Secrets (hors dépôt)

Ne sont **jamais** versionnés (voir `.gitignore`) :

- `backend/secrets/access.json` — **code d'accès** partagé, exigé à l'inscription (garde-fou anti-flood ;
  jamais embarqué dans l'APK). Un `access.json.example` sert de modèle.
- `backend/secrets/firebase.json` — clé de compte de service **FCM** (push), présente uniquement sur la VM.
- `frontend/android/app/google-services.json` — config Firebase Android.

## Documentation

- [`docs/cahier-des-charges.md`](docs/cahier-des-charges.md) — cahier des charges fonctionnel
- [`docs/stack-technique.md`](docs/stack-technique.md) — stack & architecture de déploiement
- [`docs/modele-de-donnees.md`](docs/modele-de-donnees.md) — schéma de la base SQLite
- [`CLAUDE.md`](CLAUDE.md) — **conventions de code** du projet

*(Le runbook de déploiement et la configuration Firebase restent hors dépôt : ils contiennent les
coordonnées réelles du serveur.)*

## Versionnage

**Une seule version applicative** pour tout le monorepo (front et back évoluent au même rythme) :
`appVersionDisplay` dans `VersionHandlerService`, qui doit correspondre au `versionName` de
`frontend/android/app/build.gradle`. Détails et règles d'incrément dans [`CLAUDE.md`](CLAUDE.md).

## Licence

Distribué sous licence **MIT** — voir le fichier [`LICENSE`](LICENSE). © 2026 Dorian CADENEL.
