// Requêtes SQL du chat global (table messages). Requêtes préparées (placeholders "?").
// Chaque message est renvoyé « enrichi » : jointure users pour le nom et la photo de l'auteur.
const { get, all, run } = require("./sqlConnect");
const { messages, users } = require("./sqlConfig");

// Colonnes renvoyées au front pour un message (id public de l'auteur + nom + photo, jamais de secret).
const MESSAGE_SELECT = `
    SELECT m.id, m.sender_id, m.content, m.created_at,
           u.name AS sender_name, u.photo AS sender_photo
    FROM "${messages}" m
    JOIN "${users}" u ON u.id = m.sender_id
`;

// Insère un message et renvoie la ligne créée (enrichie).
function insertMessage(senderId, content) {
    const result = run(`INSERT INTO "${messages}" (sender_id, content) VALUES (?, ?)`, [senderId, content]);
    return getMessageById(result.lastInsertRowid);
}

// Renvoie un message enrichi par son id (ou undefined).
function getMessageById(id) {
    return get(`${MESSAGE_SELECT} WHERE m.id = ?`, [id]);
}

// Historique paginé « par batch » : les `limit` messages dont l'id est inférieur à `beforeId`
// (ou les plus récents si `beforeId` absent). Récupérés du plus récent au plus ancien, puis
// renvoyés en ordre chronologique croissant (le plus ancien en premier) pour l'affichage.
function getMessages(beforeId, limit) {
    const rows = beforeId
        ? all(`${MESSAGE_SELECT} WHERE m.id < ? ORDER BY m.id DESC LIMIT ?`, [beforeId, limit])
        : all(`${MESSAGE_SELECT} ORDER BY m.id DESC LIMIT ?`, [limit]);
    return rows.reverse();
}

// Supprime un message par son id.
function deleteMessage(id) {
    run(`DELETE FROM "${messages}" WHERE id = ?`, [id]);
}

module.exports = { insertMessage, getMessageById, getMessages, deleteMessage };
