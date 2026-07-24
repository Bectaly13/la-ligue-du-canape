# Stack technique & architecture

> Choix techniques du projet. Complète le [cahier des charges fonctionnel](./cahier-des-charges.md).
> Objectif directeur : **gratuit**, **disponible 24/7 sur Internet**, à l'échelle d'un cercle
> familial/amical (effectif réduit).

Les valeurs chiffrées de ce document sont des choix par défaut, ajustables (§7).

---

## 1. Vue d'ensemble

```
 📱 App Android (Ionic + Capacitor)
        │  HTTPS
        ▼
 🌐 Caddy (reverse proxy + HTTPS auto)      ┐
        │                                    │  sur 1 VM Oracle Cloud
 🟢 Node.js + Express  ── Socket.IO (chat)   │  Ubuntu LTS, "Always Free"
        │                                    │  PM2 = redémarrage auto
 🗄️ SQLite (fichier local)                   ┘
        ▲
 🔔 Firebase Cloud Messaging (push Android, gratuit)
```

## 2. Frontend mobile

- **Ionic + Capacitor** (stack maîtrisée, nombreux projets antérieurs sur cette base).
- **Android uniquement pour l'instant** (décision assumée) :
  - Distribution possible **directement en APK** (hors store) → **gratuit**.
  - **iOS reporté** : nécessiterait un compte **Apple Developer à 99 €/an** (installation + push APNs).
    À réévaluer plus tard si besoin.
- **Notifications :**
  - Rappels **1 h / 15 min avant match** → **notifications locales** planifiées côté téléphone
    (plugin Capacitor *Local Notifications*), **sans serveur**.
  - Notification **« score exact » après match** → **push serveur** via **Firebase Cloud Messaging
    (FCM)**, gratuit sur Android (événement imprévisible, impossible à planifier côté client).
- **Mode hors-ligne (lecture)** : les données vivant côté serveur, l'app **met en cache la réponse de
  chaque lecture** réussie (via le stockage local). Serveur injoignable → on ressert la **dernière
  version connue** + un **bandeau « hors-ligne »** ; les écritures sont alors bloquées (lecture seule).
  Pas de base locale structurée (on ne duplique pas la logique backend).

## 3. Backend

- **Node.js + Express** (stack maîtrisée). Déploiement d'un **répertoire complet** (pas un simple
  script), point d'entrée `server.js`.
- **PM2** comme gestionnaire de process : relance automatique en cas de crash ou de redémarrage de la VM.
- **Temps réel (chat global)** : **Socket.IO** (WebSocket), rendu possible par un serveur **persistant**
  (contrairement aux PaaS gratuits qui se mettent en veille).
- **Base de données : SQLite** (fichier local sur la VM).
  - Justification : zéro service externe à administrer, gratuit, largement suffisant à cette échelle,
    sauvegarde = simple copie du fichier.
- **HTTPS obligatoire** : Android bloque par défaut le trafic en clair (cleartext). Assuré par Caddy (§5).
- **Authentification & anti-flood** : chaque requête (sauf création de compte et connexion) porte un
  `auth_token` secret. Deux routes **publiques** à l'onboarding : la **création de compte** (protégée par
  un **code d'accès** partagé, jamais embarqué dans l'APK, comparé en temps constant) et la **connexion**
  à un compte existant via son `auth_token` (récupération lors d'un changement d'appareil). Les deux
  partagent un **rate-limit par IP** (anti-force brute), l'APK étant distribué publiquement.

## 4. Hébergement : Oracle Cloud « Always Free »

Choisi car c'est la **seule catégorie d'offre réellement gratuite ET disponible 24/7** : une VM que
l'on administre soi-même (les PaaS gratuits type Render s'endorment après ~15 min d'inactivité, ce
qui casserait le chat WebSocket et le 24/7).

- **Machine :** VM **ARM Ampere A1** (jusqu'à **2 OCPU / 12 Go RAM** en *always free*, limite abaissée
  en juin 2026). **Repli** si capacité ARM saturée : VM **AMD micro** *always free* (plus modeste).
- **OS :** **Ubuntu LTS**.
- **Carte bancaire** demandée à la création (vérification d'identité, **aucun débit** tant qu'on reste
  dans les limites *always free*).
- ⚠️ **Réclamation des VM inactives :** Oracle peut récupérer une VM *always free* laissée inactive.
  **Parade (gratuite) :** basculer le compte en *Pay-As-You-Go* → on reste dans les limites *always
  free* (donc **0 €**), mais la VM n'est plus réclamée.
- **Régions :** au choix (contrairement à GCP e2-micro, limité aux US) → possibilité d'une région
  proche (Europe) pour une meilleure latence.

## 5. Réseau, HTTPS & nom de domaine

- **Caddy** en reverse proxy devant Node : **HTTPS automatique** (certificats Let's Encrypt renouvelés seuls).
- **Nom de domaine** (requis pour un certificat valide) :
  - **Par défaut : DuckDNS** (sous-domaine gratuit, ex. `monapp.duckdns.org`).
  - Alternative : vrai domaine (~10 €/an), plus propre.
- **Pare-feu :** attention, Oracle superpose **deux niveaux** (Security List / NSG côté cloud **+**
  pare-feu de l'OS). Ouvrir **80 et 443**. Point de vigilance classique.

## 6. Ce qu'implique l'administration de la VM

**Installation initiale (une fois) :** création compte + VM, connexion **SSH**, installation Node/PM2,
déploiement du répertoire, ouverture des ports, mise en place de Caddy.

**Maintenance courante (ponctuelle) :**
- **Mises à jour de sécurité** de l'OS (`apt upgrade`).
- **Sauvegarde** du fichier SQLite (copie).
- Supervision légère (PM2 gère l'essentiel automatiquement).

**Nature du « coût » :** c'est de la **responsabilité** (une mauvaise config peut exposer le serveur),
pas de l'argent. Gérable à cette échelle.

## 7. Coûts & paramètres

| Poste | Coût | Remarque |
|-------|------|----------|
| Hébergement (VM Oracle Always Free) | **0 €** | Dans les limites *always free*. |
| Base de données (SQLite) | **0 €** | Fichier local. |
| Push Android (FCM) | **0 €** | — |
| Distribution Android (APK) | **0 €** | Hors store. |
| Nom de domaine | **0 €** (DuckDNS) | ou ~10 €/an pour un vrai domaine. |
| **iOS (reporté)** | **99 €/an** | Compte Apple Developer, si un jour on cible iPhone. |

## 8. Points ouverts

- Choix du **nom de domaine** définitif (DuckDNS gratuit vs domaine payant).
- **Région** Oracle (proximité Europe vs disponibilité de capacité ARM).
- Éventuelle **publication sur le Play Store** (frais unique développeur Google ~25 $) vs distribution
  APK directe.
- Stratégie de **sauvegarde** (fréquence, copie hors-VM).
