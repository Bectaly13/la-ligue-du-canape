import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

import { NetworkService } from './network-service';
import { OfflineCacheService } from './offline-cache-service';
import { StorageService } from './storage-service';

// Réponse normalisée du backend, quel que soit le code HTTP :
// - succès (2xx) : { ok: true, data }
// - erreur        : { ok: false, reason }
// - hors-ligne    : { ok: true, data, offline: true } (réponse servie depuis le cache local)
export interface BackendResponse {
  ok: boolean;
  status: number;
  data?: any;
  reason?: string;
  // Tentatives restantes renvoyées par le rate-limiter (onboarding : gate + quota). null si non concerné.
  attemptsLeft?: number | null;
  // Vrai si la réponse vient du cache local (serveur injoignable) → « dernière version connue ».
  offline?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // Seul service à parler au backend. Ajoute automatiquement le header d'authentification (Bearer) si un
  // token est présent, met en cache les LECTURES réussies, et bascule sur ce cache si le serveur est
  // injoignable (mode hors-ligne, lecture seule).

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private cache: OfflineCacheService,
    private network: NetworkService
  ) { }

  // Route « action » : jamais mise en cache ni rejouée hors-ligne (lecture seule hors-ligne). Couvre les
  // écritures (create/set/update) et la connexion (login), qui est une action, pas une lecture.
  private isWriteRoute(route: string): boolean {
    return /^\/(create|set|update|login)/i.test(route);
  }

  // Envoie une requête POST au backend et renvoie une réponse normalisée.
  async sendMessage(route: string, data: any = {}): Promise<BackendResponse> {
    const url = environment.BACKEND_URL + route;

    // Le token est absent à l'onboarding (route publique), présent ensuite.
    const token = await this.storage.get("auth_token");
    const headers: { [key: string]: string } = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const isWrite = this.isWriteRoute(route);

    try {
      const body = await firstValueFrom(this.http.post<{ data: any }>(url, data, { headers }));
      this.network.setOffline(false);
      // On mémorise la dernière version connue des lectures (pour le fallback hors-ligne).
      if (!isWrite) {
        await this.cache.save(route, data, body.data);
      }
      return { ok: true, status: 200, data: body.data };
    } catch (error) {
      const httpError = error as HttpErrorResponse;

      // status 0 = serveur injoignable (hors-ligne). status >= 400 = le serveur a répondu (erreur métier).
      if (httpError.status === 0) {
        this.network.setOffline(true);
        if (!isWrite) {
          const cached = await this.cache.load(route, data);
          if (cached != null) {
            return { ok: true, status: 200, data: cached, offline: true };
          }
        }
        return { ok: false, status: 0, reason: "Hors-ligne — action indisponible pour l'instant." };
      }

      // Le serveur a répondu : on est en ligne, on renvoie l'erreur métier telle quelle.
      this.network.setOffline(false);
      return {
        ok: false,
        status: httpError.status,
        reason: httpError.error?.reason || "Erreur, réessaie plus tard.",
        attemptsLeft: httpError.error?.attemptsLeft ?? null
      };
    }
  }
}
