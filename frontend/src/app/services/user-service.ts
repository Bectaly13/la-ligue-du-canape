import { Injectable } from '@angular/core';

import { BackendResponse, MessageService } from './message-service';
import { OfflineCacheService } from './offline-cache-service';
import { StorageService } from './storage-service';

// Un joueur. `auth_token` n'est reçu qu'à la création (pour être stocké sur l'appareil) ; la route
// /me, elle, ne le renvoie jamais.
export interface User {
  id: number;
  name: string;
  is_admin: number;
  notif_enabled: number;
  reminder_notif_enabled: number;
  score_notif_enabled: number;
  announcement_notif_enabled: number;
  photo: string | null;
  created_at: string;
  auth_token?: string;
}

// Identité « brève » d'un membre, telle que visible par les autres joueurs (liste, profil tiers).
export interface Member {
  id: number;
  name: string;
  photo: string | null;
  is_admin: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Seul l'auth_token est persisté (localStorage). Le profil, propriété du SERVEUR, est récupéré via
  // /me et gardé uniquement EN MÉMOIRE (pas de données périmées).
  currentUser: User | null = null;

  constructor(
    private message: MessageService,
    private storage: StorageService,
    private cache: OfflineCacheService
  ) { }

  // L'appareil possède-t-il un token (donc un compte) ?
  async isOnboarded(): Promise<boolean> {
    return !!(await this.storage.get("auth_token"));
  }

  // Crée un compte à partir d'un pseudo et du code d'accès (gate anti-flood). En cas de succès, persiste
  // le token et met le profil en mémoire.
  async createAccount(name: string, code: string): Promise<BackendResponse> {
    const response = await this.message.sendMessage("/createAccount", { name, code });
    if (response.ok) {
      await this.storage.set("auth_token", response.data.auth_token);
      this.currentUser = response.data;
    }
    return response;
  }

  // Connexion à un compte EXISTANT via son auth_token (changement d'appareil). En cas de succès, persiste
  // le jeton saisi (rogné) et met le profil en mémoire. Le serveur renvoie le profil sanitisé (sans token).
  async loginWithToken(token: string): Promise<BackendResponse> {
    const trimmed = token.trim();
    const response = await this.message.sendMessage("/login", { token: trimmed });
    if (response.ok) {
      await this.storage.set("auth_token", trimmed);
      this.currentUser = response.data;
    }
    return response;
  }

  // Récupère le profil courant auprès du serveur. Réinitialise l'identité locale si le token est invalide (401).
  async fetchMe(): Promise<User | null> {
    const response = await this.message.sendMessage("/me");
    if (response.ok) {
      this.currentUser = response.data;
      return this.currentUser;
    }
    if (response.status === 401) {
      await this.clearIdentity();
    }
    return null;
  }

  // Met à jour le pseudo (met à jour le profil en mémoire en cas de succès).
  async updateName(name: string): Promise<BackendResponse> {
    const response = await this.message.sendMessage("/updateName", { name });
    if (response.ok) {
      this.currentUser = response.data;
    }
    return response;
  }

  // Met à jour la photo de profil (base64, ou null pour la retirer).
  async updatePhoto(photo: string | null): Promise<BackendResponse> {
    const response = await this.message.sendMessage("/updatePhoto", { photo });
    if (response.ok) {
      this.currentUser = response.data;
    }
    return response;
  }

  // Met à jour les préférences de notifications (global, rappels avant-match, scores post-match, annonces).
  async updateNotifPrefs(notifEnabled: boolean, reminderEnabled: boolean, scoreEnabled: boolean, announcementEnabled: boolean): Promise<BackendResponse> {
    const response = await this.message.sendMessage("/updateNotifPrefs", {
      notif_enabled: notifEnabled,
      reminder_notif_enabled: reminderEnabled,
      score_notif_enabled: scoreEnabled,
      announcement_notif_enabled: announcementEnabled
    });
    if (response.ok) {
      this.currentUser = response.data;
    }
    return response;
  }

  // Enregistre le token push (FCM) de l'appareil auprès du serveur.
  async updateFcmToken(token: string): Promise<BackendResponse> {
    return this.message.sendMessage("/updateFcmToken", { fcm_token: token });
  }

  // Liste des membres (identité brève) — pour le panneau Membres.
  async getUsers(): Promise<Member[]> {
    const response = await this.message.sendMessage("/users");
    return response.ok ? response.data : [];
  }

  // Profil (identité brève) d'un membre par son id — pour la page de profil d'un tiers.
  async getUser(id: number): Promise<Member | null> {
    const response = await this.message.sendMessage("/user", { userId: id });
    return response.ok ? response.data : null;
  }

  // Réinitialise l'identité locale (token périmé, changement de compte…) + purge le cache hors-ligne
  // (on ne garde pas les données d'un compte précédent).
  async clearIdentity(): Promise<void> {
    this.currentUser = null;
    await this.storage.remove("auth_token");
    await this.cache.clear();
  }
}
