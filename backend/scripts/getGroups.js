// Renvoie les poules d'une compétition, chacune avec son classement (calculé) et ses matchs.
// Route protégée. Classement : points (3/1/0), départage Diff puis BP puis nom
// (les confrontations directes, départage officiel, ne sont pas gérées en v1).
const { sendMessage, sendError } = require("../util/message");
const { computeStandings } = require("../util/standings");
const sql = require("../sql/sqlGroups");

// Met un match au format « équipes imbriquées » (comme /matches).
function shapeMatch(r) {
    return {
        id: r.id,
        kickoff_at: r.kickoff_at,
        stage: r.stage,
        status: r.status,
        group_label: r.group_label,
        score1: r.score1,
        score2: r.score2,
        penalty_score1: r.penalty_score1,
        penalty_score2: r.penalty_score2,
        team1: r.team1_id ? { id: r.team1_id, name: r.team1_name, slug: r.team1_slug } : null,
        team2: r.team2_id ? { id: r.team2_id, name: r.team2_name, slug: r.team2_slug } : null
    };
}

async function getGroups(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const groups = sql.getGroups(competitionId);
    const teams = sql.getGroupTeams(competitionId);
    const matches = sql.getGroupMatches(competitionId);

    const data = groups.map((g) => {
        const groupTeams = teams.filter((t) => t.group_id === g.id);
        const groupMatches = matches.filter((m) => m.group_id === g.id);
        return {
            id: g.id,
            label: g.label,
            standings: computeStandings(groupTeams, groupMatches),
            matches: groupMatches.map(shapeMatch)
        };
    });

    return sendMessage(result, data);
}

module.exports = { getGroups };
