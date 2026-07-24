// Pronos archivés d'un joueur tiers pour une compétition (affichés sous ses stats, en lecture seule).
// Uniquement les matchs VALIDÉS où le joueur a réellement pronostiqué (pas les « sans prono »), car on
// expose « ses pronos ». On ne divulgue jamais ses pronos en cours (ceux d'avant coup d'envoi). Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { archivedEntry, isArchived } = require("../util/predictionShape");
const sql = require("../sql/sqlPredictions");

async function getUserPredictions(request, result) {
    const { userId, competitionId } = request.body;
    if (!userId || !competitionId) {
        return sendError(result, "userId et competitionId requis");
    }

    const rows = sql.getCompetitionMatchesForUser(userId, competitionId);
    const archived = [];

    for (const r of rows) {
        const hasPred = r.my_score1 !== null && r.my_score1 !== undefined;
        if (isArchived(r) && hasPred) {
            archived.push(archivedEntry(sql, r));
        }
    }

    // Le plus récent d'abord (les lignes arrivent par coup d'envoi croissant).
    archived.reverse();

    return sendMessage(result, { archived });
}

module.exports = { getUserPredictions };
