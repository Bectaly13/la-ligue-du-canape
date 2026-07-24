import { Injectable } from '@angular/core';

import { BackendResponse, MessageService } from './message-service';
import { TeamSummary } from './match-service';

import { OutcomeCounts } from 'src/app/utils/odds';

// Le prono d'un joueur : un score par équipe.
export interface Prediction {
  predicted_score1: number;
  predicted_score2: number;
}

// Le match tel qu'affiché dans l'écran de prono.
export interface PredictMatch {
  id: number;
  kickoff_at: string;
  stage: string;
  group_label: string | null;
  team1: TeamSummary | null;
  team2: TeamSummary | null;
}

// Contexte complet d'un prono : le match, s'il est pronosticable, les effectifs par issue (hors soi),
// et le prono existant du joueur.
export interface PredictionContext {
  match: PredictMatch;
  predictable: boolean;
  counts: OutcomeCounts;
  myPrediction: Prediction | null;
}

// Un match tel qu'affiché dans « Mes pronos » : équipes connues + résultat réel (null si non joué).
export interface PredMatch {
  id: number;
  kickoff_at: string;
  stage: string;
  status: string;
  group_label: string | null;
  team1: TeamSummary;
  team2: TeamSummary;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
}

// Section « pas encore de prono » (uniquement les matchs encore pronosticables).
export interface ToPredictItem {
  match: PredMatch;
}

// Section « prono posé, non validé » : éditable avant le coup d'envoi ; cote de l'issue pariée.
export interface PredictedItem {
  match: PredMatch;
  predicted_score1: number;
  predicted_score2: number;
  editable: boolean;
  odds: number;
}

// Section « archivé » (match validé) : prono et points s'il y en a un (sinon null → tirets).
export interface ArchivedItem {
  match: PredMatch;
  predicted_score1: number | null;
  predicted_score2: number | null;
  correct: boolean | null;
  exact: boolean | null;
  odds: number | null;
  points: number | null;
}

export interface MyPredictions {
  toPredict: ToPredictItem[];
  predicted: PredictedItem[];
  archived: ArchivedItem[];
}

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  constructor(
    private message: MessageService
  ) { }

  // Contexte de prono d'un match (cotes recalculées côté front à partir des effectifs).
  async getPrediction(matchId: number): Promise<PredictionContext | null> {
    const response = await this.message.sendMessage("/prediction", { matchId });
    return response.ok ? response.data : null;
  }

  // Crée ou met à jour le prono (score) du joueur pour un match.
  async setPrediction(matchId: number, score1: number, score2: number): Promise<BackendResponse> {
    return this.message.sendMessage("/setPrediction", { matchId, score1, score2 });
  }

  // « Mes pronos » pour une compétition, en 3 sections : sans prono / avec prono / archivés.
  async getMyPredictions(competitionId: number): Promise<MyPredictions> {
    const response = await this.message.sendMessage("/myPredictions", { competitionId });
    return response.ok ? response.data : { toPredict: [], predicted: [], archived: [] };
  }

  // Pronos archivés d'un joueur tiers pour une compétition (lecture seule, sous ses stats).
  async getUserArchived(userId: number, competitionId: number): Promise<ArchivedItem[]> {
    const response = await this.message.sendMessage("/userPredictions", { userId, competitionId });
    return response.ok ? response.data.archived : [];
  }
}
