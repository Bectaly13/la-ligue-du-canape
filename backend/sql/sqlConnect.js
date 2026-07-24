// Ouvre la base SQLite (better-sqlite3) et expose des helpers de requête préparée.
// Toutes les requêtes de la couche sql/ passent par ces helpers (placeholders "?", jamais de
// concaténation de chaînes).
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { dbFile } = require("./sqlConfig");
const { initSchema } = require("./schema");

// On s'assure que le dossier de la base existe avant de l'ouvrir.
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
// Clés étrangères activées, et mode WAL pour une meilleure concurrence lecture/écriture.
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Crée les tables manquantes au démarrage (idempotent).
initSchema(db);

// run : INSERT / UPDATE / DELETE → { changes, lastInsertRowid }.
function run(query, params = []) {
    return db.prepare(query).run(params);
}

// get : renvoie une seule ligne (ou undefined).
function get(query, params = []) {
    return db.prepare(query).get(params);
}

// all : renvoie toutes les lignes (tableau, vide si aucune).
function all(query, params = []) {
    return db.prepare(query).all(params);
}

module.exports = { db, run, get, all };
