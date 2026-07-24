// Journalisation centralisée du backend. Logger simple (zéro dépendance) : niveaux INFO/WARN/ERROR,
// horodatage en heure de Paris, secrets masqués. Le middleware httpLogger journalise CHAQUE requête
// depuis un point unique (server.js) : route, statut, durée, utilisateur, corps d'entrée et réponse.
//
// Format d'une ligne :
//   [2026-07-24 14:30:12] INFO POST /setResult 200 12ms user=3 in={…} out={…}
// Le niveau est écrit en clair (INFO/WARN/ERROR) : l'outil local tools/ colore les lignes d'après lui.
// INFO part sur stdout ; WARN/ERROR sur stderr (pm2 sépare déjà les deux flux en deux fichiers).

// Clés dont la valeur est un secret : jamais écrites en clair dans les logs (voir mask()).
const SECRET_KEYS = new Set(["auth_token", "token", "authorization", "fcm_token"]);
// Au-delà de cette longueur, une chaîne est résumée (évite de déverser une photo base64 dans les logs).
const MAX_STRING = 120;
// Au-delà de ce nombre d'éléments, un tableau est tronqué (évite de dérouler tout un classement).
const MAX_ARRAY = 8;

// Horodatage lisible en heure de Paris ("2026-07-24 14:30:12"). La locale "sv-SE" donne l'ISO sans le "T".
function timestamp() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" });
}

// Clone une valeur en masquant les secrets et en bornant chaînes/tableaux, pour un log lisible et sûr.
function mask(value) {
    if (typeof value === "string") {
        return value.length > MAX_STRING ? `<${value.length} caractères>` : value;
    }
    if (Array.isArray(value)) {
        const head = value.slice(0, MAX_ARRAY).map(mask);
        if (value.length > MAX_ARRAY) {
            head.push(`…(+${value.length - MAX_ARRAY})`);
        }
        return head;
    }
    if (value && typeof value === "object") {
        const out = {};
        for (const key of Object.keys(value)) {
            out[key] = SECRET_KEYS.has(key.toLowerCase()) ? "***" : mask(value[key]);
        }
        return out;
    }
    return value;
}

// Sérialise une valeur (après masquage) en une chaîne compacte pour le log ("-" si absente/vide).
function fmt(value) {
    if (value === undefined || value === null) {
        return "-";
    }
    try {
        return JSON.stringify(mask(value));
    } catch {
        return "<non sérialisable>";
    }
}

// Assemble une ligne de log : horodatage, niveau, puis le message.
function line(level, message) {
    return `[${timestamp()}] ${level} ${message}`;
}

function logInfo(message) {
    console.log(line("INFO", message));
}

function logWarn(message) {
    console.warn(line("WARN", message));
}

function logError(message) {
    console.error(line("ERROR", message));
}

// Middleware d'accès HTTP : à brancher AVANT les routes. Enveloppe res.json pour capturer le corps de
// réponse, puis logge une ligne à la fin de la requête (à ce stade req.user est résolu par requireAuth).
// Le niveau suit le statut : 2xx/3xx → INFO, 4xx → WARN, 5xx → ERROR.
function httpLogger(request, result, next) {
    const startedAt = Date.now();

    // On intercepte res.json (toutes nos réponses passent par sendMessage/sendError → res.json) pour
    // journaliser la sortie, sans altérer le comportement d'origine.
    const originalJson = result.json.bind(result);
    let responseBody;
    result.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    result.on("finish", () => {
        const ms = Date.now() - startedAt;
        const who = request.user ? `user=${request.user.id}` : "user=-";
        const message = `${request.method} ${request.originalUrl} ${result.statusCode} ${ms}ms ${who} `
            + `in=${fmt(request.body)} out=${fmt(responseBody)}`;
        if (result.statusCode >= 500) {
            logError(message);
        } else if (result.statusCode >= 400) {
            logWarn(message);
        } else {
            logInfo(message);
        }
    });

    next();
}

module.exports = { logInfo, logWarn, logError, httpLogger };
