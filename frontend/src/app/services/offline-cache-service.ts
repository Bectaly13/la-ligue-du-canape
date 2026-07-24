import { Injectable } from '@angular/core';

import { StorageService } from './storage-service';

// Cache local des réponses de LECTURE du backend (dernière version connue), pour le mode hors-ligne.
// Enveloppe StorageService (boîte noire) : une clé par (route + paramètres). Sert de fallback quand le
// serveur est injoignable. N'entrepose que le payload `data` d'une réponse réussie.
const PREFIX = "cache:";

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {

  constructor(
    private storage: StorageService
  ) { }

  // Clé de cache : la route + ses paramètres (deux requêtes de paramètres différents sont distinctes).
  private key(route: string, data: any): string {
    return `${PREFIX}${route}:${JSON.stringify(data ?? {})}`;
  }

  // Met en cache le payload d'une réponse réussie.
  async save(route: string, data: any, payload: any): Promise<void> {
    await this.storage.set(this.key(route, data), payload);
  }

  // Renvoie le payload en cache pour cette requête, ou undefined s'il n'y en a pas.
  async load(route: string, data: any): Promise<any> {
    return await this.storage.get(this.key(route, data));
  }

  // Purge tout le cache (ex. réinitialisation d'identité — ne pas garder les données d'un autre compte).
  async clear(): Promise<void> {
    const keys = await this.storage.keys();
    await Promise.all(keys.filter((k) => k.startsWith(PREFIX)).map((k) => this.storage.remove(k)));
  }
}
