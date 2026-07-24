// Renvoie le bracket (phase à élimination directe) d'une compétition, organisé par tour. Chaque case est
// une CONFRONTATION (tie) : match unique OU aller-retour (2 manches). Pour chaque confrontation : les deux
// slots résolus (équipe connue ou libellé de provenance), les scores par manche (normalisés côté slot1/slot2),
// le cumul, le vainqueur, et d'éventuels tirs au but décisifs. Route protégée.
const { sendMessage, sendError } = require("../util/message");
const { ROUND_LABELS, buildTies, buildCodes, resolveSlot } = require("../util/bracketShape");
const sql = require("../sql/sqlBracket");

const ROUND_ORDER = ["seizieme", "huitieme", "quart", "demie", "finale"];

// Scores d'une manche normalisés côté slot1/slot2 (le retour inverse domicile/extérieur).
function legScores(leg, aller) {
    const isAller = leg.id === aller.id;
    return {
        s1: isAller ? leg.score1 : leg.score2,
        s2: isAller ? leg.score2 : leg.score1,
        p1: isAller ? leg.penalty_score1 : leg.penalty_score2,
        p2: isAller ? leg.penalty_score2 : leg.penalty_score1
    };
}

// Façonne une confrontation : slots, manches, cumul, vainqueur, t.a.b. décisifs.
function shapeTie(tie, codeById) {
    const { aller, retour } = tie;
    const legRows = retour ? [aller, retour] : [aller];
    const legs = legRows.map((leg) => {
        const s = legScores(leg, aller);
        return { status: leg.status, kickoff_at: leg.kickoff_at, score1: s.s1, score2: s.s2 };
    });

    // Cumul (sur les manches terminées), et vainqueur si la confrontation est tranchée (toutes manches jouées).
    const allPlayed = legRows.every((l) => l.status === "finished" && l.score1 !== null && l.score2 !== null);
    let agg1 = null;
    let agg2 = null;
    for (const leg of legRows) {
        if (leg.status === "finished" && leg.score1 !== null) {
            const s = legScores(leg, aller);
            agg1 = (agg1 ?? 0) + s.s1;
            agg2 = (agg2 ?? 0) + s.s2;
        }
    }

    let winner = 0;
    let pen1 = null;
    let pen2 = null;
    if (allPlayed) {
        if (agg1 > agg2) {
            winner = 1;
        } else if (agg1 < agg2) {
            winner = 2;
        } else {
            // Cumul à égalité → t.a.b. de la manche décisive (retour, ou l'unique match).
            const deciding = retour || aller;
            const s = legScores(deciding, aller);
            if (s.p1 !== null && s.p2 !== null && s.p1 !== s.p2) {
                pen1 = s.p1;
                pen2 = s.p2;
                winner = s.p1 > s.p2 ? 1 : 2;
            }
        }
    }

    return {
        id: (retour || aller).id, // manche décisive (pour le prono d'un match unique)
        code: codeById.get(aller.id),
        stage: aller.stage,
        status: aller.status, // statut de la manche aller (canPredict d'un match unique)
        kickoff_at: aller.kickoff_at,
        twoLegged: !!retour,
        slot1: resolveSlot(aller, "team1", codeById),
        slot2: resolveSlot(aller, "team2", codeById),
        legs,
        agg1,
        agg2,
        pen1,
        pen2,
        winner
    };
}

async function getBracket(request, result) {
    const { competitionId } = request.body;
    if (!competitionId) {
        return sendError(result, "competitionId requis");
    }

    const rows = sql.getKnockoutMatches(competitionId);
    const ties = buildTies(rows);
    const codeById = buildCodes(ties);

    const rounds = ROUND_ORDER
        .map((stage) => {
            const stageTies = ties.filter((t) => t.aller.stage === stage);
            return {
                stage,
                label: ROUND_LABELS[stage],
                // « Entrée tirée au sort » : les participants du tour ne découlent d'aucune provenance
                // (ni classement de poule, ni match amont) → appariement décidé par tirage. Le front s'en
                // sert pour NE PAS tracer de connecteurs sur cette transition et pour masquer la vue cercle.
                drawnEntry: stageTies.length > 0 && stageTies.every((t) => !t.aller.team1_src_type && !t.aller.team2_src_type),
                matches: stageTies.map((t) => shapeTie(t, codeById))
            };
        })
        .filter((round) => round.matches.length > 0);

    const thirdTie = ties.find((t) => t.aller.stage === "petite_finale");
    const thirdPlace = thirdTie ? shapeTie(thirdTie, codeById) : null;

    return sendMessage(result, { rounds, thirdPlace });
}

module.exports = { getBracket };
