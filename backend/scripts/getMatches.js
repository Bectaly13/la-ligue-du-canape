// Renvoie les matchs d'une compétition, selon `when` :
//  - "upcoming" (défaut) : coup d'envoi pas encore passé, triés croissant ;
//  - "past" : coup d'envoi passé (joués / en cours), triés décroissant.
// Chaque match porte équipes, groupe, statut et scores. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const sql = require("../sql/sqlMatches");

// « Maintenant » en heure de Paris, au même format que les kickoff_at stockés.
function nowInParis() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).replace(" ", "T");
}

// Mise en forme : équipes imbriquées (null si pas encore connues, ex. élimination directe).
function shape(rows) {
    return rows.map((r) => ({
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
    }));
}

async function getMatches(request, result) {
    const { competitionId, when } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const now = nowInParis();
    const rows = when === "past"
        ? sql.getPastMatches(competitionId, now)
        : sql.getUpcomingMatches(competitionId, now);

    return sendMessage(result, shape(rows));
}

module.exports = { getMatches };
