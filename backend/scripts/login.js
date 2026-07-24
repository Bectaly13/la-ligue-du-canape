// Connexion à un compte EXISTANT via son auth_token (récupération lors d'un changement d'appareil).
// Route PUBLIQUE (comme createAccount) : elle redonne l'accès à partir du jeton fourni, elle ne peut
// donc pas exiger d'authentification préalable. Rate-limitée (bucket partagé avec createAccount) car
// c'est un endpoint public distant.
const { sendMessage, sendError } = require("../util/message");
const { publicUser } = require("../util/user");
const sql = require("../sql/sqlUsers");

async function login(request, result) {
    const data = request.body;

    if (!("token" in data) || typeof data.token !== "string" || !data.token.trim()) {
        return sendError(result, "Jeton requis");
    }

    const user = sql.getUserByToken(data.token.trim());
    if (!user) {
        // Jeton inconnu : 401 + tentatives restantes (posées par le rate-limiter) pour l'UI d'onboarding.
        const attemptsLeft = request.rateLimit ? request.rateLimit.remaining : null;
        return result.status(401).json({ reason: "Jeton invalide", attemptsLeft });
    }

    // Jeton valide → on renvoie le profil SANITISÉ (le client possède déjà le jeton, inutile de le ré-émettre).
    return sendMessage(result, publicUser(user));
}

module.exports = { login };
