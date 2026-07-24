import { Injectable } from '@angular/core';

import { Match, TeamSummary } from './match-service';
import { MessageService } from './message-service';

// Une ligne de classement de poule (calculée côté serveur depuis les matchs terminés).
export interface GroupStanding {
  rank: number;
  team: TeamSummary;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
}

// Une poule : ses équipes classées et ses matchs.
export interface GroupView {
  id: number;
  label: string;
  standings: GroupStanding[];
  matches: Match[];
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  constructor(
    private message: MessageService
  ) { }

  // Poules d'une compétition (classement + matchs de chaque groupe).
  async getGroups(competitionId: number): Promise<GroupView[]> {
    const response = await this.message.sendMessage("/groups", { competitionId });
    return response.ok ? response.data : [];
  }
}
