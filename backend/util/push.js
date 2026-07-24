// Envoi de notifications push (FCM) via firebase-admin (API modulaire, stable en v14).
// La clé de compte de service vit sur la VM dans ../secrets/firebase.json (hors Git, hors rsync).
// Si la clé est absente (ex. backend local en dev), l'envoi est simplement désactivé — pas de crash.
const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fs = require("fs");
const path = require("path");
const { logWarn, logError } = require("./log");

const KEY_PATH = path.join(__dirname, "..", "secrets", "firebase.json");
let ready = false;

// Initialise firebase-admin à la première utilisation. Renvoie false si la clé est absente.
function ensureInit() {
    if (ready) {
        return true;
    }
    if (!fs.existsSync(KEY_PATH)) {
        logWarn(`Clé Firebase absente (${KEY_PATH}) : notifications push désactivées.`);
        return false;
    }
    initializeApp({ credential: cert(require(KEY_PATH)) });
    ready = true;
    return true;
}

// Envoie une notification à un token FCM donné. Renvoie true si l'envoi a réussi.
async function sendToToken(token, title, body) {
    if (!token || !ensureInit()) {
        return false;
    }
    try {
        await getMessaging().send({ token, notification: { title, body } });
        return true;
    } catch (error) {
        logError(`Push FCM échoué: ${error.message}`);
        return false;
    }
}

module.exports = { sendToToken };
