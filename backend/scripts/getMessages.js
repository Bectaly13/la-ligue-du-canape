// Renvoie l'historique paginé du chat global (route protégée). Lecture seule : l'envoi et la
// suppression de messages passent par Socket.IO (voir socket/chatSocket.js).
const { sendMessage } = require("../util/message");
const sql = require("../sql/sqlMessages");

// Taille d'un batch d'historique (bornée pour éviter de tout charger d'un coup).
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

async function getMessages(request, result) {
    const { beforeId } = request.body;
    // On borne la limite demandée entre 1 et MAX_LIMIT (défaut DEFAULT_LIMIT).
    const limit = Math.min(Math.max(Number(request.body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return sendMessage(result, sql.getMessages(beforeId, limit));
}

module.exports = { getMessages };
