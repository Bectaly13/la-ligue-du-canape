// Requêtes SQL des pronostics (un prono = un score par joueur et par match).
const { get, all, run } = require("./sqlConnect");
const { predictions, matches, teams, groups } = require("./sqlConfig");

// Match avec ses équipes (pour l'écran de prono).
function getMatch(matchId) {
    return get(`
        SELECT m.id, m.kickoff_at, m.stage, m.status, g.label AS group_label,
               t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
               t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug
        FROM "${matches}" m
        LEFT JOIN "${groups}" g ON m.group_id = g.id
        LEFT JOIN "${teams}" t1 ON m.team1_id = t1.id
        LEFT JOIN "${teams}" t2 ON m.team2_id = t2.id
        WHERE m.id = ?
    `, [matchId]);
}

// Prono d'un joueur pour un match (ou undefined).
function getPrediction(userId, matchId) {
    return get(
        `SELECT predicted_score1, predicted_score2 FROM "${predictions}" WHERE user_id = ? AND match_id = ?`,
        [userId, matchId]
    );
}

// Effectifs par issue pour un match, en EXCLUANT un joueur (pour prévisualiser sa propre cote).
function getOutcomeCounts(matchId, excludeUserId) {
    const row = get(`
        SELECT
            COALESCE(SUM(CASE WHEN predicted_score1 > predicted_score2 THEN 1 ELSE 0 END), 0) AS team1,
            COALESCE(SUM(CASE WHEN predicted_score1 = predicted_score2 THEN 1 ELSE 0 END), 0) AS draw,
            COALESCE(SUM(CASE WHEN predicted_score1 < predicted_score2 THEN 1 ELSE 0 END), 0) AS team2
        FROM "${predictions}"
        WHERE match_id = ? AND user_id != ?
    `, [matchId, excludeUserId]);
    return { team1: row.team1, draw: row.draw, team2: row.team2 };
}

// Tous les pronos d'un joueur, avec le match, ses équipes, son statut et son résultat.
function getUserPredictions(userId) {
    return all(`
        SELECT
            p.predicted_score1, p.predicted_score2,
            m.id, m.kickoff_at, m.stage, m.status, g.label AS group_label,
            m.score1, m.score2, m.penalty_score1, m.penalty_score2,
            t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
            t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug
        FROM "${predictions}" p
        JOIN "${matches}" m ON m.id = p.match_id
        LEFT JOIN "${groups}" g ON m.group_id = g.id
        LEFT JOIN "${teams}" t1 ON m.team1_id = t1.id
        LEFT JOIN "${teams}" t2 ON m.team2_id = t2.id
        WHERE p.user_id = ?
        ORDER BY m.kickoff_at
    `, [userId]);
}

// Tous les matchs d'une compétition (aux DEUX équipes connues), joints au prono du joueur (s'il existe).
// Sert à répartir en 3 sections : sans prono / avec prono / archivés.
function getCompetitionMatchesForUser(userId, competitionId) {
    return all(`
        SELECT
            m.id, m.kickoff_at, m.stage, m.status, g.label AS group_label,
            m.score1, m.score2, m.penalty_score1, m.penalty_score2,
            t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
            t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug,
            p.predicted_score1 AS my_score1, p.predicted_score2 AS my_score2
        FROM "${matches}" m
        LEFT JOIN "${groups}" g ON m.group_id = g.id
        JOIN "${teams}" t1 ON m.team1_id = t1.id
        JOIN "${teams}" t2 ON m.team2_id = t2.id
        LEFT JOIN "${predictions}" p ON p.match_id = m.id AND p.user_id = ?
        WHERE m.competition_id = ?
        ORDER BY m.kickoff_at
    `, [userId, competitionId]);
}

// Crée ou met à jour le prono d'un joueur (un seul par match).
function upsertPrediction(userId, matchId, score1, score2) {
    run(`
        INSERT INTO "${predictions}" (user_id, match_id, predicted_score1, predicted_score2)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, match_id) DO UPDATE SET
            predicted_score1 = excluded.predicted_score1,
            predicted_score2 = excluded.predicted_score2,
            updated_at = datetime('now')
    `, [userId, matchId, score1, score2]);
}

module.exports = { getMatch, getPrediction, getUserPredictions, getCompetitionMatchesForUser, getOutcomeCounts, upsertPrediction };
