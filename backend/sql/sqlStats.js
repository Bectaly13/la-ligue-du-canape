// Statistiques d'un joueur pour une compétition : nb de pronos, bons vainqueurs, scores exacts,
// points et classement. (Tout est à 0 tant qu'il n'y a ni pronos ni résultats.)
const { get } = require("./sqlConnect");

function getStats(userId, competitionId) {
    // Agrégats des pronos de l'utilisateur sur les matchs de la compétition.
    const agg = get(`
        SELECT
            COUNT(*) AS predictions,
            COALESCE(SUM(CASE WHEN m.status = 'finished' AND (
                (m.score1 > m.score2 AND p.predicted_score1 > p.predicted_score2) OR
                (m.score1 < m.score2 AND p.predicted_score1 < p.predicted_score2) OR
                (m.score1 = m.score2 AND p.predicted_score1 = p.predicted_score2)
            ) THEN 1 ELSE 0 END), 0) AS correct,
            COALESCE(SUM(CASE WHEN m.status = 'finished'
                AND m.score1 = p.predicted_score1 AND m.score2 = p.predicted_score2
                THEN 1 ELSE 0 END), 0) AS "exact",
            COALESCE(SUM(p.points_awarded), 0)
            + COALESCE((SELECT points_awarded FROM championBets WHERE user_id = ? AND competition_id = ?), 0) AS points
        FROM predictions p
        JOIN matches m ON p.match_id = m.id
        WHERE p.user_id = ? AND m.competition_id = ?
    `, [userId, competitionId, userId, competitionId]);

    // Classement : nombre de joueurs strictement mieux placés, + 1. Même départage que le classement
    // (getLeaderboard) : points, puis bons pronos, puis scores exacts — sinon tout le monde serait 1er
    // tant que les points (points_awarded) sont à 0, alors que bons/exacts se calculent dès les résultats.
    // On inclut TOUS les joueurs (LEFT JOIN depuis users), cohérent avec le total `players`.
    const rankRow = get(`
        WITH stats_by_user AS (
            SELECT
                u.id AS uid,
                COALESCE(SUM(CASE WHEN m.competition_id = ? THEN p.points_awarded ELSE 0 END), 0)
                + COALESCE((SELECT points_awarded FROM championBets cb WHERE cb.user_id = u.id AND cb.competition_id = ?), 0) AS pts,
                COALESCE(SUM(CASE WHEN m.competition_id = ? AND m.status = 'finished' AND (
                    (m.score1 > m.score2 AND p.predicted_score1 > p.predicted_score2) OR
                    (m.score1 < m.score2 AND p.predicted_score1 < p.predicted_score2) OR
                    (m.score1 = m.score2 AND p.predicted_score1 = p.predicted_score2)
                ) THEN 1 ELSE 0 END), 0) AS correct,
                COALESCE(SUM(CASE WHEN m.competition_id = ? AND m.status = 'finished'
                    AND m.score1 = p.predicted_score1 AND m.score2 = p.predicted_score2
                    THEN 1 ELSE 0 END), 0) AS "exact"
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            LEFT JOIN matches m ON m.id = p.match_id
            GROUP BY u.id
        ),
        me AS (SELECT pts, correct, "exact" FROM stats_by_user WHERE uid = ?)
        SELECT (
            SELECT COUNT(*) FROM stats_by_user s, me
            WHERE s.pts > me.pts
               OR (s.pts = me.pts AND s.correct > me.correct)
               OR (s.pts = me.pts AND s.correct = me.correct AND s."exact" > me."exact")
        ) + 1 AS rank
    `, [competitionId, competitionId, competitionId, competitionId, userId]);

    const players = get(`SELECT COUNT(*) AS c FROM users`).c;

    return {
        predictions: agg.predictions,
        correct: agg.correct,
        exact: agg.exact,
        points: agg.points,
        rank: rankRow.rank,
        players
    };
}

module.exports = { getStats };
