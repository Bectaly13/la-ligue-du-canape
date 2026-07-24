import { Injectable } from '@angular/core';

import { MessageService } from './message-service';

// Un « slot » d'un match KO : soit une équipe connue, soit un libellé de provenance
// (« Vainqueur Q1 », « 2e A1 », « À déterminer »).
export interface BracketSlot {
  team: { name: string; slug: string } | null;
  label: string | null;
}

// Une manche d'une confrontation (scores normalisés côté slot1/slot2).
export interface BracketLeg {
  status: string;
  kickoff_at: string;
  score1: number | null;
  score2: number | null;
}

// Une CONFRONTATION du bracket : match unique OU aller-retour (2 manches). `agg1`/`agg2` = cumul (ou le
// score du match unique) ; `winner` = 1/2/0 ; `pen1`/`pen2` = t.a.b. décisifs éventuels.
export interface BracketMatch {
  id: number;
  code: string;
  stage: string;
  status: string;
  kickoff_at: string;
  twoLegged: boolean;
  slot1: BracketSlot;
  slot2: BracketSlot;
  legs: BracketLeg[];
  agg1: number | null;
  agg2: number | null;
  pen1: number | null;
  pen2: number | null;
  winner: number;
}

// Un tour (quarts, demies, finale…) et ses matchs. `drawnEntry` = les participants de ce tour sortent
// d'un TIRAGE AU SORT (aucune provenance déductible) → pas de connecteurs, et vue cercle sans objet.
export interface BracketRound {
  stage: string;
  label: string;
  drawnEntry: boolean;
  matches: BracketMatch[];
}

// Le bracket complet : les tours (arbre) + la petite finale (3e place), à part.
export interface BracketData {
  rounds: BracketRound[];
  thirdPlace: BracketMatch | null;
}

@Injectable({
  providedIn: 'root'
})
export class BracketService {
  constructor(
    private message: MessageService
  ) { }

  // Bracket d'une compétition (tours + petite finale).
  async getBracket(competitionId: number): Promise<BracketData> {
    const response = await this.message.sendMessage("/bracket", { competitionId });
    return response.ok ? response.data : { rounds: [], thirdPlace: null };
  }
}
