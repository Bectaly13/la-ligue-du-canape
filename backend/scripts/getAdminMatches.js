// Liste des matchs d'une compétition (aux deux équipes connues) pour l'outil admin de saisie des résultats.
// Chaque match porte équipes, groupe/tour, statut, résultat courant et — pour l'aller-retour — son type de
// manche (single/aller/retour) et les buts de l'aller (pour calculer le cumul côté modale). Réservé admin.
const { sendMessage, sendError } = require("../util/message");
const sql = require("../sql/sqlResults");

async function getAdminMatches(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const rows = sql.getCompetitionMatchesForAdmin(competitionId);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const allerIds = new Set(rows.filter((r) => r.first_leg_match_id).map((r) => r.first_leg_match_id));
    const goalsOf = (m, teamId) => (m.team1_id === teamId ? m.score1 : m.score2);

    const matches = rows.map((r) => {
        // Type de manche : retour (a un aller), aller (référencé par un retour), ou single.
        let legType = "single";
        let firstLegGoals1 = null;
        let firstLegGoals2 = null;
        if (r.first_leg_match_id) {
            legType = "retour";
            const aller = byId.get(r.first_leg_match_id);
            if (aller && aller.status === "finished") {
                firstLegGoals1 = goalsOf(aller, r.team1_id);
                firstLegGoals2 = goalsOf(aller, r.team2_id);
            }
        } else if (allerIds.has(r.id)) {
            legType = "aller";
        }

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
            team1: { id: r.team1_id, name: r.team1_name, slug: r.team1_slug },
            team2: { id: r.team2_id, name: r.team2_name, slug: r.team2_slug },
            legType,
            firstLegGoals1,
            firstLegGoals2
        };
    });

    return sendMessage(result, matches);
}

module.exports = { getAdminMatches };
