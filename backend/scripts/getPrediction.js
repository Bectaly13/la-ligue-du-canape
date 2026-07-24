// Contexte de prono d'un match : équipes, si pronosticable, effectifs par issue (hors soi) et le
// prono existant du joueur. Route protégée. Le frontend recalcule les cotes en direct depuis les effectifs.
const { sendMessage, sendError } = require("../util/message");
const { nowInParis } = require("../util/time");
const sql = require("../sql/sqlPredictions");

// Match au format « équipes imbriquées ».
function shape(match) {
    return {
        id: match.id,
        kickoff_at: match.kickoff_at,
        stage: match.stage,
        group_label: match.group_label,
        team1: match.team1_id ? { id: match.team1_id, name: match.team1_name, slug: match.team1_slug } : null,
        team2: match.team2_id ? { id: match.team2_id, name: match.team2_name, slug: match.team2_slug } : null
    };
}

async function getPrediction(request, result) {
    const { matchId } = request.body;
    if (!matchId) {
        return sendError(result, "matchId requis");
    }
    const match = sql.getMatch(matchId);
    if (!match) {
        return sendError(result, "Match introuvable", 404);
    }

    // Pronosticable : deux équipes connues ET coup d'envoi (heure de Paris) pas encore passé.
    const predictable = !!(match.team1_id && match.team2_id) && nowInParis() < match.kickoff_at;
    const counts = sql.getOutcomeCounts(matchId, request.user.id);
    const myPrediction = sql.getPrediction(request.user.id, matchId) || null;

    return sendMessage(result, { match: shape(match), predictable, counts, myPrediction });
}

module.exports = { getPrediction };
