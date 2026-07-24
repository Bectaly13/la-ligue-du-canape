import { Injectable } from '@angular/core';

import { BackendResponse, MessageService } from './message-service';
import { TeamSummary } from './match-service';

// Un slot d'une case KO côté admin : le match + côté à modifier, l'équipe placée (ou null) et le libellé
// de provenance (« 1er groupe A », « Vainqueur Q1 », « À déterminer ») quand la case est vide.
export interface AdminBracketSlot {
  matchId: number;
  side: string;
  team: TeamSummary | null;
  label: string | null;
}

// Une confrontation KO, avec ses deux slots. `editable` = manche aller pas encore jouée (sinon lecture
// seule : les équipes sont figées par le résultat). `kickoff_retour` = coup d'envoi du retour (aller-retour).
export interface AdminBracketTie {
  code: string;
  stage: string;
  label: string;
  twoLegged: boolean;
  editable: boolean;
  kickoff_at: string;
  kickoff_retour: string | null;
  slot1: AdminBracketSlot;
  slot2: AdminBracketSlot;
}

// Données de l'outil de placement : confrontations éditables + équipes de la compétition (pour le sélecteur).
export interface AdminBracket {
  ties: AdminBracketTie[];
  teams: TeamSummary[];
}

// Un match tel que présenté dans l'outil admin de saisie des résultats (équipes toujours connues).
// legType : "single" (match unique) | "aller" | "retour". Pour un retour, firstLegGoals1/2 = les buts
// de l'aller pour team1/team2 (null si l'aller n'est pas encore validé) → sert au cumul dans la modale.
export interface AdminMatch {
  id: number;
  kickoff_at: string;
  stage: string;
  status: string;
  group_label: string | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  team1: TeamSummary;
  team2: TeamSummary;
  legType: string;
  firstLegGoals1: number | null;
  firstLegGoals2: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(
    private message: MessageService
  ) { }

  // Matchs validables d'une compétition (équipes connues), avec statut et résultat courant.
  async getMatches(competitionId: number): Promise<AdminMatch[]> {
    const response = await this.message.sendMessage("/adminMatches", { competitionId });
    return response.ok ? response.data : [];
  }

  // Valide (ou re-valide) le résultat d'un match. penalty1/2 = null hors nul en élimination directe.
  async setResult(matchId: number, score1: number, score2: number, penalty1: number | null, penalty2: number | null): Promise<BackendResponse> {
    return this.message.sendMessage("/setResult", { matchId, score1, score2, penalty1, penalty2 });
  }

  // Confrontations KO éditables + équipes, pour le placement manuel des cases du bracket.
  async getBracket(competitionId: number): Promise<AdminBracket> {
    const response = await this.message.sendMessage("/adminBracket", { competitionId });
    return response.ok ? response.data : { ties: [], teams: [] };
  }

  // Place une équipe dans une case (slot) KO. Efface la provenance (case manuelle) et synchronise l'aller-retour.
  async setSlot(matchId: number, side: string, teamId: number): Promise<BackendResponse> {
    return this.message.sendMessage("/setSlot", { matchId, side, teamId });
  }
}
