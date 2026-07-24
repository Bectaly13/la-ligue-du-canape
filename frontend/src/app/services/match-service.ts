import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Résumé d'une équipe tel que renvoyé avec un match.
export interface TeamSummary {
  id: number;
  name: string;
  slug: string;
}

// Un match. team1/team2 peuvent être null en élimination directe (équipes pas encore connues).
// Les scores sont null tant que le match n'est pas terminé.
export interface Match {
  id: number;
  kickoff_at: string;
  stage: string;
  status: string;
  group_label: string | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  team1: TeamSummary | null;
  team2: TeamSummary | null;
}

// Filtre temporel des matchs.
export type MatchWhen = 'upcoming' | 'past';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  constructor(
    private message: MessageService
  ) { }

  // Matchs d'une compétition : à venir (coup d'envoi non passé) ou joués/en cours (coup d'envoi passé).
  async getMatches(competitionId: number, when: MatchWhen): Promise<Match[]> {
    const response = await this.message.sendMessage("/matches", { competitionId, when });
    return response.ok ? response.data : [];
  }
}
