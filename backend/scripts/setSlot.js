// Outil admin — placement manuel : place une équipe dans une case (slot) d'un match KO. Fixe l'équipe et
// EFFACE la provenance de ce côté → la case devient manuelle (l'auto-fill ne la touchera plus). Synchronise
// la manche jumelle en aller-retour (aller.team1 ↔ retour.team2). Réservé admin.
const { sendMessage, sendError } = require("../util/message");
const sqlResults = require("../sql/sqlResults");
const sqlChampion = require("../sql/sqlChampionBets");
const sqlAdmin = require("../sql/sqlBracketAdmin");

// Case correspondante sur l'autre manche (aller-retour), ou null si match unique.
function otherLeg(match, side) {
    const opposite = side === "team1" ? "team2" : "team1";
    if (match.first_leg_match_id) {
        // `match` est la manche retour → l'autre est l'aller (côté opposé).
        return { matchId: match.first_leg_match_id, side: opposite };
    }
    const retour = sqlAdmin.getRetourOf(match.id);
    return retour ? { matchId: retour.id, side: opposite } : null;
}

async function setSlot(request, result) {
    const { matchId, side, teamId } = request.body;
    if (!matchId || (side !== "team1" && side !== "team2") || !teamId) {
        return sendError(result, "matchId, side (team1/team2) et teamId requis");
    }

    const match = sqlResults.getMatchForResult(matchId);
    if (!match) {
        return sendError(result, "Match introuvable", 404);
    }
    if (match.stage === "poule") {
        return sendError(result, "Placement réservé à la phase à élimination directe", 400);
    }
    if (match.status === "finished") {
        return sendError(result, "Match déjà validé (équipes verrouillées)", 403);
    }
    if (!sqlChampion.teamInCompetition(teamId, match.competition_id)) {
        return sendError(result, "Équipe hors de la compétition", 404);
    }

    const writes = [{ matchId, side, teamId }];
    const other = otherLeg(match, side);
    if (other) {
        writes.push({ matchId: other.matchId, side: other.side, teamId });
    }
    sqlAdmin.applySlotPlacements(writes);

    return sendMessage(result, { ok: true });
}

module.exports = { setSlot };
