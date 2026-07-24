// Requêtes du pari « vainqueur de la compétition » (un pari par joueur et par compétition).
const { get, all, run } = require("./sqlConnect");
const { championBets, teams, matches } = require("./sqlConfig");

// Équipes d'une compétition (pour choisir son champion), triées par nom.
function getCompetitionTeams(competitionId) {
    return all(
        `SELECT id, display_name AS name, slug FROM "${teams}" WHERE competition_id = ? ORDER BY display_name COLLATE NOCASE ASC`,
        [competitionId]
    );
}

// Pari courant du joueur pour la compétition (ou undefined).
function getChampionBet(userId, competitionId) {
    return get(
        `SELECT team_id FROM "${championBets}" WHERE user_id = ? AND competition_id = ?`,
        [userId, competitionId]
    );
}

// Pari d'un joueur RÉSOLU en équipe (nom + slug) + points figés éventuels (ou undefined si pas de pari).
// Sert à l'affichage en lecture seule sur les profils (sien et tiers).
function getUserChampionTeam(userId, competitionId) {
    return get(`
        SELECT t.id, t.display_name AS name, t.slug, cb.points_awarded AS points
        FROM "${championBets}" cb
        JOIN "${teams}" t ON t.id = cb.team_id
        WHERE cb.user_id = ? AND cb.competition_id = ?
    `, [userId, competitionId]);
}

// Crée ou met à jour le pari (un seul par joueur et par compétition).
function upsertChampionBet(userId, competitionId, teamId) {
    run(`
        INSERT INTO "${championBets}" (user_id, competition_id, team_id)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, competition_id) DO UPDATE SET
            team_id = excluded.team_id,
            updated_at = datetime('now')
    `, [userId, competitionId, teamId]);
}

// Verrou du pari = 1er coup d'envoi de la compétition (null si aucun match). Cf. docs/modele-de-donnees.
function getCompetitionLock(competitionId) {
    return get(`SELECT MIN(kickoff_at) AS lock_at FROM "${matches}" WHERE competition_id = ?`, [competitionId]).lock_at;
}

// Garde-fou : l'équipe pariée appartient bien à la compétition.
function teamInCompetition(teamId, competitionId) {
    return !!get(`SELECT 1 FROM "${teams}" WHERE id = ? AND competition_id = ?`, [teamId, competitionId]);
}

// Fige les points de TOUS les paris « vainqueur » d'une compétition : `bonus` si l'équipe pariée est la
// championne, sinon 0. Écrase (re-résolution après correction de la finale). Renvoie le nb de paris touchés.
function resolveChampionPoints(competitionId, championTeamId, bonus) {
    return run(
        `UPDATE "${championBets}" SET points_awarded = CASE WHEN team_id = ? THEN ? ELSE 0 END WHERE competition_id = ?`,
        [championTeamId, bonus, competitionId]
    ).changes;
}

module.exports = {
    getCompetitionTeams, getChampionBet, getUserChampionTeam, upsertChampionBet,
    getCompetitionLock, teamInCompetition, resolveChampionPoints
};
