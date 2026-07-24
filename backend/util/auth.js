// Middleware d'authentification. Chaque requête (sauf la création de compte) doit porter le
// header "Authorization: Bearer <auth_token>". On résout l'utilisateur via son token (table users)
// et on l'attache à request.user. Sinon, on rejette avec un 401.
//
// Rappel : auth_token est un secret (jamais renvoyé au public), id est public
// (voir docs/modele-de-donnees.md).

const { sendError } = require("./message");

function requireAuth(request, result, next) {
    // Le require est fait ici (et non en tête) car sqlUsers arrive avec la fonctionnalité d'onboarding.
    const sql = require("../sql/sqlUsers");

    const header = request.headers["authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return sendError(result, "Authentification requise", 401);
    }

    const user = sql.getUserByToken(token);
    if (!user) {
        return sendError(result, "Token invalide", 401);
    }

    // On expose l'utilisateur authentifié aux scripts en aval.
    request.user = user;
    next();
}

// À placer après requireAuth : refuse l'accès si l'utilisateur n'est pas administrateur.
function requireAdmin(request, result, next) {
    if (!request.user || !request.user.is_admin) {
        return sendError(result, "Accès réservé à l'administrateur", 403);
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
