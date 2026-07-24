// Répartit les matchs d'une compétition (aux deux équipes connues) en 3 sections, du point de vue du joueur :
//  - toPredict : pas encore de prono (et match non validé). predictable = coup d'envoi pas passé.
//  - predicted : prono posé, match non validé. editable = coup d'envoi pas passé ; cote de l'issue pariée.
//  - archived  : match validé (terminé). Avec le prono (et points) s'il y en a un, sinon rien (tirets côté front).
// Points d'un archivé : 0 si mauvaise issue, cote si bonne, cote + bonus si score exact.
// Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { nowInParis } = require("../util/time");
const { shapeMatch, outcomeOdds, archivedEntry, isArchived } = require("../util/predictionShape");
const sql = require("../sql/sqlPredictions");

async function getMyPredictions(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const rows = sql.getCompetitionMatchesForUser(request.user.id, competitionId);
    const now = nowInParis();

    const toPredict = [];
    const predicted = [];
    const archived = [];

    for (const r of rows) {
        const match = shapeMatch(r);
        const hasPred = r.my_score1 !== null && r.my_score1 !== undefined;

        if (isArchived(r)) {
            // Archivé : avec ou sans prono.
            archived.push(archivedEntry(sql, r));
        } else if (hasPred) {
            // Prono posé, pas encore validé.
            predicted.push({
                match, predicted_score1: r.my_score1, predicted_score2: r.my_score2,
                editable: now < r.kickoff_at, odds: outcomeOdds(sql, r.id, r.my_score1, r.my_score2)
            });
        } else if (now < r.kickoff_at) {
            // Pas encore de prono ET coup d'envoi pas passé → pronosticable. Sinon on n'affiche pas
            // (match manqué non validé : il apparaîtra en « Archivés » avec « Pas de prono » une fois validé).
            toPredict.push({ match });
        }
    }

    // Archivés : le plus récent d'abord (les autres restent par coup d'envoi croissant).
    archived.reverse();

    return sendMessage(result, { toPredict, predicted, archived });
}

module.exports = { getMyPredictions };
