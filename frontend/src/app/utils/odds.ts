// Cotes dynamiques (même formule que le backend, cf. docs/cahier-des-charges.md §6.1).
// cote(i) = round(100 + K·(⅓ − p_i)), K = 1,5·(100 − plancher). plancher = 30 → K = 105.
const PLANCHER = 30;
const K = 1.5 * (100 - PLANCHER); // 105

export type Outcome = "team1" | "draw" | "team2";

export interface OutcomeCounts {
  team1: number;
  draw: number;
  team2: number;
}

// Issue d'un score pronostiqué : team1 (A gagne), draw (nul / t.a.b.), team2 (B gagne).
export function outcomeOf(score1: number, score2: number): Outcome {
  if (score1 > score2) {
    return "team1";
  }
  if (score1 < score2) {
    return "team2";
  }
  return "draw";
}

// Cotes des 3 issues à partir des effectifs de parieurs.
export function computeOdds(counts: OutcomeCounts): OutcomeCounts {
  const total = counts.team1 + counts.draw + counts.team2;
  if (total === 0) {
    return { team1: 100, draw: 100, team2: 100 };
  }
  const cote = (ni: number) => {
    const value = Math.round(100 + K * (1 / 3 - ni / total));
    return Math.min(135, Math.max(PLANCHER, value));
  };
  return { team1: cote(counts.team1), draw: cote(counts.draw), team2: cote(counts.team2) };
}
