// Création de compte au premier lancement : reçoit un pseudo, génère un auth_token, crée le
// joueur et renvoie ses infos (auth_token compris, à stocker sur l'appareil).
// Route PUBLIQUE : c'est elle qui délivre le token, elle ne peut donc pas exiger d'authentification.
const crypto = require("crypto");
const { sendMessage, sendError } = require("../util/message");
const { isValidAccessCode } = require("../util/accessCode");
const sql = require("../sql/sqlUsers");

async function createAccount(request, result) {
    const data = request.body;

    // Gate anti-flood : code d'accès requis (communiqué hors app par l'organisateur). En cas d'échec on
    // renvoie 403 + le nombre de tentatives restantes (posé par le rate-limiter) pour l'UI d'onboarding.
    if (!isValidAccessCode(data.code)) {
        const attemptsLeft = request.rateLimit ? request.rateLimit.remaining : null;
        return result.status(403).json({ reason: "Code d'accès invalide", attemptsLeft });
    }

    // Validation du pseudo : présent, chaîne, 2 à 20 caractères une fois rogné.
    if (!("name" in data) || typeof data.name !== "string") {
        return sendError(result, "Le pseudo est requis");
    }
    const name = data.name.trim();
    if (name.length < 2 || name.length > 20) {
        return sendError(result, "Le pseudo doit faire entre 2 et 20 caractères");
    }

    // Secret d'identification aléatoire (« login sans login »).
    const authToken = crypto.randomBytes(32).toString("hex");

    // Doublons de pseudo autorisés → aucune vérification d'unicité. is_admin reste à 0 (admin défini en base).
    const user = sql.createUser(name, authToken);

    return sendMessage(result, user);
}

module.exports = { createAccount };
