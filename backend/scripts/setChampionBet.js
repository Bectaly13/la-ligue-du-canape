// Crée ou met à jour le pari « vainqueur » du joueur pour une compétition. Route protégée.
// Valide : équipe ∈ compétition + pari non encore verrouillé (avant le 1er coup d'envoi, heure de Paris).
const { sendMessage, sendError } = require("../util/message");
const { nowInParis } = require("../util/time");
const sql = require("../sql/sqlChampionBets");

async function setChampionBet(request, result) {
    const { competitionId, teamId } = request.body;
    if (!competitionId || !teamId) {
        return sendError(result, "competitionId et teamId requis");
    }
    if (!sql.teamInCompetition(teamId, competitionId)) {
        return sendError(result, "Équipe hors de la compétition", 404);
    }

    const lockAt = sql.getCompetitionLock(competitionId);
    if (lockAt !== null && nowInParis() >= lockAt) {
        return sendError(result, "Pari fermé (compétition commencée)", 403);
    }

    sql.upsertChampionBet(request.user.id, competitionId, teamId);
    return sendMessage(result, { myBet: teamId });
}

module.exports = { setChampionBet };
