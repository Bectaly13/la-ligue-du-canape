// Requêtes SQL liées aux compétitions et aux matchs.
const { all } = require("./sqlConnect");

// Liste des compétitions (pour le sélecteur de compétition), triées par date de début.
function getCompetitions() {
    return all(`SELECT id, name, start_at, end_at FROM competitions ORDER BY start_at`);
}

// Colonnes et jointures communes aux listes de matchs (équipes + groupe + scores).
const MATCH_SELECT = `
    SELECT
        m.id, m.kickoff_at, m.stage, m.status, g.label AS group_label,
        m.score1, m.score2, m.penalty_score1, m.penalty_score2,
        t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
        t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug
    FROM matches m
    LEFT JOIN "groups" g ON m.group_id = g.id
    LEFT JOIN teams t1 ON m.team1_id = t1.id
    LEFT JOIN teams t2 ON m.team2_id = t2.id
`;

// On masque du calendrier les matchs dont les DEUX équipes sont inconnues (placeholders KO non résolus).
const BOTH_TEAMS_UNKNOWN = "NOT (m.team1_id IS NULL AND m.team2_id IS NULL)";

// Matchs à venir (coup d'envoi pas encore passé), triés par coup d'envoi croissant.
function getUpcomingMatches(competitionId, nowParis) {
    return all(`${MATCH_SELECT} WHERE m.competition_id = ? AND m.kickoff_at > ? AND ${BOTH_TEAMS_UNKNOWN} ORDER BY m.kickoff_at ASC`,
        [competitionId, nowParis]);
}

// Matchs joués / en cours (coup d'envoi passé), triés par coup d'envoi décroissant (le plus récent d'abord).
function getPastMatches(competitionId, nowParis) {
    return all(`${MATCH_SELECT} WHERE m.competition_id = ? AND m.kickoff_at <= ? AND ${BOTH_TEAMS_UNKNOWN} ORDER BY m.kickoff_at DESC`,
        [competitionId, nowParis]);
}

module.exports = { getCompetitions, getUpcomingMatches, getPastMatches };
