// Vérification du code d'accès de l'onboarding (gate anti-flood/bruteforce de /createAccount).
// Le code de référence vit dans ../secrets/access.json ({ "code": "..." }), hors Git et hors rsync
// (comme la clé Firebase). Lu à chaud → rotation possible sans redémarrage. Absent/illisible → on
// refuse toute création (fail-safe), plutôt que d'ouvrir la porte.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CODE_PATH = path.join(__dirname, "..", "secrets", "access.json");

// Code de référence courant (null si le fichier est absent/illisible).
function referenceCode() {
    try {
        return JSON.parse(fs.readFileSync(CODE_PATH, "utf8")).code || null;
    } catch {
        return null;
    }
}

// Compare le code fourni au code de référence, en temps constant (via des empreintes de longueur fixe,
// pour ne divulguer ni la longueur ni le contenu du secret).
function isValidAccessCode(provided) {
    const reference = referenceCode();
    if (!reference || typeof provided !== "string") {
        return false;
    }
    const digest = (value) => crypto.createHash("sha256").update(value).digest();
    return crypto.timingSafeEqual(digest(provided), digest(reference));
}

module.exports = { isValidAccessCode };
