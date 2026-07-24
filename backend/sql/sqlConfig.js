// Configuration de la base : chemin du fichier SQLite et noms des tables.
// Centraliser les noms de tables permet de les renommer sans toucher aux requêtes.
const path = require("path");

module.exports = {
    // Fichier de base de données (créé au premier lancement, dans un dossier git-ignoré).
    dbFile: path.join(__dirname, "..", "data", "mpp.sqlite"),

    // Noms des tables (voir docs/modele-de-donnees.md).
    users: "users",
    competitions: "competitions",
    teams: "teams",
    groups: "groups",
    matches: "matches",
    predictions: "predictions",
    championBets: "championBets",
    messages: "messages",
    announcements: "announcements"
};
