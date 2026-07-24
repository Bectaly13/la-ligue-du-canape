// Renvoie les stats d'un joueur pour une compétition. Route protégée.
// Par défaut, le joueur authentifié ; ou un `userId` ciblé (consultation du profil d'un tiers).
const { sendMessage, sendError } = require("../util/message");
const sql = require("../sql/sqlStats");

async function getStats(request, result) {
    const { competitionId, userId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }
    const targetUserId = userId || request.user.id;
    return sendMessage(result, sql.getStats(targetUserId, competitionId));
}

module.exports = { getStats };
