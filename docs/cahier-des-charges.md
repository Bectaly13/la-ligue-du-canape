# Cahier des charges fonctionnel

> Application mobile de pronostics de football entre proches, façon « Mon Petit Prono »,
> conçue au départ pour la **Ligue des Nations 2027** mais pensée pour être **réutilisable**
> sur n'importe quelle compétition.

Document **fonctionnel** : il décrit le comportement attendu de l'application, sans choix technique
ni détail d'implémentation. Les valeurs numériques citées sont des paramètres ajustables (§13).

---

## 1. Présentation & objectif

Application mobile permettant à un cercle restreint (famille, amis) de **pronostiquer** les
résultats des matchs d'une compétition de football et de s'affronter dans un **classement**
convivial, avec chambrage. Rien de sérieux, pas d'argent réel.

Le produit, **La Ligue du Canapé**, porte un nom volontairement **générique** (non lié à une
compétition précise), afin d'être réutilisé d'un tournoi à l'autre.

## 2. Périmètre & principes généraux

- **Plateforme :** application mobile (le détail des cibles iOS/Android relève du volet technique, hors de ce document).
- **Compétition générique :** l'app doit pouvoir couvrir n'importe quelle compétition de sélections
  (phase de poules + phase à élimination directe). La Ligue des Nations 2027 est la première instance.
- **Un seul groupe de joueurs :** pas de notion de groupes d'utilisateurs. **Toute la base de joueurs
  de l'app forme l'unique groupe** qui s'affronte. (À ne pas confondre avec les « poules/groupes »
  de la compétition, qui désignent les groupes d'**équipes** — voir §8.3.)

## 3. Utilisateurs & rôles

| Rôle | Description |
|------|-------------|
| **Joueur** | Toute personne ayant installé l'app. Parie et apparaît au classement. |
| **Admin** | Un joueur particulier (il **parie aussi**, comme tout le monde) qui a en plus le droit de **saisir les résultats des matchs** et de **mettre à jour les affiches** d'élimination directe quand elles sont connues. |

Il y a **un seul admin**. L'admin n'a aucun avantage de jeu : il pronostique et est classé comme les autres.

## 4. Onboarding / inscription

- L'utilisateur **télécharge l'app** et la lance.
- Au **premier lancement**, il saisit un **nom / pseudo** et un **code d'accès** partagé (le même pour
  tout le cercle), communiqué de bouche-à-oreille. **Pas de compte email, pas d'invitation nominative.**
