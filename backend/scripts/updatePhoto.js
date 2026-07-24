// Met à jour la photo de profil (base64 / data URL, ou null pour la retirer). Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { publicUser } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function updatePhoto(request, result) {
    const photo = request.body.photo;
    if (photo !== null && typeof photo !== "string") {
        return sendError(result, "Photo invalide");
    }
    return sendMessage(result, publicUser(sql.updatePhoto(request.user.id, photo)));
}

module.exports = { updatePhoto };
