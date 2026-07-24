// Enregistre le token push (FCM) de l'appareil du joueur authentifié. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const sql = require("../sql/sqlUsers");

async function updateFcmToken(request, result) {
    const token = request.body.fcm_token;
    if (typeof token !== "string" || !token) {
        return sendError(result, "Token FCM requis");
    }
    sql.updateFcmToken(request.user.id, token);
    return sendMessage(result, { ok: true });
}

module.exports = { updateFcmToken };
