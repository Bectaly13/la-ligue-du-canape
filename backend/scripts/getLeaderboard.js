// Renvoie le classement des joueurs pour une compétition. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const sql = require("../sql/sqlLeaderboard");

async function getLeaderboard(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }
    return sendMessage(result, sql.getLeaderboard(competitionId));
}

module.exports = { getLeaderboard };
