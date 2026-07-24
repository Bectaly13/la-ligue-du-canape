// Requêtes du message broadcast (annonce unique de l'organisateur). Table traitée en singleton :
// une seule ligne, toujours id = 1 (seedée au démarrage, voir schema.js).
const { get, run } = require("./sqlConnect");
const { announcements } = require("./sqlConfig");

// Renvoie l'annonce courante (ligne 1) : { content, updated_at }.
function getAnnouncement() {
    return get(`SELECT content, updated_at FROM "${announcements}" WHERE id = 1`);
}

// Remplace le texte de l'annonce et rafraîchit updated_at.
function setAnnouncement(content) {
    return run(`UPDATE "${announcements}" SET content = ?, updated_at = datetime('now') WHERE id = 1`, [content]);
}

module.exports = { getAnnouncement, setAnnouncement };