- Le code d'accès sert uniquement de **garde-fou anti-flood** : l'app étant distribuée en APK public,
  il empêche un inconnu de créer des comptes en masse. Il n'est **jamais embarqué dans l'APK** (saisi par
  l'utilisateur), et le nombre de tentatives est **limité** (anti-force brute). Une fois le compte créé,
  le code n'est plus redemandé.
- **Changement d'appareil :** plutôt que de créer un compte, l'utilisateur peut se **reconnecter à un
  compte existant** en saisissant son **jeton de récupération** (l'identifiant secret du compte, fourni
  par l'organisateur qui a accès à la base). Un jeton valide ré-authentifie l'appareil et redonne accès
  à l'historique et au classement. Cette voie d'accès partage le même **quota anti-flood** que la création.

## 5. Principe de jeu

### 5.1. Pari sur le vainqueur de la compétition
- **Avant le début de la compétition**, chaque joueur parie sur **l'équipe qui remportera le tournoi**.
- Ce pari est **verrouillé au coup d'envoi du tout premier match** de la compétition.
- Résolution et attribution des points **à la fin du tournoi** (voir §6.3).

### 5.2. Pari sur le score d'un match
- Avant chaque match, le joueur parie sur le **score exact** du match.
- Le score pronostiqué détermine automatiquement l'**issue** pariée parmi 3 : **équipe A gagne**,
  **match nul**, **équipe B gagne**.
- **Matchs à élimination directe :** on parie sur le **score à la 120ᵉ minute** (fin des
  prolongations). Pronostiquer un **match nul** signifie parier que **le match ira aux tirs au but**.

### 5.3. Fenêtre de pari & verrouillage
- On peut **créer ou modifier** son prono d'un match **tant que le coup d'envoi n'a pas eu lieu**.
- **Dès le coup d'envoi**, le prono est **figé** (plus aucune modification possible).
- **Élimination directe (équipes pas connues à l'avance) :** le pari sur un match devient possible
  **dès que les deux adversaires sont connus** (donc dès que l'affiche est déterminée).
- **Ne pas parier un match = 0 point** pour ce match (aucune pénalité).

## 6. Système de points

### 6.1. Cotes dynamiques des matchs (à somme constante)

Chaque match dispose d'un **pot global de 300 points** réparti sur les 3 issues. Les cotes
s'ajustent selon la **répartition des pronos** : plus une issue est pariée, plus sa cote baisse.

Soit `p_i` la **part** des parieurs ayant choisi l'issue `i` (calculée parmi les joueurs ayant parié ce match) :

> **cote(i) = 100 + k · (⅓ − p_i)**  *(arrondie)*, avec **k = 1,5 × (100 − plancher)**

Le **plancher** est la cote minimale garantie ; il est **intégré à la formule** (pas appliqué après coup),
ce qui préserve toutes les propriétés ci-dessous. Valeur par défaut : **plancher = 30** → `k = 105`,
soit **cote(i) = 135 − 105·p_i**, bornée dans **[30 ; 135]**.

Propriétés :
- La somme des trois cotes vaut **toujours 300**.
- Répartition égale (chaque issue à ⅓) → **cote = 100** pour chacune (état par défaut, avant tout pari),
  **quel que soit le plancher**.
- Issue sur-pariée → cote **< 100** (jamais sous le **plancher**) ; issue délaissée → cote **> 100**
  (jamais au-dessus du plafond `150 − plancher/2`).
- Les cotes ne dépendent que de la **proportion** de parieurs, **jamais du nombre total de joueurs**.
- La cote est **le gain de chaque bon parieur, non divisé** : si plusieurs joueurs ont pronostiqué
  la bonne issue, **chacun** touche la cote (elle n'est pas partagée entre eux).
- Poser `plancher = 0` redonne exactement la formule linéaire simple `150 × (1 − p_i)`.

Les cotes se **fixent au coup d'envoi** (sur la base de la répartition finale des pronos).

> **Exemple** — 8 joueurs, 6 parient « A », 1 « nul », 1 « B » (plancher = 30) :
> cote(A) ≈ 56, cote(nul) ≈ 122, cote(B) ≈ 122 (somme = 300).

*Note de réglage :* la formule linéaire ci-dessus est volontairement douce et sans cas limite.
Une variante logarithmique pourra être introduite plus tard si l'on souhaite **accentuer** la
récompense des issues rares.

### 6.2. Points d'un match
Pour un match donné, un joueur gagne :
- **Bonne issue** (bon vainqueur, ou bon « nul/tirs au but ») → **la cote de l'issue** (§6.1).
- **Bonus « score exact »** → si le score pronostiqué est exactement le bon (à la 120ᵉ pour l'élim
  directe), **bonus fixe supplémentaire** de **30 points** *(valeur ajustable, plage envisagée 20–50)*.
- **Mauvaise issue** → **0 point**.

### 6.3. Bonus « vainqueur de la compétition »
- Si le joueur a désigné avant le tournoi la **bonne équipe championne**, il gagne un **bonus fixe
  de 200 points** *(valeur ajustable, cf. §13)*, **non réparti** (indépendant du nombre de joueurs l'ayant deviné).
- Attribué **à la fin de la compétition**.

## 7. Classement des joueurs

Classement général unique, affichant pour chaque joueur :
- le **total de points**,
- le **nombre de bons pronos** (bonne issue devinée),
- le **nombre de pronos exacts** (score exact deviné).

**Départage en cas d'égalité de points**, dans l'ordre :
1. plus grand nombre de **bons vainqueurs** (bonnes issues) ;
2. puis plus grand nombre de **pronos exacts** ;
3. si toujours égalité → **ex æquo**.

## 8. Écrans & fonctionnalités

### 8.1. Matchs à venir
Liste des matchs programmés avec **date et heure**. Accès au prono pour chaque match ouvert.

### 8.2. Matchs joués
Liste des matchs terminés avec **date/heure, score final, et points gagnés (ou non)** par le joueur.

### 8.3. Poules de la compétition
Pour la phase de groupes : affichage des **groupes d'équipes** (poules A, B, C…) sous forme de
**tableau de classement** (points, différence de buts / goal-average, etc.). **Calculé
automatiquement** à partir des scores saisis par l'admin.

### 8.4. Bracket (phase à élimination directe)
**Arbre des rencontres** de la phase finale, **mis à jour automatiquement** au fil des
qualifications (voir §10).

### 8.5. Chat global
Un **chat unique** commun à tous les joueurs (chambrage, discussions). **Aucune modération** :
l'app est réservée à un cercle privé de proches.

### 8.6. Profils des autres joueurs
Depuis un profil, on peut consulter :
- le **total de points** du joueur ;
- ses **pronos passés** (figés, une fois les matchs verrouillés) ;
- ses **pronos futurs** — **mais uniquement après verrouillage du match concerné** (voir §11).

### 8.7. Historique des pronos
Chaque joueur peut consulter l'**historique de ses propres pronos** ainsi que ceux des autres
(dans les limites de confidentialité du §11).

### 8.8. Historique & archivage des compétitions
Une **compétition terminée reste entièrement consultable** en archive : **tous les pronos**, le
**classement général final**, et les **profils des joueurs** (avec leurs pronos passés) demeurent
accessibles. Chaque compétition possède son **propre classement** ; le lancement d'une nouvelle
compétition n'écrase pas l'historique des précédentes.

## 9. Administration

- L'admin **saisit les résultats** (scores) des matchs.
- Cette saisie **déclenche le calcul des points** de tous les joueurs pour le match concerné.
- L'admin **met à jour les affiches** d'élimination directe lorsque nécessaire (cf. calculs auto §10).

## 10. Calculs automatiques

À partir des seuls **scores saisis par l'admin**, l'application recalcule automatiquement :
1. les **classements des poules** (points / goal-average / etc.) ;
2. la **qualification vers les premiers matchs à élimination directe** : la structure du tableau
   étant connue (ex. « 1ᵉʳ du groupe A » joue tel 8ᵉ / quart), l'app **place automatiquement** les
   équipes qualifiées dans les bonnes affiches ;
3. la **progression dans le bracket** : les vainqueurs des matchs à élimination directe sont
   **automatiquement reportés** dans le tour suivant.

## 11. Confidentialité des pronos

- **Avant le coup d'envoi d'un match**, un joueur ne voit **que ses propres pronos**. Les pronos des
  autres joueurs pour ce match sont **cachés**.
- Les pronos d'un match ne deviennent **visibles par les autres** qu'**après le verrouillage** (coup d'envoi).
- Seule la **cote du match** est **publique** en amont — elle reflète l'agrégat et **ne révèle le
  prono d'aucun joueur en particulier**.

## 12. Notifications

- **Avant un match :** rappel **1 heure avant** et **15 minutes avant** le coup d'envoi.
- **Après un match :** notification du **score exact**.
  - Ces notifications de résultat sont **désactivables** par le joueur (pour éviter le spoil).
- **Annonce de l'organisateur :** lorsque l'admin publie ou modifie le **message d'accueil**, un push
  est envoyé aux joueurs, désactivable via un **toggle dédié « Annonces »** (au même titre que les
  rappels et les scores). Aucun envoi si le message est enregistré sans changement.

## 13. Paramètres ajustables (valeurs par défaut)

| Paramètre | Valeur par défaut | Remarque |
|-----------|-------------------|----------|
| Pot global par match | **300 pts** | Base des cotes (§6.1). |
| Formule de cote | **100 + k·(⅓ − p)**, k = 1,5×(100 − plancher) | Variante log possible ultérieurement. |
| Plancher de cote | **30 pts** | Cote minimale garantie, intégrée à la formule. |
| Bonus score exact | **30 pts** | Plage envisagée 20–50. |
| Bonus vainqueur du tournoi | **200 pts** | Fixe, non réparti. |
| Valeur des matchs | **identique pour tous** | Option non retenue : surpondérer l'élim directe / la finale. |

## 14. Paramètres à affiner

Les **valeurs exactes** des paramètres du §13 sont ajustées à l'usage, au fil des retours des joueurs.
