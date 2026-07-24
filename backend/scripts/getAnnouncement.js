// Renvoie le message broadcast courant (annonce de l'organisateur, affichée sur l'accueil). Route protégée.
const { sendMessage } = require("../util/message");
const sql = require("../sql/sqlAnnouncement");

async function getAnnouncement(request, result) {
    return sendMessage(result, sql.getAnnouncement());
}

module.exports = { getAnnouncement };
