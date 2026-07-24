import { Injectable } from '@angular/core';

import { MessageService } from './message-service';
import { StorageService } from './storage-service';

export interface Competition {
  id: number;
  name: string;
  start_at: string;
  end_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CompetitionService {
  // Liste des compétitions (chargée depuis le serveur) et compétition sélectionnée.
  // La sélection est persistée en local (clé "selectedCompetitionId") pour survivre entre sessions.
  private competitions: Competition[] = [];
  private selectedId: number | null = null;

  constructor(
    private message: MessageService,
    private storage: StorageService
  ) { }

  // Charge la liste des compétitions depuis le serveur.
  async loadCompetitions(): Promise<Competition[]> {
    const response = await this.message.sendMessage("/competitions");
    this.competitions = response.ok ? response.data : [];
    return this.competitions;
  }

  getCompetitions(): Competition[] {
    return this.competitions;
  }

  // Id de la compétition sélectionnée (depuis le cache mémoire ou le stockage local).
  async getSelectedId(): Promise<number | null> {
    if (this.selectedId !== null) {
      return this.selectedId;
    }
    this.selectedId = (await this.storage.get("selectedCompetitionId")) ?? null;
    return this.selectedId;
  }

  // Change la compétition sélectionnée et la persiste.
  async setSelectedId(id: number): Promise<void> {
    this.selectedId = id;
    await this.storage.set("selectedCompetitionId", id);
  }

  // Sélection par défaut : la compétition dont la date de début est la plus imminente (la prochaine à
  // commencer) ; si toutes sont déjà commencées/finies, celle dont la date de début est la plus récente.
  computeDefault(competitions: Competition[], todayIso: string): Competition | null {
    if (!competitions.length) {
      return null;
    }
    const upcoming = competitions
      .filter((c) => c.start_at > todayIso)
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
    if (upcoming.length) {
      return upcoming[0];
    }
    return [...competitions].sort((a, b) => b.start_at.localeCompare(a.start_at))[0];
  }

  // Garantit une sélection : si rien n'est stocké (nouvel utilisateur), calcule et persiste le défaut.
  async ensureSelection(): Promise<number | null> {
    let id = await this.getSelectedId();
    if (id === null && this.competitions.length) {
      const today = new Date().toISOString().slice(0, 10);
      const def = this.computeDefault(this.competitions, today);
      if (def) {
        await this.setSelectedId(def.id);
        id = def.id;
      }
    }
    return id;
  }
}
