import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Statistiques d'un joueur pour une compétition.
export interface Stats {
  predictions: number;  // nombre de pronos posés
  correct: number;      // bons vainqueurs devinés
  exact: number;        // scores exacts devinés
  points: number;       // total de points
  rank: number;         // classement dans la playerbase
  players: number;      // nombre de joueurs
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  constructor(
    private message: MessageService
  ) { }

  // Stats d'un joueur pour la compétition donnée : le joueur courant, ou un `userId` ciblé
  // (consultation du profil d'un tiers).
  async getStats(competitionId: number, userId?: number): Promise<Stats | null> {
    const body = userId ? { competitionId, userId } : { competitionId };
    const response = await this.message.sendMessage("/stats", body);
    return response.ok ? response.data : null;
  }
}
