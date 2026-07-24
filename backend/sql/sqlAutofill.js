// Requêtes de l'auto-remplissage du bracket : matchs à élimination directe (avec provenance + manche
// aller + résultat), lecture d'un match par id (cumul aller-retour), et écriture atomique des équipes
// résolues dans les cases aval.
const { db, all, get } = require("./sqlConnect");
const { matches } = require("./sqlConfig");

// Tous les matchs KO d'une compétition, avec provenance des deux côtés, lien de manche aller, et résultat.
function getKnockoutMatches(competitionId) {
    return all(`
        SELECT
            id, stage, status, competition_id, first_leg_match_id,
            team1_id, team2_id, score1, score2, penalty_score1, penalty_score2,
            team1_src_type, team1_src_match_id, team1_src_group_id, team1_src_rank,
            team2_src_type, team2_src_match_id, team2_src_group_id, team2_src_rank
        FROM "${matches}"
        WHERE competition_id = ? AND stage != 'poule'
        ORDER BY id ASC
    `, [competitionId]);
}

// Un match par id (pour le cumul aller-retour : scores + équipes + statut de la manche aller).
function getMatchById(matchId) {
    return get(`
        SELECT id, status, team1_id, team2_id, score1, score2, penalty_score1, penalty_score2, first_leg_match_id
        FROM "${matches}" WHERE id = ?
    `, [matchId]);
}

// Écrit en une transaction les équipes résolues : writes = [{ matchId, side: 'team1'|'team2', teamId }].
const applyTeamFills = db.transaction((writes) => {
    const set1 = db.prepare(`UPDATE "${matches}" SET team1_id = ? WHERE id = ?`);
    const set2 = db.prepare(`UPDATE "${matches}" SET team2_id = ? WHERE id = ?`);
    for (const w of writes) {
        (w.side === "team1" ? set1 : set2).run(w.teamId, w.matchId);
    }
});

module.exports = { getKnockoutMatches, getMatchById, applyTeamFills };
