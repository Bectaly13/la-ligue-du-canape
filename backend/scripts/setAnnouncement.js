// Met à jour le message broadcast (annonce de l'organisateur). Route réservée à l'admin.
// Valide un contenu texte non vide. L'UI d'édition arrivera avec l'interface admin dédiée.
const { sendMessage, sendError } = require("../util/message");
const { notifyBroadcast } = require("../util/notify");
const sql = require("../sql/sqlAnnouncement");
const { logError } = require("../util/log");

async function setAnnouncement(request, result) {
    const { content } = request.body;
    if (typeof content !== "string" || !content.trim()) {
        return sendError(result, "Message requis");
    }

    const newContent = content.trim();
    const previous = sql.getAnnouncement();
    sql.setAnnouncement(newContent);

    // Nouveau message → push à tous les opt-in (fire-and-forget). Pas de renvoi si le contenu est inchangé.
    if (!previous || previous.content !== newContent) {
        notifyBroadcast(newContent).catch((error) => {
            logError(`Notification d'annonce échouée: ${error.message}`);
        });
    }

    return sendMessage(result, sql.getAnnouncement());
}

module.exports = { setAnnouncement };
