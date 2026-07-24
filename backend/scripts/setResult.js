// Saisie/validation du résultat d'un match par l'admin. Écrit le score (+ t.a.b. si nul en élim directe),
// FIGE les cotes (à partir de tous les parieurs, verrouillés au coup d'envoi) et FIGE les points de chaque
// prono. Ré-validable : un nouvel appel écrase proprement (recalcul complet). Route réservée à l'admin.
const { sendMessage, sendError } = require("../util/message");
const { computeOdds, outcomeOf, EXACT_BONUS } = require("../util/odds");
const { autoFill } = require("../util/autofill");
const { resolveChampion } = require("../util/champion");
const { notifyMatchResult } = require("../util/notify");
const { logError } = require("../util/log");
const sql = require("../sql/sqlResults");
const { getOutcomeCounts } = require("../sql/sqlPredictions");

async function setResult(request, result) {
    const { matchId, score1, score2, penalty1, penalty2 } = request.body;
    if (!matchId) {
        return sendError(result, "matchId requis");
    }
    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
        return sendError(result, "Score invalide");
    }

    const match = sql.getMatchForResult(matchId);
    if (!match) {
        return sendError(result, "Match introuvable", 404);
    }
    if (!(match.team1_id && match.team2_id)) {
        return sendError(result, "Équipes non déterminées", 400);
    }

    // Tirs au but : dépend du type de manche.
    //  - poule : jamais.
    //  - manche ALLER (aller-retour) : jamais (une manche aller peut être nulle).
    //  - manche RETOUR : requis SEULEMENT si le cumul (aller + retour) est à égalité.
    //  - match unique en élim directe : requis sur un nul.
    // Petit utilitaire : les t.a.b. doivent départager.
    function validatePenalties() {
        if (!Number.isInteger(penalty1) || !Number.isInteger(penalty2) || penalty1 < 0 || penalty2 < 0) {
            return "Tirs au but requis";
        }
        if (penalty1 === penalty2) {
            return "Les tirs au but doivent départager";
        }
        return null;
    }

    const isKnockout = match.stage !== "poule";
    let pen1 = null;
    let pen2 = null;
    if (isKnockout) {
        if (match.first_leg_match_id) {
            // Manche RETOUR : le cumul décide ; t.a.b. uniquement si cumul à égalité.
            const aller = sql.getMatchById(match.first_leg_match_id);
            if (!aller || aller.status !== "finished") {
                return sendError(result, "Valide d'abord le match aller", 400);
            }
            const goalsOf = (m, teamId) => (m.team1_id === teamId ? m.score1 : m.score2);
            const agg1 = score1 + goalsOf(aller, match.team1_id);
            const agg2 = score2 + goalsOf(aller, match.team2_id);
            if (agg1 === agg2) {
                const err = validatePenalties();
                if (err) {
                    return sendError(result, err);
                }
                pen1 = penalty1;
                pen2 = penalty2;
            }
        } else if (sql.isFirstLeg(matchId)) {
            // Manche ALLER : jamais de t.a.b. (les provided sont ignorés).
        } else if (score1 === score2) {
            // Match unique nul : départage aux t.a.b.
            const err = validatePenalties();
            if (err) {
                return sendError(result, err);
            }
            pen1 = penalty1;
            pen2 = penalty2;
        }
    }

    // Gel des cotes : à partir de TOUS les parieurs (les pronos sont figés depuis le coup d'envoi).
    const odds = computeOdds(getOutcomeCounts(matchId, 0));

    // Calcul des points figés de chaque prono : 0 si mauvaise issue, cote si bonne, + bonus si score exact.
    const resultOutcome = outcomeOf(score1, score2);
    const pointsList = sql.getPredictionsForMatch(matchId).map((p) => {
        const correct = outcomeOf(p.predicted_score1, p.predicted_score2) === resultOutcome;
        const exact = p.predicted_score1 === score1 && p.predicted_score2 === score2;
        return { id: p.id, points: correct ? odds[resultOutcome] + (exact ? EXACT_BONUS : 0) : 0 };
    });

    // Première validation ? (le statut passe de non-terminé à terminé). Sert à ne notifier qu'une fois.
    const wasFinished = match.status === "finished";

    // Écriture atomique (résultat + points).
    sql.applyResult(matchId, { score1, score2, penalty1: pen1, penalty2: pen2 }, odds, pointsList);

    // Auto-remplissage du bracket : ce résultat peut qualifier une équipe dans une case aval.
    const filled = autoFill(match.competition_id);

    // Pari « vainqueur » : si la finale est désormais tranchée, on fige les points des paris.
    const champion = resolveChampion(match.competition_id);

    // Push « score » aux opt-in, uniquement à la PREMIÈRE validation (une correction ne renvoie rien).
    // Fire-and-forget : ne retarde pas la réponse de l'admin ; un échec d'envoi est seulement loggé.
    if (!wasFinished) {
        notifyMatchResult(matchId, score1, score2).catch((error) => {
            logError(`Notification de score échouée: ${error.message}`);
        });
    }

    return sendMessage(result, {
        matchId, score1, score2, penalty1: pen1, penalty2: pen2, odds,
        predictionsScored: pointsList.length, filled, champion
    });
}

module.exports = { setResult };
