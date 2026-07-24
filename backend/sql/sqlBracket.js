// Requête SQL du bracket : les matchs à élimination directe (stage != 'poule') d'une compétition,
// avec équipes (si connues), scores, et provenance (vainqueur/perdant d'un match, ou rang d'un groupe).
const { all } = require("./sqlConnect");
const { matches, teams, groups } = require("./sqlConfig");

function getKnockoutMatches(competitionId) {
    return all(`
        SELECT
            m.id, m.stage, m.status, m.kickoff_at, m.first_leg_match_id,
            m.score1, m.score2, m.penalty_score1, m.penalty_score2,
            t1.id AS team1_id, t1.display_name AS team1_name, t1.slug AS team1_slug,
            t2.id AS team2_id, t2.display_name AS team2_name, t2.slug AS team2_slug,
            m.team1_src_type, m.team1_src_match_id, m.team1_src_rank, g1.label AS team1_src_group,
            m.team2_src_type, m.team2_src_match_id, m.team2_src_rank, g2.label AS team2_src_group
        FROM "${matches}" m
        LEFT JOIN "${teams}" t1 ON m.team1_id = t1.id
        LEFT JOIN "${teams}" t2 ON m.team2_id = t2.id
        LEFT JOIN "${groups}" g1 ON m.team1_src_group_id = g1.id
        LEFT JOIN "${groups}" g2 ON m.team2_src_group_id = g2.id
        WHERE m.competition_id = ? AND m.stage != 'poule'
        ORDER BY m.id ASC
    `, [competitionId]);
}

module.exports = { getKnockoutMatches };
