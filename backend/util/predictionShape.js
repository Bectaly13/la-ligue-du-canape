// Façonnage partagé des pronos pour l'affichage (mes pronos + pronos d'un tiers).
// Centralise le calcul de la cote pariée et de l'entrée « archivée » (match validé), pour que le
// barème reste cohérent d'un écran à l'autre. Le barème lui-même vit dans util/odds.
const { computeOdds, outcomeOf, EXACT_BONUS } = require("./odds");

// Match avec équipes ET résultat réel (scores null si non joué).
function shapeMatch(r) {
    return {
        id: r.id,
        kickoff_at: r.kickoff_at,
        stage: r.stage,
        status: r.status,
        group_label: r.group_label,
        score1: r.score1,
        score2: r.score2,
        penalty_score1: r.penalty_score1,
        penalty_score2: r.penalty_score2,
        team1: { id: r.team1_id, name: r.team1_name, slug: r.team1_slug },
        team2: { id: r.team2_id, name: r.team2_name, slug: r.team2_slug }
    };
}

// Cote de l'issue pariée (à partir de TOUS les parieurs du match, joueur ciblé compris).
function outcomeOdds(sql, matchId, s1, s2) {
    const odds = computeOdds(sql.getOutcomeCounts(matchId, 0));
    return odds[outcomeOf(s1, s2)];
}

// Entrée « archivée » (match validé) pour une ligne de getCompetitionMatchesForUser.
// hasPred vrai → prono + points ; sinon entrée « sans prono » (tirets côté front).
function archivedEntry(sql, r) {
    const match = shapeMatch(r);
    const hasPred = r.my_score1 !== null && r.my_score1 !== undefined;
    if (!hasPred) {
        return { match, predicted_score1: null, predicted_score2: null, correct: null, exact: null, odds: null, points: null };
    }
    const correct = outcomeOf(r.my_score1, r.my_score2) === outcomeOf(r.score1, r.score2);
    const exact = r.my_score1 === r.score1 && r.my_score2 === r.score2;
    const odds = outcomeOdds(sql, r.id, r.my_score1, r.my_score2);
    return {
        match, predicted_score1: r.my_score1, predicted_score2: r.my_score2,
        correct, exact, odds, points: correct ? odds + (exact ? EXACT_BONUS : 0) : 0
    };
}

// Un match validé (terminé + score saisi) est « archivable ».
function isArchived(r) {
    return r.status === "finished" && r.score1 !== null && r.score2 !== null;
}

module.exports = { shapeMatch, outcomeOdds, archivedEntry, isArchived };
