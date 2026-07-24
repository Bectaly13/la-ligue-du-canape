// Définition du schéma de la base (CREATE TABLE IF NOT EXISTS), appelé une fois au démarrage par
// sqlConnect. Conforme à docs/modele-de-donnees.md. Noms de tables issus de sqlConfig.
// Booléens en 0/1, dates en texte ISO. « groups » est quoté (mot proche d'un mot-clé SQL).
const c = require("./sqlConfig");

// Ajoute une colonne à une table si elle n'existe pas déjà (migration légère, idempotente).
function ensureColumn(db, table, column, definition) {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (!cols.some((col) => col.name === column)) {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition}`);
    }
}

// Supprime une colonne si elle existe encore (migration légère, idempotente).
function dropColumn(db, table, column) {
    const cols = db.prepare(`PRAGMA table_info("${table}")`).all();
    if (cols.some((col) => col.name === column)) {
        db.exec(`ALTER TABLE "${table}" DROP COLUMN ${column}`);
    }
}

function initSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS "${c.users}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            notif_enabled INTEGER NOT NULL DEFAULT 0,
            reminder_notif_enabled INTEGER NOT NULL DEFAULT 0,
            score_notif_enabled INTEGER NOT NULL DEFAULT 0,
            announcement_notif_enabled INTEGER NOT NULL DEFAULT 0,
            photo TEXT,
            auth_token TEXT NOT NULL UNIQUE,
            fcm_token TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS "${c.competitions}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_at TEXT NOT NULL,
            end_at TEXT
        );

        CREATE TABLE IF NOT EXISTS "${c.groups}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            competition_id INTEGER NOT NULL REFERENCES "${c.competitions}"(id)
        );

        CREATE TABLE IF NOT EXISTS "${c.teams}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT NOT NULL,
            slug TEXT NOT NULL,
            competition_id INTEGER NOT NULL REFERENCES "${c.competitions}"(id),
            group_id INTEGER REFERENCES "${c.groups}"(id)
        );

        CREATE TABLE IF NOT EXISTS "${c.matches}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            competition_id INTEGER NOT NULL REFERENCES "${c.competitions}"(id),
            stage TEXT NOT NULL,
            group_id INTEGER REFERENCES "${c.groups}"(id),
            kickoff_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            team1_id INTEGER REFERENCES "${c.teams}"(id),
            team2_id INTEGER REFERENCES "${c.teams}"(id),
            team1_src_type TEXT,
            team1_src_group_id INTEGER REFERENCES "${c.groups}"(id),
            team1_src_rank INTEGER,
            team1_src_match_id INTEGER REFERENCES "${c.matches}"(id),
            team2_src_type TEXT,
            team2_src_group_id INTEGER REFERENCES "${c.groups}"(id),
            team2_src_rank INTEGER,
            team2_src_match_id INTEGER REFERENCES "${c.matches}"(id),
            score1 INTEGER,
            score2 INTEGER,
            penalty_score1 INTEGER,
            penalty_score2 INTEGER,
            odds_team1 INTEGER,
            odds_draw INTEGER,
            odds_team2 INTEGER
        );

        CREATE TABLE IF NOT EXISTS "${c.predictions}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES "${c.users}"(id),
            match_id INTEGER NOT NULL REFERENCES "${c.matches}"(id),
            predicted_score1 INTEGER NOT NULL,
            predicted_score2 INTEGER NOT NULL,
            points_awarded INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, match_id)
        );

        CREATE TABLE IF NOT EXISTS "${c.championBets}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES "${c.users}"(id),
            competition_id INTEGER NOT NULL REFERENCES "${c.competitions}"(id),
            team_id INTEGER NOT NULL REFERENCES "${c.teams}"(id),
            points_awarded INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, competition_id)
        );

        CREATE TABLE IF NOT EXISTS "${c.messages}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL REFERENCES "${c.users}"(id),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS "${c.announcements}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    // Migrations légères pour les bases déjà créées (ajout idempotent des colonnes récentes de users).
    ensureColumn(db, c.users, "notif_enabled", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, c.users, "reminder_notif_enabled", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, c.users, "score_notif_enabled", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, c.users, "announcement_notif_enabled", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, c.users, "photo", "TEXT");

    // Confrontations à élimination directe en ALLER-RETOUR : sur la manche RETOUR, pointe vers la manche
    // ALLER (le vainqueur se calcule au cumul des deux manches). NULL = confrontation à match unique.
    ensureColumn(db, c.matches, "first_leg_match_id", `INTEGER REFERENCES "${c.matches}"(id)`);

    // Le statut d'une compétition (upcoming/ongoing/finished) est DÉRIVABLE (début = 1er coup d'envoi passé ;
    // fin = résultat de la finale saisi) et n'était lu nulle part → on supprime la colonne devenue inutile.
    dropColumn(db, c.competitions, "status");

    // Seed idempotent du broadcast : le message unique est la ligne id = 1 (traité en singleton).
    // Placeholder non vide par défaut ; l'admin le modifiera ensuite.
    db.prepare(`INSERT OR IGNORE INTO "${c.announcements}" (id, content) VALUES (1, ?)`)
        .run("Bienvenue sur la Ligue des Nations 2027 ! 🏆 Les annonces de l'organisateur s'afficheront ici.");
}

module.exports = { initSchema };
