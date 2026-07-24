// Crée ou met à jour le prono (score) d'un joueur pour un match. Route protégée.
// Valide : deux équipes connues + avant le coup d'envoi (heure de Paris) + score entier ≥ 0.
const { sendMessage, sendError } = require("../util/message");
const { nowInParis } = require("../util/time");
const sql = require("../sql/sqlPredictions");

async function setPrediction(request, result) {
    const { matchId, score1, score2 } = request.body;
    if (!matchId) {
        return sendError(result, "matchId requis");
    }
    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
        return sendError(result, "Score invalide");
    }

    const match = sql.getMatch(matchId);
    if (!match) {
        return sendError(result, "Match introuvable", 404);
    }
    if (!(match.team1_id && match.team2_id)) {
        return sendError(result, "Équipes non encore déterminées", 403);
    }
    if (nowInParis() >= match.kickoff_at) {
        return sendError(result, "Pronostic fermé (match commencé)", 403);
    }

    sql.upsertPrediction(request.user.id, matchId, score1, score2);
    const counts = sql.getOutcomeCounts(matchId, request.user.id);
    return sendMessage(result, { counts, myPrediction: { predicted_score1: score1, predicted_score2: score2 } });
}

module.exports = { setPrediction };
