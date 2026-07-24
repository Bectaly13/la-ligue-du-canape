import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  // Service de stockage local : clés simples (auth_token, user, préférences…).

  private _storage!: Storage;

  // Promesse d'initialisation : lancée dans le constructeur, attendue par chaque
  // méthode pour garantir que _storage est prêt avant toute lecture/écriture.
  private readonly ready: Promise<void>;

  constructor(private storage: Storage) {
    this.ready = this.init();
  }

  private async init() {
    this._storage = await this.storage.create();
  }

  public async set(key: string, value: any) {
    await this.ready;
    await this._storage.set(key, value);
  }

  public async get(key: string) {
    await this.ready;
    return await this._storage.get(key);
  }

  public async remove(key: string) {
    await this.ready;
    await this._storage.remove(key);
  }

  // Liste toutes les clés stockées (sert à la purge sélective du cache hors-ligne).
  public async keys(): Promise<string[]> {
    await this.ready;
    return await this._storage.keys();
  }
}
