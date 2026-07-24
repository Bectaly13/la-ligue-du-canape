import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Une ligne de classement : identité brève du joueur + ses totaux et son rang pour la compétition.
export interface LeaderboardEntry {
  id: number;
  name: string;
  photo: string | null;
  is_admin: number;
  points: number;
  correct: number;
  exact: number;
  rank: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  constructor(
    private message: MessageService
  ) { }

  // Classement des joueurs pour la compétition donnée (ordre : points, bons pronos, scores exacts).
  async getLeaderboard(competitionId: number): Promise<LeaderboardEntry[]> {
    const response = await this.message.sendMessage("/leaderboard", { competitionId });
    return response.ok ? response.data : [];
  }
}
