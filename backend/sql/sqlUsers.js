// Requêtes SQL liées aux utilisateurs (joueurs). Requêtes préparées (placeholders "?").
const { get, all, run } = require("./sqlConnect");
const { users } = require("./sqlConfig");

// Crée un joueur et renvoie la ligne créée. Notifications désactivées par défaut (opt-in).
function createUser(name, authToken) {
    const result = run(
        `INSERT INTO "${users}" (name, auth_token, notif_enabled, reminder_notif_enabled, score_notif_enabled, announcement_notif_enabled) VALUES (?, ?, 0, 0, 0, 0)`,
        [name, authToken]
    );
    return getUserById(result.lastInsertRowid);
}

// Renvoie le joueur d'id donné (ou undefined).
function getUserById(id) {
    return get(`SELECT * FROM "${users}" WHERE id = ?`, [id]);
}

// Renvoie le joueur possédant ce token secret (ou undefined) — utilisé par l'authentification.
function getUserByToken(token) {
    return get(`SELECT * FROM "${users}" WHERE auth_token = ?`, [token]);
}

// Renvoie tous les joueurs (identité brève), triés par pseudo — pour la liste des membres.
function getAllUsers() {
    return all(`SELECT id, name, photo, is_admin FROM "${users}" ORDER BY name COLLATE NOCASE`);
}

// Destinataires du push « annonce de l'organisateur » : jetons FCM des joueurs ayant activé les notifs
// globales ET la sous-préférence « annonces » (comme scores/rappels, l'annonce a son propre toggle).
function getAnnouncementNotifTargets() {
    return all(`SELECT fcm_token FROM "${users}" WHERE notif_enabled = 1 AND announcement_notif_enabled = 1 AND fcm_token IS NOT NULL`);
}

// Met à jour le pseudo et renvoie la ligne mise à jour.
function updateName(id, name) {
    run(`UPDATE "${users}" SET name = ? WHERE id = ?`, [name, id]);
    return getUserById(id);
}

// Met à jour la photo (base64, ou null pour la retirer) et renvoie la ligne mise à jour.
function updatePhoto(id, photo) {
    run(`UPDATE "${users}" SET photo = ? WHERE id = ?`, [photo, id]);
    return getUserById(id);
}

// Met à jour les préférences de notifications et renvoie la ligne mise à jour.
function updateNotifPrefs(id, notifEnabled, reminderEnabled, scoreEnabled, announcementEnabled) {
    run(
        `UPDATE "${users}" SET notif_enabled = ?, reminder_notif_enabled = ?, score_notif_enabled = ?, announcement_notif_enabled = ? WHERE id = ?`,
        [notifEnabled ? 1 : 0, reminderEnabled ? 1 : 0, scoreEnabled ? 1 : 0, announcementEnabled ? 1 : 0, id]
    );
    return getUserById(id);
}

// Enregistre le token push (FCM) de l'appareil, utilisé par le serveur pour envoyer les notifications.
function updateFcmToken(id, token) {
    run(`UPDATE "${users}" SET fcm_token = ? WHERE id = ?`, [token, id]);
}

module.exports = { createUser, getUserById, getUserByToken, getAllUsers, getAnnouncementNotifTargets, updateName, updatePhoto, updateNotifPrefs, updateFcmToken };
