// Met à jour le pseudo du joueur authentifié (mêmes contraintes qu'à l'onboarding). Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { publicUser } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function updateName(request, result) {
    const data = request.body;
    if (!("name" in data) || typeof data.name !== "string") {
        return sendError(result, "Le pseudo est requis");
    }
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
        return sendError(result, "Le pseudo doit faire entre 2 et 20 caractères");
    }
    return sendMessage(result, publicUser(sql.updateName(request.user.id, name)));
}

module.exports = { updateName };
