// Met à jour les préférences de notifications (global, rappels avant-match, scores post-match,
// annonces de l'organisateur). Route protégée.
const { sendMessage } = require("../util/message");
const { publicUser } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function updateNotifPrefs(request, result) {
    const { notif_enabled, reminder_notif_enabled, score_notif_enabled, announcement_notif_enabled } = request.body;
    const updated = sql.updateNotifPrefs(
        request.user.id,
        !!notif_enabled,
        !!reminder_notif_enabled,
        !!score_notif_enabled,
        !!announcement_notif_enabled
    );
    return sendMessage(result, publicUser(updated));
}

module.exports = { updateNotifPrefs };
