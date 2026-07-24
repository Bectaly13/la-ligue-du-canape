// Contexte du pari « vainqueur » d'une compétition : équipes à choisir, pari courant du joueur,
// moment du verrou (1er coup d'envoi) et s'il est déjà verrouillé. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { nowInParis } = require("../util/time");
const { CHAMPION_BONUS } = require("../util/odds");
const sql = require("../sql/sqlChampionBets");

async function getChampionBet(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const teams = sql.getCompetitionTeams(competitionId);
    const bet = sql.getChampionBet(request.user.id, competitionId);
    const lockAt = sql.getCompetitionLock(competitionId);
    const locked = lockAt !== null && nowInParis() >= lockAt;

    return sendMessage(result, {
        teams,
        myBet: bet ? bet.team_id : null,
        lockAt,
        locked,
        reward: CHAMPION_BONUS
    });
}

module.exports = { getChampionBet };
