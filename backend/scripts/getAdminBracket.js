// Outil admin — placement manuel : renvoie les CONFRONTATIONS KO éditables (manche aller non jouée) d'une
// compétition, chaque slot portant le match+côté à modifier et l'état courant (équipe ou libellé de
// provenance), plus la liste des équipes de la compétition (pour le sélecteur). Réservé admin.
const { sendMessage, sendError } = require("../util/message");
const { ROUND_LABELS, buildTies, buildCodes, resolveSlot } = require("../util/bracketShape");
const sqlBracket = require("../sql/sqlBracket");
const sqlChampion = require("../sql/sqlChampionBets");

async function getAdminBracket(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const rows = sqlBracket.getKnockoutMatches(competitionId);
    const ties = buildTies(rows);
    const codeById = buildCodes(ties);

    // Toutes les confrontations KO. `editable` = manche aller pas encore jouée (équipes non verrouillées) ;
    // une confrontation validée est affichée en lecture seule (ses équipes sont figées par le résultat).
    const shaped = ties.map((t) => {
        const slot = (side) => {
            const r = resolveSlot(t.aller, side, codeById);
            return { matchId: t.aller.id, side, team: r.team, label: r.label };
        };
        return {
            code: codeById.get(t.aller.id),
            stage: t.aller.stage,
            label: ROUND_LABELS[t.aller.stage] || t.aller.stage,
            twoLegged: !!t.retour,
            editable: t.aller.status !== "finished",
            kickoff_at: t.aller.kickoff_at,
            kickoff_retour: t.retour ? t.retour.kickoff_at : null,
            slot1: slot("team1"),
            slot2: slot("team2")
        };
    });

    return sendMessage(result, { ties: shaped, teams: sqlChampion.getCompetitionTeams(competitionId) });
}

module.exports = { getAdminBracket };
