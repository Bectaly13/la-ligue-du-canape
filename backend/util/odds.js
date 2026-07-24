// Cotes dynamiques à somme (quasi) constante — cf. docs/cahier-des-charges.md §6.1.
// cote(i) = round(100 + K·(⅓ − p_i)), avec K = 1,5·(100 − plancher). plancher = 30 → K = 105.
// Propriétés : somme ≈ 300 ; 100 partout si personne n'a parié ; bornée [plancher ; 135].
// p_i = part des parieurs de CE match ayant choisi l'issue i. La cote est le gain de CHAQUE bon
// parieur (non partagé entre eux).
const PLANCHER = 30;
const K = 1.5 * (100 - PLANCHER); // 105

// Bonus fixe ajouté à la cote quand le SCORE exact est trouvé (cf. §6.2, ajustable 20–50).
const EXACT_BONUS = 30;

// Bonus fixe (non réparti) accordé au bon pari « vainqueur du tournoi ». Figé à la fin de la compétition
// (0 ou CHAMPION_BONUS dans predictions/championBets.points_awarded).
const CHAMPION_BONUS = 200;

// Issue d'un score pronostiqué : "team1" (A gagne), "draw" (nul / va aux t.a.b.), "team2" (B gagne).
function outcomeOf(score1, score2) {
    if (score1 > score2) {
        return "team1";
    }
    if (score1 < score2) {
        return "team2";
    }
    return "draw";
}

// Cotes des 3 issues à partir des effectifs { team1, draw, team2 } de parieurs.
function computeOdds(counts) {
    const n = { team1: counts.team1 || 0, draw: counts.draw || 0, team2: counts.team2 || 0 };
    const total = n.team1 + n.draw + n.team2;
    if (total === 0) {
        return { team1: 100, draw: 100, team2: 100 };
    }
    const cote = (ni) => {
        const value = Math.round(100 + K * (1 / 3 - ni / total));
        return Math.min(135, Math.max(PLANCHER, value));
    };
    return { team1: cote(n.team1), draw: cote(n.draw), team2: cote(n.team2) };
}

module.exports = { PLANCHER, K, EXACT_BONUS, CHAMPION_BONUS, outcomeOf, computeOdds };
