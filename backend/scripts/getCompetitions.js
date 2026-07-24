// Renvoie la liste des compétitions (pour alimenter le sélecteur de compétition). Route protégée.
const { sendMessage } = require("../util/message");
const sql = require("../sql/sqlMatches");

async function getCompetitions(request, result) {
    return sendMessage(result, sql.getCompetitions());
}

module.exports = { getCompetitions };
