// Requêtes de la saisie des résultats (admin) : liste des matchs d'une compétition, lecture d'un match
// à valider, pronos d'un match, et application ATOMIQUE du résultat (score + t.a.b. + cotes figées +
// statut) et des points figés de chaque prono.
const { db, get, all } = require("./sqlConnect");
const { matches, teams, groups, predictions, users } = require("./sqlConfig");

// Matchs d'une compétition aux DEUX équipes connues (donc validables), avec équipes, groupe, statut,
// résultat courant et lien de manche aller. Triés par coup d'envoi. Pour l'outil admin de saisie.
function getCompetitionMatchesForAdmin(competitionId) {
    return all(`
        SELECT
            m.id, m.kickoff_at, m.stage, m.status, m.first_leg_match_id, g.label AS group_label,
            m.score1, m.score2, m.penalty_score1, m.penalty_score2,
            t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
            t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug
        FROM "${matches}" m
        LEFT JOIN "${groups}" g ON m.group_id = g.id
        JOIN "${teams}" t1 ON m.team1_id = t1.id
        JOIN "${teams}" t2 ON m.team2_id = t2.id
        WHERE m.competition_id = ?
        ORDER BY m.kickoff_at
    `, [competitionId]);
}

// Un match tel que nécessaire pour valider un résultat (stage, équipes, statut, lien de manche aller).
function getMatchForResult(matchId) {
    return get(`SELECT id, competition_id, stage, status, team1_id, team2_id, first_leg_match_id FROM "${matches}" WHERE id = ?`, [matchId]);
}

// Un match par id (équipes + score) — pour le cumul d'une manche retour.
function getMatchById(matchId) {
    return get(`SELECT id, status, team1_id, team2_id, score1, score2 FROM "${matches}" WHERE id = ?`, [matchId]);
}

// Vrai si ce match est une manche ALLER (une autre ligne le désigne comme first_leg).
function isFirstLeg(matchId) {
    return !!get(`SELECT 1 FROM "${matches}" WHERE first_leg_match_id = ?`, [matchId]);
}

// Pronos d'un match (id + score prédit) pour figer les points.
function getPredictionsForMatch(matchId) {
    return all(`SELECT id, predicted_score1, predicted_score2 FROM "${predictions}" WHERE match_id = ?`, [matchId]);
}

// Noms des deux équipes d'un match (pour la ligne de score d'une notification push).
function getMatchLabel(matchId) {
    return get(`
        SELECT t1.display_name AS team1_name, t2.display_name AS team2_name
        FROM "${matches}" m
        JOIN "${teams}" t1 ON m.team1_id = t1.id
        JOIN "${teams}" t2 ON m.team2_id = t2.id
        WHERE m.id = ?
    `, [matchId]);
}

// Destinataires du push « score » d'un match : utilisateurs opt-in (notifs globales + scores activées,
// jeton FCM présent), avec leur prono et leurs points figés pour ce match (tout NULL s'ils n'avaient
// pas parié → permet de distinguer « pas de prono » de « prono à 0 point »).
function getScoreNotifTargets(matchId) {
    return all(`
        SELECT u.id AS user_id, u.fcm_token, p.points_awarded, p.predicted_score1, p.predicted_score2
        FROM "${users}" u
        LEFT JOIN "${predictions}" p ON p.user_id = u.id AND p.match_id = ?
        WHERE u.notif_enabled = 1 AND u.score_notif_enabled = 1 AND u.fcm_token IS NOT NULL
    `, [matchId]);
}

// Applique le résultat en une transaction : écrit le match (score, t.a.b., cotes figées, statut) puis
// fige les points de chaque prono. `pointsList` = [{ id, points }].
const applyResult = db.transaction((matchId, res, odds, pointsList) => {
    db.prepare(`
        UPDATE "${matches}" SET
            score1 = ?, score2 = ?, penalty_score1 = ?, penalty_score2 = ?,
            odds_team1 = ?, odds_draw = ?, odds_team2 = ?,
            status = 'finished'
        WHERE id = ?
    `).run(res.score1, res.score2, res.penalty1, res.penalty2, odds.team1, odds.draw, odds.team2, matchId);

    const updatePoints = db.prepare(`UPDATE "${predictions}" SET points_awarded = ? WHERE id = ?`);
    for (const p of pointsList) {
        updatePoints.run(p.points, p.id);
    }
});

module.exports = { getCompetitionMatchesForAdmin, getMatchForResult, getMatchById, isFirstLeg, getPredictionsForMatch, getMatchLabel, getScoreNotifTargets, applyResult };
