// Deux méthodes pour renvoyer une réponse au frontend :
// - un message (succès, status 200) contenant des données utiles,
// - une erreur contenant une explication et un code de statut adapté.

function sendMessage(res, data) {
    res.status(200).json({ data: data });
}

function sendError(res, reason, statusCode = 400) {
    res.status(statusCode).json({ reason: reason });
}

module.exports = { sendMessage, sendError };
