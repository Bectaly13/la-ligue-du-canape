import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Une équipe candidate au titre (pour choisir son champion).
export interface ChampionTeam {
  id: number;
  name: string;
  slug: string;
}

// Contexte du pari « vainqueur » pour une compétition : équipes, pari courant, verrou (1er coup d'envoi).
export interface ChampionBet {
  teams: ChampionTeam[];
  myBet: number | null;
  lockAt: string | null;
  locked: boolean;
  reward: number;
}

// Pari « vainqueur » d'un joueur résolu en équipe (lecture seule, sous ses stats). points figés éventuels.
export interface ChampionPick {
  team: ChampionTeam | null;
  points: number | null;
  reward: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChampionBetService {

  constructor(
    private message: MessageService
  ) { }

  // Contexte du pari vainqueur pour une compétition (null si indisponible).
  async getChampionBet(competitionId: number): Promise<ChampionBet | null> {
    const response = await this.message.sendMessage("/championBet", { competitionId });
    return response.ok ? response.data : null;
  }

  // Enregistre le champion parié. Renvoie l'id de l'équipe pariée, ou null en cas d'échec (ex. verrouillé).
  async setChampionBet(competitionId: number, teamId: number): Promise<number | null> {
    const response = await this.message.sendMessage("/setChampionBet", { competitionId, teamId });
    return response.ok ? response.data.myBet : null;
  }

  // Pari « vainqueur » d'un joueur (sien ou tiers) résolu en équipe, pour l'affichage sous ses stats.
  async getUserChampionBet(userId: number, competitionId: number): Promise<ChampionPick | null> {
    const response = await this.message.sendMessage("/userChampionBet", { userId, competitionId });
    return response.ok ? response.data : null;
  }
}
