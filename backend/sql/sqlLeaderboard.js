// Classement des joueurs pour une compétition. Tous les joueurs sont inclus (même sans prono).
// Ordre : points, puis bons pronos, puis scores exacts (départage final : pseudo).
const { all } = require("./sqlConnect");
const { users, predictions, matches, championBets } = require("./sqlConfig");

function getLeaderboard(competitionId) {
    // On agrège TOUS les pronos du joueur (LEFT JOIN), mais chaque total n'est compté que pour la
    // compétition ciblée (CASE WHEN m.competition_id = ?), afin d'inclure aussi les joueurs sans prono.
    // Les points incluent le bonus « vainqueur du tournoi » (championBets.points_awarded, figé à la fin),
    // ajouté via une sous-requête scalaire pour ne pas démultiplier les lignes des LEFT JOIN.
    const rows = all(`
        SELECT
            u.id, u.name, u.photo, u.is_admin,
            COALESCE(SUM(CASE WHEN m.competition_id = ? THEN p.points_awarded ELSE 0 END), 0)
            + COALESCE((SELECT cb.points_awarded FROM "${championBets}" cb WHERE cb.user_id = u.id AND cb.competition_id = ?), 0) AS points,
            COALESCE(SUM(CASE WHEN m.competition_id = ? AND m.status = 'finished' AND (
                (m.score1 > m.score2 AND p.predicted_score1 > p.predicted_score2) OR
                (m.score1 < m.score2 AND p.predicted_score1 < p.predicted_score2) OR
                (m.score1 = m.score2 AND p.predicted_score1 = p.predicted_score2)
            ) THEN 1 ELSE 0 END), 0) AS correct,
            COALESCE(SUM(CASE WHEN m.competition_id = ? AND m.status = 'finished'
                AND m.score1 = p.predicted_score1 AND m.score2 = p.predicted_score2
                THEN 1 ELSE 0 END), 0) AS "exact"
        FROM "${users}" u
        LEFT JOIN "${predictions}" p ON p.user_id = u.id
        LEFT JOIN "${matches}" m ON m.id = p.match_id
        GROUP BY u.id
        ORDER BY points DESC, correct DESC, "exact" DESC, u.name COLLATE NOCASE ASC
    `, [competitionId, competitionId, competitionId, competitionId]);

    // Rang 1..N, partagé entre joueurs à égalité stricte (mêmes points, bons et exacts).
    let rank = 0;
    let prev = null;
    rows.forEach((row, index) => {
        if (!prev || row.points !== prev.points || row.correct !== prev.correct || row.exact !== prev.exact) {
            rank = index + 1;
        }
        row.rank = rank;
        prev = row;
    });
    return rows;
}

module.exports = { getLeaderboard };
