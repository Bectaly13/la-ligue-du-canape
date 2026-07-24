// Requêtes SQL des poules (groupes) : groupes, équipes affectées, et matchs de poule.
// Le classement (points, goal-average…) n'est PAS stocké : il est calculé depuis les matchs terminés.
const { all } = require("./sqlConnect");
const { groups, teams, matches } = require("./sqlConfig");

// Poules d'une compétition (id, label), triées par label.
function getGroups(competitionId) {
    return all(`SELECT id, label FROM "${groups}" WHERE competition_id = ? ORDER BY label`, [competitionId]);
}

// Équipes affectées à une poule dans cette compétition.
function getGroupTeams(competitionId) {
    return all(
        `SELECT id, display_name, slug, group_id FROM "${teams}" WHERE competition_id = ? AND group_id IS NOT NULL`,
        [competitionId]
    );
}

// Matchs de poule (avec équipes et scores), triés par coup d'envoi croissant.
function getGroupMatches(competitionId) {
    return all(`
        SELECT
            m.id, m.kickoff_at, m.stage, m.status, m.group_id, g.label AS group_label,
            m.score1, m.score2, m.penalty_score1, m.penalty_score2,
            t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
            t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug
        FROM "${matches}" m
        LEFT JOIN "${groups}" g ON m.group_id = g.id
        LEFT JOIN "${teams}" t1 ON m.team1_id = t1.id
        LEFT JOIN "${teams}" t2 ON m.team2_id = t2.id
        WHERE m.competition_id = ? AND m.stage = 'poule'
        ORDER BY m.kickoff_at ASC
    `, [competitionId]);
}

module.exports = { getGroups, getGroupTeams, getGroupMatches };
