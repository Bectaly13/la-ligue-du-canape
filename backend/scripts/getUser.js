// Renvoie le profil (identité brève) d'un membre par son id. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { publicUserBrief } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function getUser(request, result) {
    const { userId } = request.body;
    if (!userId) {
        return sendError(result, "userId requis");
    }
    const user = sql.getUserById(userId);
    if (!user) {
        return sendError(result, "Utilisateur introuvable", 404);
    }
    return sendMessage(result, publicUserBrief(user));
}

module.exports = { getUser };
